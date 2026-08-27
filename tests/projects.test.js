import { beforeEach, describe, expect, test } from "@jest/globals";
import request from "supertest";
import {
  OWNER_ID,
  PRIVATE_USER_ID,
  PROJECT_ID,
  STRANGER_ID,
  createAuthHeaders,
  createPrismaMock,
  loadAppWithMocks,
  resetPrismaMock,
} from "./test-helpers.js";

const prismaMock = createPrismaMock();
const { app } = await loadAppWithMocks({ prismaMock });

beforeEach(() => {
  resetPrismaMock(prismaMock);
});

describe("project routes", () => {
  test("POST / creates a project for the authenticated user", async () => {
    prismaMock.project.create.mockResolvedValue({
      id: PROJECT_ID,
      title: "Portfolio",
      description: "My work",
      projectimgUrl: null,
      links: null,
      readme: null,
      isPublic: true,
      createdAt: new Date("2026-08-12T00:00:00.000Z"),
      updatedAt: new Date("2026-08-12T00:00:00.000Z"),
      userId: OWNER_ID,
    });

    const response = await request(app)
      .post("/api/v1/projects")
      .set(createAuthHeaders(OWNER_ID))
      .send({
        title: "Portfolio",
        description: "My work",
        isPublic: true,
        userId: STRANGER_ID,
      });

    expect(response.statusCode).toBe(201);
    expect(prismaMock.project.create.mock.calls[0][0].data).toMatchObject({
      title: "Portfolio",
      description: "My work",
      isPublic: true,
      userId: OWNER_ID,
    });
  });

  test("GET /:id allows the owner to open a private project", async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: PROJECT_ID,
      title: "Private project",
      description: "hidden",
      projectimgUrl: null,
      links: null,
      readme: null,
      isPublic: false,
      userId: OWNER_ID,
      user: { isPublic: false },
    });

    const response = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}`)
      .set(createAuthHeaders(OWNER_ID));

    expect(response.statusCode).toBe(200);
    expect(response.body.id).toBe(PROJECT_ID);
  });

  test("GET /:id blocks strangers from a public project when the owner profile is private", async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: PROJECT_ID,
      title: "Public project",
      description: "visible project",
      projectimgUrl: null,
      links: null,
      readme: null,
      isPublic: true,
      userId: PRIVATE_USER_ID,
      user: { isPublic: false },
    });

    const response = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}`)
      .set(createAuthHeaders(STRANGER_ID));

    expect(response.statusCode).toBe(403);
    expect(response.body.error.message).toBe("This project is private.");
  });

  test("PATCH /:id rejects updates from non-owners", async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: PROJECT_ID,
      title: "Owned project",
      userId: OWNER_ID,
    });

    const response = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}`)
      .set(createAuthHeaders(STRANGER_ID))
      .send({ title: "New title" });

    expect(response.statusCode).toBe(403);
    expect(prismaMock.project.update).not.toHaveBeenCalled();
  });

  test("GET / returns the public project list", async () => {
    prismaMock.project.findMany.mockResolvedValue([
      {
        id: PROJECT_ID,
        title: "Public project",
        isPublic: true,
      },
    ]);

    const response = await request(app).get("/api/v1/projects");

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: PROJECT_ID,
      title: "Public project",
    });
    expect(response.body[0].hasStarred).toBe(false);
    expect(typeof response.body[0].stars).toBe("number");
  });

  test("GET / sets hasStarred true for the requester who starred a project", async () => {
    prismaMock.project.findMany.mockResolvedValue([
      {
        id: PROJECT_ID,
        title: "Public project",
        isPublic: true,
        _count: { stars: 4 },
      },
    ]);
    prismaMock.star.findMany.mockResolvedValue([{ projectId: PROJECT_ID }]);

    const response = await request(app)
      .get("/api/v1/projects")
      .set(createAuthHeaders(STRANGER_ID));

    expect(response.statusCode).toBe(200);
    expect(response.body[0].stars).toBe(4);
    expect(response.body[0]._count.stars).toBe(4);
    expect(response.body[0].hasStarred).toBe(true);
    expect(prismaMock.star.findMany).toHaveBeenCalledWith({
      where: { userId: STRANGER_ID, projectId: { in: [PROJECT_ID] } },
      select: { projectId: true },
    });
  });

  test("GET / keeps hasStarred false for a logged-in user who has not starred", async () => {
    prismaMock.project.findMany.mockResolvedValue([
      {
        id: PROJECT_ID,
        title: "Public project",
        isPublic: true,
        _count: { stars: 2 },
      },
    ]);
    prismaMock.star.findMany.mockResolvedValue([]);

    const response = await request(app)
      .get("/api/v1/projects")
      .set(createAuthHeaders(STRANGER_ID));

    expect(response.statusCode).toBe(200);
    expect(response.body[0].stars).toBe(2);
    expect(response.body[0].hasStarred).toBe(false);
  });

  test("GET /user/:username/projects overlays hasStarred for the requester", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: OWNER_ID,
      username: "owner",
      isPublic: true,
    });
    prismaMock.project.findMany.mockResolvedValue([
      {
        id: PROJECT_ID,
        title: "Owner project",
        isPublic: true,
        userId: OWNER_ID,
        _count: { stars: 1 },
      },
    ]);
    prismaMock.star.findMany.mockResolvedValue([{ projectId: PROJECT_ID }]);

    const response = await request(app)
      .get("/api/v1/user/owner/projects")
      .set(createAuthHeaders(STRANGER_ID));

    expect(response.statusCode).toBe(200);
    expect(response.body[0].stars).toBe(1);
    expect(response.body[0].hasStarred).toBe(true);
  });
});