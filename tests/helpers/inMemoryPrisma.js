import crypto from "crypto";
import { Prisma } from "@prisma/client";

function pickFields(obj, select) {
  if (!obj) return null;
  if (!select) return { ...obj };
  const result = {};
  for (const [k, v] of Object.entries(select)) {
    if (v === true) {
      result[k] = obj[k];
    } else if (v && typeof v === "object") {
      result[k] = obj[k];
    }
  }
  return result;
}

export function createInMemoryPrisma() {
  const store = {
    users: new Map(),
    projects: new Map(),
    skills: new Map(),
    languages: new Map(),
    projectLanguages: [],
    comments: new Map(),
    stars: [],
    feedback: new Map(),
  };

  const reset = () => {
    store.users.clear();
    store.projects.clear();
    store.skills.clear();
    store.languages.clear();
    store.projectLanguages = [];
    store.comments.clear();
    store.stars = [];
    store.feedback.clear();
  };

  const hydrateUser = (u, { select } = {}) => {
    if (!u) return null;
    const base = {
      ...u,
      _count: { followers: 0, following: 0 },
    };
    return select ? pickFields(base, select) : base;
  };

  const hydrateProject = (p, { include, select } = {}) => {
    if (!p) return null;
    const owner = store.users.get(p.userId) || null;
    const pls = store.projectLanguages
      .filter((pl) => pl.projectId === p.id)
      .map((pl) => ({
        ...pl,
        language: [...store.languages.values()].find((l) => l.id === pl.languageId) || null,
      }));
    const starCount = store.stars.filter((s) => s.projectId === p.id).length;

    const full = {
      ...p,
      user: owner
        ? include?.user?.select
          ? pickFields(owner, include.user.select)
          : select?.user?.select
            ? pickFields(owner, select.user.select)
            : { ...owner }
        : null,
      projectLanguages: pls,
      _count: { stars: starCount },
    };
    return select ? pickFields(full, select) : full;
  };

  const client = {
    reset,
    _store: store,
    $transaction: async (fn) => fn(client),

    user: {
      create: async ({ data, select }) => {
        for (const existing of store.users.values()) {
          if (existing.email === data.email) {
            throw new Prisma.PrismaClientKnownRequestError("Unique constraint", {
              code: "P2002",
              clientVersion: "7.10.1",
              meta: { target: ["email"] },
            });
          }
          if (existing.username === data.username) {
            throw new Prisma.PrismaClientKnownRequestError("Unique constraint", {
              code: "P2002",
              clientVersion: "7.10.1",
              meta: { target: ["username"] },
            });
          }
        }
        const now = new Date();
        const user = {
          id: crypto.randomUUID(),
          username: data.username,
          email: data.email,
          passwordHash: data.passwordHash,
          bio: data.bio ?? null,
          about: data.about ?? null,
          location: data.location ?? null,
          age: data.age ?? null,
          role: data.role ?? null,
          company: data.company ?? null,
          availableForWork: data.availableForWork ?? false,
          avatarUrl: data.avatarUrl ?? null,
          links: data.links ?? null,
          isPublic: data.isPublic ?? true,
          createdAt: now,
          updatedAt: now,
        };
        store.users.set(user.id, user);
        return hydrateUser(user, { select });
      },
      findUnique: async ({ where, select }) => {
        let found = null;
        for (const u of store.users.values()) {
          if (where.id && u.id === where.id) found = u;
          if (where.email && u.email === where.email) found = u;
          if (where.username && u.username === where.username) found = u;
        }
        return hydrateUser(found, { select });
      },
      findFirst: async ({ where, select }) => {
        let found = null;
        for (const u of store.users.values()) {
          if (where.email?.equals) {
            const match =
              where.email.mode === "insensitive"
                ? u.email.toLowerCase() === where.email.equals.toLowerCase()
                : u.email === where.email.equals;
            if (match) {
              found = u;
              break;
            }
          } else if (where.email && u.email === where.email) {
            found = u;
            break;
          }
        }
        return hydrateUser(found, { select });
      },
      update: async ({ where, data, select }) => {
        const user = store.users.get(where.id);
        if (!user) {
          throw new Prisma.PrismaClientKnownRequestError("Not found", {
            code: "P2025",
            clientVersion: "7.10.1",
          });
        }
        const { skills, ...scalar } = data;
        Object.assign(user, scalar, { updatedAt: new Date() });
        if (skills?.deleteMany) {
          for (const [id, sk] of store.skills.entries()) {
            if (sk.userId === user.id) store.skills.delete(id);
          }
        }
        if (Array.isArray(skills?.create)) {
          for (const sk of skills.create) {
            const id = crypto.randomUUID();
            store.skills.set(id, { id, name: sk.name, level: sk.level, userId: user.id });
          }
        }
        return hydrateUser(user, { select });
      },
    },

    project: {
      create: async ({ data, include }) => {
        const now = new Date();
        const proj = {
          id: crypto.randomUUID(),
          title: data.title,
          description: data.description ?? null,
          projectimgUrl: data.projectimgUrl ?? null,
          links: data.links ?? [],
          readme: data.readme ?? null,
          isPublic: data.isPublic ?? true,
          userId: data.userId,
          createdAt: now,
          updatedAt: now,
        };
        store.projects.set(proj.id, proj);
        return hydrateProject(proj, { include });
      },
      findUnique: async ({ where, include, select }) => {
        const proj = store.projects.get(where.id);
        return hydrateProject(proj, { include, select });
      },
      findMany: async ({ where = {}, include, orderBy, skip = 0, take } = {}) => {
        let list = [...store.projects.values()].filter((p) => {
          const owner = store.users.get(p.userId);
          if (where.userId && p.userId !== where.userId) return false;
          if (where.isPublic !== undefined && p.isPublic !== where.isPublic) return false;
          if (where.user?.isPublic !== undefined && owner?.isPublic !== where.user.isPublic) return false;
          if (Array.isArray(where.OR)) {
            const matched = where.OR.some((clause) => {
              const [[field, cond]] = Object.entries(clause);
              const val = String(p[field] || "").toLowerCase();
              return val.includes(String(cond.contains || "").toLowerCase());
            });
            if (!matched) return false;
          }
          return true;
        });

        if (orderBy?.createdAt === "desc") {
          list.sort((a, b) => b.createdAt - a.createdAt);
        }
        if (skip) list = list.slice(skip);
        if (take) list = list.slice(0, take);
        return list.map((p) => hydrateProject(p, { include }));
      },
      update: async ({ where, data, include }) => {
        const proj = store.projects.get(where.id);
        if (!proj) {
          throw new Prisma.PrismaClientKnownRequestError("Not found", {
            code: "P2025",
            clientVersion: "7.10.1",
          });
        }
        Object.assign(proj, data, { updatedAt: new Date() });
        return hydrateProject(proj, { include });
      },
      delete: async ({ where, select }) => {
        const proj = store.projects.get(where.id);
        if (!proj) {
          throw new Prisma.PrismaClientKnownRequestError("Not found", {
            code: "P2025",
            clientVersion: "7.10.1",
          });
        }
        const hydrated = hydrateProject(proj, { select });
        store.projects.delete(where.id);
        store.projectLanguages = store.projectLanguages.filter((pl) => pl.projectId !== where.id);
        store.stars = store.stars.filter((s) => s.projectId !== where.id);
        for (const [cid, c] of store.comments.entries()) {
          if (c.projectId === where.id) store.comments.delete(cid);
        }
        return hydrated;
      },
    },

    language: {
      createMany: async ({ data }) => {
        let count = 0;
        for (const item of data) {
          if (!store.languages.has(item.name)) {
            store.languages.set(item.name, { id: crypto.randomUUID(), name: item.name });
            count++;
          }
        }
        return { count };
      },
      findMany: async ({ where }) => {
        const names = new Set(where?.name?.in || []);
        return [...store.languages.values()].filter((l) => names.has(l.name));
      },
    },

    projectLanguage: {
      deleteMany: async ({ where }) => {
        const before = store.projectLanguages.length;
        store.projectLanguages = store.projectLanguages.filter(
          (pl) => pl.projectId !== where.projectId,
        );
        return { count: before - store.projectLanguages.length };
      },
      createMany: async ({ data }) => {
        for (const item of data) {
          const exists = store.projectLanguages.some(
            (pl) => pl.projectId === item.projectId && pl.languageId === item.languageId,
          );
          if (!exists) store.projectLanguages.push(item);
        }
        return { count: data.length };
      },
    },

    skill: {
      create: async ({ data }) => {
        const skill = { id: crypto.randomUUID(), ...data };
        store.skills.set(skill.id, skill);
        return skill;
      },
      findUnique: async ({ where, include }) => {
        const skill = store.skills.get(where.id);
        if (!skill) return null;
        if (include?.user) {
          const owner = store.users.get(skill.userId);
          return { ...skill, user: owner ? pickFields(owner, include.user.select) : null };
        }
        return { ...skill };
      },
      findMany: async ({ where, take }) => {
        let list = [...store.skills.values()].filter((s) => s.userId === where.userId);
        if (take) list = list.slice(0, take);
        return list;
      },
      update: async ({ where, data }) => {
        const skill = store.skills.get(where.id);
        Object.assign(skill, data);
        return { ...skill };
      },
      delete: async ({ where }) => {
        const skill = store.skills.get(where.id);
        store.skills.delete(where.id);
        return skill;
      },
    },

    comment: {
      create: async ({ data, include }) => {
        const now = new Date();
        const comment = {
          id: crypto.randomUUID(),
          content: data.content,
          projectId: data.projectId,
          userId: data.userId,
          createdAt: now,
          updatedAt: now,
        };
        store.comments.set(comment.id, comment);
        if (include?.user) {
          const author = store.users.get(comment.userId);
          return { ...comment, user: author ? pickFields(author, include.user.select) : null };
        }
        return comment;
      },
      findUnique: async ({ where, include }) => {
        const c = store.comments.get(where.id);
        if (!c) return null;
        if (include?.project) {
          const proj = store.projects.get(c.projectId);
          const owner = proj ? store.users.get(proj.userId) : null;
          return {
            ...c,
            project: proj
              ? {
                  isPublic: proj.isPublic,
                  userId: proj.userId,
                  user: { isPublic: owner?.isPublic ?? false },
                }
              : null,
          };
        }
        return { ...c };
      },
      findMany: async ({ where, include, take }) => {
        let list = [...store.comments.values()]
          .filter((c) => c.projectId === where.projectId)
          .sort((a, b) => a.createdAt - b.createdAt);
        if (take) list = list.slice(0, take);
        return list.map((c) => {
          if (include?.user) {
            const author = store.users.get(c.userId);
            return { ...c, user: author ? pickFields(author, include.user.select) : null };
          }
          return c;
        });
      },
      update: async ({ where, data }) => {
        const c = store.comments.get(where.id);
        Object.assign(c, data, { updatedAt: new Date() });
        return { ...c };
      },
      delete: async ({ where }) => {
        const c = store.comments.get(where.id);
        store.comments.delete(where.id);
        return c;
      },
    },

    star: {
      findUnique: async ({ where }) => {
        const { userId, projectId } = where.userId_projectId;
        return store.stars.find((s) => s.userId === userId && s.projectId === projectId) || null;
      },
      findMany: async ({ where, include, skip = 0, take } = {}) => {
        let list = store.stars.filter((s) => {
          if (where.userId && s.userId !== where.userId) return false;
          if (where.projectId?.in && !where.projectId.in.includes(s.projectId)) return false;
          if (where.project?.OR) {
            const proj = store.projects.get(s.projectId);
            if (!proj) return false;
            const owner = store.users.get(proj.userId);
            const ok = where.project.OR.some((cond) => {
              if (cond.userId) return proj.userId === cond.userId;
              if (cond.isPublic !== undefined) {
                return proj.isPublic === cond.isPublic && owner?.isPublic === cond.user?.isPublic;
              }
              return false;
            });
            if (!ok) return false;
          }
          return true;
        });
        if (skip) list = list.slice(skip);
        if (take) list = list.slice(0, take);
        return list.map((s) =>
          include?.project
            ? { ...s, project: hydrateProject(store.projects.get(s.projectId), include.project) }
            : s,
        );
      },
      create: async ({ data }) => {
        const star = { ...data, createdAt: new Date() };
        store.stars.push(star);
        return star;
      },
      delete: async ({ where }) => {
        const { userId, projectId } = where.userId_projectId;
        store.stars = store.stars.filter(
          (s) => !(s.userId === userId && s.projectId === projectId),
        );
      },
    },

    profileFeedback: {
      create: async ({ data, include }) => {
        const item = {
          id: crypto.randomUUID(),
          content: data.content,
          authorId: data.authorId,
          recipientId: data.recipientId,
          createdAt: new Date(),
        };
        store.feedback.set(item.id, item);
        if (include?.author) {
          const author = store.users.get(item.authorId);
          return { ...item, author: author ? pickFields(author, include.author.select) : null };
        }
        return item;
      },
      findUnique: async ({ where }) => store.feedback.get(where.id) || null,
      findMany: async ({ where, include, take }) => {
        let list = [...store.feedback.values()]
          .filter((f) => f.recipientId === where.recipientId)
          .sort((a, b) => b.createdAt - a.createdAt);
        if (take) list = list.slice(0, take);
        return list.map((f) => {
          if (include?.author) {
            const author = store.users.get(f.authorId);
            return { ...f, author: author ? pickFields(author, include.author.select) : null };
          }
          return f;
        });
      },
      delete: async ({ where }) => {
        const item = store.feedback.get(where.id);
        store.feedback.delete(where.id);
        return item;
      },
    },
  };

  return client;
}
