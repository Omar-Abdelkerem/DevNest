import statusCodes from "http-status-codes";
import prisma from "../config/prisma.client.js";
import invalidateOwnerPublicCache from "../utils/invalidateOwnerPublicCache.js";
import getOrSetCache, { CACHE_KEYS, deleteCache } from "../utils/cache.util.js";
import {
  badRequestError,
  notFoundError,
  unauthorizedError,
} from "../errors/index.js";
import {
  addProjectSchema,
  updateProjectSchema,
  projectIdSchema,
  reorderProjectsSchema,
} from "../schemas/project.schema.js";
import { setCacheHeaders } from "../middleware/cache-headers.middleware.js";

const MAX_PAGE_LIMIT = 50;
const DEFAULT_PAGE_LIMIT = 24;

function parsePagination(query = {}) {
  const rawPage = parseInt(query.page, 10);
  const rawLimit = parseInt(query.limit, 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_PAGE_LIMIT)
      : DEFAULT_PAGE_LIMIT;
  return { page, limit, skip: (page - 1) * limit };
}

const ownerSelect = {
  id: true,
  username: true,
  avatarUrl: true,
  isPublic: true,
  headline: true,
  role: true,
  company: true,
  availableForWork: true,
  phone: true,
  whatsapp: true,
  contactEmail: true,
  resumeUrl: true,
  links: true,
};

export const projectInclude = {
  user: { select: ownerSelect },
  projectLanguages: { include: { language: true } },
  _count: { select: { stars: true } },
};

const requesterId = (req) => req.user?.userId || req.user?.id || null;

const overlayHasStarred = async (projects, userId) => {
  if (!Array.isArray(projects)) return projects;
  if (!userId || projects.length === 0) {
    return projects.map((project) => ({ ...project, hasStarred: false }));
  }

  const ids = projects.map((project) => project.id).filter(Boolean);
  const rows = await prisma.star.findMany({
    where: { userId, projectId: { in: ids } },
    select: { projectId: true },
  });
  const starredIds = new Set(rows.map((row) => row.projectId));
  return projects.map((project) => ({
    ...project,
    hasStarred: starredIds.has(project.id),
  }));
};

export const serializeProject = (project) => {
  if (!project) return project;
  const rows = project.projectLanguages || [];
  const languageNames = rows.map((row) => row.language?.name).filter(Boolean);
  const { projectLanguages: _pl, ...rest } = project;
  return {
    ...rest,
    languages: languageNames,
    language: languageNames[0] || null,
    user: project.user || null,
    owner: project.user || null,
    stars: project._count?.stars ?? 0,
  };
};

/**
 * Batched language sync — eliminates the N+1 upsert/create loop.
 * Executes at most 4 constant-time queries regardless of how many languages are supplied.
 */
export const syncProjectLanguages = async (tx, projectId, languages) => {
  if (!Array.isArray(languages)) return;

  const uniqueNames = [
    ...new Set(languages.map((n) => String(n || "").trim()).filter(Boolean)),
  ];

  await tx.projectLanguage.deleteMany({ where: { projectId } });
  if (uniqueNames.length === 0) return;

  await tx.language.createMany({
    data: uniqueNames.map((name) => ({ name })),
    skipDuplicates: true,
  });

  const allLanguages = await tx.language.findMany({
    where: { name: { in: uniqueNames } },
    select: { id: true },
  });

  if (allLanguages.length > 0) {
    await tx.projectLanguage.createMany({
      data: allLanguages.map((lang) => ({
        projectId,
        languageId: lang.id,
      })),
      skipDuplicates: true,
    });
  }
};

export const uploadProjectPhoto = async (req, res) => {
  if (!req.file?.path) {
    throw new badRequestError("No image file was uploaded.");
  }
  setCacheHeaders(res, { isPublic: false, isAuthenticated: true });
  res.status(statusCodes.OK).json({ imageUrl: req.file.path });
};

