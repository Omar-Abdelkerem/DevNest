import prisma from "../config/prisma.client.js";
import statusCodes from "http-status-codes";
import invalidateOwnerPublicCache from "../utils/invalidateOwnerPublicCache.js";
import getOrSetCache from "../utils/cache.util.js";
import { notFoundError, unauthorizedError } from "../errors/index.js";
import {
  addProjectSchema,
  updateProjectSchema,
  projectIdSchema,
} from "../schemas/project.schema.js";

const ownerSelect = {
  id: true,
  username: true,
  avatarUrl: true,
  isPublic: true,
};

const projectInclude = {
  user: { select: ownerSelect },
  projectLanguages: { include: { language: true } },
  _count: { select: { stars: true } },
};

const requesterId = (req) => req.user?.userId || req.user?.id || null;

const serializeProject = (project) => {
  if (!project) return project;
  const rows = project.projectLanguages || [];
  const languageNames = rows.map((row) => row.language?.name).filter(Boolean);
  const { projectLanguages, stars, ...rest } = project; // Extract stars array
  return {
    ...rest,
    languages: languageNames,
    language: languageNames[0] || null,
    user: project.user || null,
    owner: project.user || null,
    stars: project._count?.stars ?? 0,
    hasStarred: Array.isArray(stars) && stars.length > 0, // Defines the UI state
  };
};

const syncProjectLanguages = async (tx, projectId, languages) => {
  if (!Array.isArray(languages)) return;
  await tx.projectLanguage.deleteMany({ where: { projectId } });
  for (const rawName of languages) {
    const name = String(rawName || "").trim();
    if (!name) continue;
    const language = await tx.language.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    await tx.projectLanguage.create({
      data: { projectId, languageId: language.id },
    });
  }
};

export const addProject = async (req, res) => {
  const validatedData = addProjectSchema.parse(req.body);
  const { languages, status: _status, ...projectData } = validatedData;
  const userId = requesterId(req);

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        title: projectData.title,
        description: projectData.description,
        projectimgUrl: projectData.projectimgUrl,
        links: projectData.links,
        readme: projectData.readme,
        isPublic: projectData.isPublic ?? true,
        userId,
      },
    });

    await syncProjectLanguages(tx, created.id, languages);

    return tx.project.findUnique({
      where: { id: created.id },
      include: projectInclude,
    });
  });

  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  await invalidateOwnerPublicCache("projects", owner.username);
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

  const owner = await prisma.user.findUnique({
    where: { id: req.resource.userId },
    select: { username: true },
  });
  await invalidateOwnerPublicCache("projects", owner.username);
  res.status(statusCodes.OK).json(serializeProject(project));
};

export const deleteProjectById = async (req, res) => {
  await prisma.project.delete({
    where: { id: req.resource.id },
  });
  const owner = await prisma.user.findUnique({
    where: { id: req.resource.userId },
    select: { username: true },
  });
  await invalidateOwnerPublicCache("projects", owner.username);
  res.status(statusCodes.NO_CONTENT).send();
};

export const getProjectById = async (req, res) => {
  const { id } = projectIdSchema.parse(req.params);
  const userId = requesterId(req); // Gets the current user

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      ...projectInclude,
      _count: { select: { stars: true } }, // Gets the total count
      stars: userId ? { where: { userId } } : false, // Checks if THIS user starred it
    },
  });

  if (!project) {
    throw new notFoundError(`Project with id ${id} not found`);
  }

  const isOwner = requesterId(req) === project.userId;
  // Owners always see their own project, public or private.
  if (isOwner) {
    return res.status(statusCodes.OK).json(serializeProject(project));
  }

  const isVisible = project.isPublic && project.user?.isPublic;
  if (!isVisible) {
    throw new unauthorizedError("This project is private.");
  }

  res.status(statusCodes.OK).json(serializeProject(project));
};

export const getAllProjectsByUsername = async (req, res) => {
  const { username } = req.params;
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    throw new notFoundError(`User with username ${username} not found`);
  }
  const isOwner = user.id === requesterId(req);
  let type;
  if (!user.isPublic && !isOwner) {
    throw new unauthorizedError("This profile is private.");
  } else if (!user.isPublic && isOwner) {
    type = "owner";
  } else if (user.isPublic && !isOwner) {
    type = "public";
  } else {
    type = "owner";
  }
  const projects = await getOrSetCache(
    `projects:username:${username}:${type}:v2`,
    3600,
    async () => {
      const where = { userId: user.id };
      if (!isOwner) {
        where.isPublic = true;
      }
      const rows = await prisma.project.findMany({
        where,
        include: projectInclude,
      });
      return rows.map(serializeProject);
    },
  );

  res.status(statusCodes.OK).json(projects);
};

export const getAllProjects = async (req, res) => {
  const { search } = req.query;

  // Base query: only public projects from public users
  const whereClause = {
    isPublic: true,
    user: { isPublic: true },
  };

  // If the user typed something in the search bar, add the filters
  if (search && search.trim() !== "") {
    const searchTerm = search.trim();
    whereClause.OR = [
      { title: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
      { readme: { contains: searchTerm, mode: "insensitive" } },
    ];

    // Bypass cache for specific searches to ensure real-time results
    const rows = await prisma.project.findMany({
      where: whereClause,
      include: projectInclude,
      orderBy: { createdAt: "desc" },
    });
    return res.status(statusCodes.OK).json(rows.map(serializeProject));
  }

  // If no search query, use the standard cached Explore page
  const projects = await getOrSetCache(`projects:all:v2`, 3600, async () => {
    const rows = await prisma.project.findMany({
      where: whereClause,
      include: projectInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(serializeProject);
  });

  res.status(statusCodes.OK).json(projects);
};

export const getStarredProjects = async (req, res) => {
  const userId = requesterId(req);
  const stars = await prisma.star.findMany({
    where: { userId },
    include: {
      project: {
        include: {
          ...projectInclude,
          _count: { select: { stars: true } },
          stars: { where: { userId } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const projects = stars.map((star) => serializeProject(star.project));
  res.status(statusCodes.OK).json(projects);
};
