import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../src/config/prisma.client.js";

async function seed() {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log(`Database already has ${existingUsers} user(s); skipping seed.`);
    return;
  }

  const passwordHash = await bcrypt.hash("DevNestSeed#2026", 12);

  const user = await prisma.user.create({
    data: {
      username: "omar-dev",
      email: "omar@devnest.dev",
      passwordHash,
      bio: "Full-stack engineer building fast developer tools, distributed APIs, and polished web interfaces.",
      about:
        "I enjoy designing clean backend architectures, optimizing PostgreSQL queries, and crafting responsive React applications that feel instant.",
      location: "Cairo, Egypt",
      age: 22,
      role: "Full-Stack Engineer",
      company: "DevNest",
      availableForWork: true,
      isPublic: true,
      links: ["https://github.com/Omar-Abdelkerem"],
      skills: {
        create: [
          { name: "TypeScript", level: "ADVANCED" },
          { name: "Node.js", level: "EXPERT" },
          { name: "PostgreSQL", level: "ADVANCED" },
          { name: "React", level: "ADVANCED" },
          { name: "Redis", level: "INTERMEDIATE" },
        ],
      },
    },
  });

  const languages = await Promise.all(
    ["JavaScript", "TypeScript", "PostgreSQL", "Docker"].map((name) =>
      prisma.language.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const project = await prisma.project.create({
    data: {
      title: "DevNest Portfolio Platform",
      description:
        "A high-performance developer portfolio platform with Redis caching, PostgreSQL indexing, and interactive project showcases.",
      links: [
        { name: "GitHub", url: "https://github.com/Omar-Abdelkerem/DevNest" },
      ],
      readme:
        "# DevNest\n\nA production-ready platform for developers to showcase projects, collect peer feedback, and share a permanent record of engineering work.\n\n## Highlights\n- Express 5 + Prisma 7 + PostgreSQL\n- Redis session management & caching\n- Strict Zod validation & magic-byte upload verification",
      isPublic: true,
      userId: user.id,
      projectLanguages: {
        create: languages.map((lang) => ({ languageId: lang.id })),
      },
    },
  });

  console.log(`Seeded user @${user.username} and project "${project.title}".`);
}

seed()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