export const addProject = async (req, res) => {
  const validatedData = addProjectSchema.parse(req.body);
  const { languages, status: _status, ...projectData } = validatedData;
  const userId = requesterId(req);

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        title: projectData.title,
        description: projectData.description ?? null,
        projectimgUrl: projectData.projectimgUrl ?? null,
        links: projectData.links ?? [],
        readme: projectData.readme ?? null,
        isPublic: projectData.isPublic ?? true,
        isPinned: projectData.isPinned ?? false,
        sortOrder: projectData.sortOrder ?? 0,
        userId,
      },
    });

    await syncProjectLanguages(tx, created.id, languages);

    return tx.project.findUnique({
      where: { id: created.id },
      include: projectInclude,
    });
  });

  await invalidateOwnerPublicCache("projects", project?.user?.username);
  res.status(statusCodes.CREATED).json(serializeProject(project));
};

export const updateProjectById = async (req, res) => {
  const validatedData = updateProjectSchema.parse(req.body);
  const { languages, ...projectData } = validatedData;

  const project = await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: req.resource.id },
      data: projectData,
    });
    if (languages !== undefined) {
      await syncProjectLanguages(tx, req.resource.id, languages);
    }
    return tx.project.findUnique({
      where: { id: req.resource.id },
      include: projectInclude,
    });
  });

  await Promise.all([
    invalidateOwnerPublicCache("projects", project?.user?.username),
    deleteCache(CACHE_KEYS.projectById(req.resource.id)),
  ]);
  res.status(statusCodes.OK).json(serializeProject(project));
};

export const reorderProjects = async (req, res) => {
  const { projectIds } = reorderProjectsSchema.parse(req.body);
  const userId = requesterId(req);

  const ownedProjects = await prisma.project.findMany({
    where: { userId, id: { in: projectIds } },
    select: { id: true, user: { select: { username: true } } },
  });

  const ownedIdSet = new Set(ownedProjects.map((p) => p.id));
  const validOrderedIds = projectIds.filter((id) => ownedIdSet.has(id));

  if (validOrderedIds.length > 0) {
    await prisma.$transaction(
      validOrderedIds.map((id, index) =>
        prisma.project.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  const ownerUsername = ownedProjects[0]?.user?.username;
  if (ownerUsername) {
    await invalidateOwnerPublicCache("projects", ownerUsername);
  }

  setCacheHeaders(res, { isPublic: false, isAuthenticated: true });
  res.status(statusCodes.OK).json({ reordered: validOrderedIds.length });
};

export const deleteProjectById = async (req, res) => {
  const deleted = await prisma.project.delete({
    where: { id: req.resource.id },
    select: { id: true, user: { select: { username: true } } },
  });

  await Promise.all([
    invalidateOwnerPublicCache("projects", deleted?.user?.username),
    deleteCache(CACHE_KEYS.projectById(req.resource.id)),
  ]);
  res.status(statusCodes.NO_CONTENT).send();
};

export const getProjectById = async (req, res) => {
  const { id } = projectIdSchema.parse(req.params);
  const userId = requesterId(req);

  const cached = await getOrSetCache(
    CACHE_KEYS.projectById(id),
    3600,
    async () => {
      const row = await prisma.project.findUnique({
        where: { id },
        include: projectInclude,
      });
      if (!row) return null;
      return serializeProject(row);
    },
  );

  if (!cached) {
    throw new notFoundError(`Project with id ${id} not found`);
  }

  const isOwner = userId === cached.userId;
  const isVisible = Boolean(cached.isPublic && cached.owner?.isPublic);
  if (!isOwner && !isVisible) {
    throw new unauthorizedError("This project is private.");
  }

  setCacheHeaders(res, {
    isPublic: isVisible,
    isAuthenticated: Boolean(userId),
    maxAge: 60,
  });

  if (userId) {
    const starRow = await prisma.star.findUnique({
      where: { userId_projectId: { userId, projectId: id } },
      select: { projectId: true },
    });
    return res
      .status(statusCodes.OK)
      .json({ ...cached, hasStarred: Boolean(starRow) });
  }

  res.status(statusCodes.OK).json({ ...cached, hasStarred: false });
};

export const getAllProjectsByUsername = async (req, res) => {
  const { username } = req.params;
  const { page, limit, skip } = parsePagination(req.query);

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, isPublic: true },
  });

  if (!user) {
    throw new notFoundError(`User with username ${username} not found`);
  }

  const userId = requesterId(req);
  const isOwner = user.id === userId;
  if (!user.isPublic && !isOwner) {
    throw new unauthorizedError("This profile is private.");
  }

  const type = isOwner ? "owner" : "public";
  const isDefaultPage = page === 1 && limit === DEFAULT_PAGE_LIMIT;

  const fetchProjects = async () => {
    const where = { userId: user.id };
    if (!isOwner) {
      where.isPublic = true;
    }
    const rows = await prisma.project.findMany({
      where,
      include: projectInclude,
      orderBy: [
        { isPinned: "desc" },
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
      skip,
      take: limit,
    });
    return rows.map(serializeProject);
  };

  const projects = isDefaultPage
    ? await getOrSetCache(
        CACHE_KEYS.userProjects(username, type),
        3600,
        fetchProjects,
      )
    : await fetchProjects();

  setCacheHeaders(res, {
    isPublic: user.isPublic && !isOwner,
    isAuthenticated: Boolean(userId),
    maxAge: 60,
  });
  res.setHeader("X-Page", String(page));
  res.setHeader("X-Limit", String(limit));

  res.status(statusCodes.OK).json(await overlayHasStarred(projects, userId));
};

export const getAllProjects = async (req, res) => {
  const { search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const userId = requesterId(req);

  const whereClause = {
    isPublic: true,
    user: { isPublic: true },
  };

  if (search && String(search).trim() !== "") {
    const searchTerm = String(search).trim().slice(0, 100);
    whereClause.OR = [
      { title: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
      { readme: { contains: searchTerm, mode: "insensitive" } },
    ];

    const rows = await prisma.project.findMany({
      where: whereClause,
      include: projectInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    setCacheHeaders(res, {
      isPublic: true,
      isAuthenticated: Boolean(userId),
      maxAge: 30,
    });
    return res
      .status(statusCodes.OK)
      .json(await overlayHasStarred(rows.map(serializeProject), userId));
  }

  const isDefaultPage = page === 1 && limit === DEFAULT_PAGE_LIMIT;
  const fetchProjects = async () => {
    const rows = await prisma.project.findMany({
      where: whereClause,
      include: projectInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });
    return rows.map(serializeProject);
  };

  const projects = isDefaultPage
    ? await getOrSetCache(CACHE_KEYS.projectsAll, 3600, fetchProjects)
    : await fetchProjects();

  setCacheHeaders(res, {
    isPublic: true,
    isAuthenticated: Boolean(userId),
    maxAge: 60,
  });
  res.setHeader("X-Page", String(page));
  res.setHeader("X-Limit", String(limit));

  res.status(statusCodes.OK).json(await overlayHasStarred(projects, userId));
};

export const getFeaturedProjects = async (req, res) => {
  const projects = await getOrSetCache(
    CACHE_KEYS.projectsFeatured,
    300,
    async () => {
      const rows = await prisma.project.findMany({
        where: {
          isPublic: true,
          user: { isPublic: true },
        },
        include: projectInclude,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: 3,
      });
      return rows.map(serializeProject);
    },
  );

  setCacheHeaders(res, {
    isPublic: true,
    isAuthenticated: Boolean(req.cookies?.sessionId),
    maxAge: 120,
  });
  res.status(statusCodes.OK).json(projects);
};

export const getStarredProjects = async (req, res) => {
  const userId = requesterId(req);
  const { page, limit, skip } = parsePagination(req.query);

  const stars = await prisma.star.findMany({
    where: {
      userId,
      project: {
        OR: [
          { userId },
          { isPublic: true, user: { isPublic: true } },
        ],
      },
    },
    include: {
      project: {
        include: projectInclude,
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });

  const projects = stars.map((star) => ({
    ...serializeProject(star.project),
    hasStarred: true,
  }));

  setCacheHeaders(res, { isPublic: false, isAuthenticated: true });
  res.status(statusCodes.OK).json(projects);
};
