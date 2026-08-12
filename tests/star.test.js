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

describe("star routes", () => {
  test("POST /:id/star prevents starring your own project", async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: PROJECT_ID,
      userId: OWNER_ID,
      isPublic: true,
      user: { isPublic: true },
    });

    const response = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/star`)
      .set(createAuthHeaders(OWNER_ID));

    expect(response.statusCode).toBe(400);
    expect(prismaMock.star.create).not.toHaveBeenCalled();
  });

  test("POST /:id/star creates the star once and blocks duplicates on the second try", async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: PROJECT_ID,
      userId: PRIVATE_USER_ID,
      isPublic: true,
      user: { isPublic: true },
    });
    prismaMock.star.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ userId: STRANGER_ID, projectId: PROJECT_ID });
    prismaMock.star.create.mockResolvedValue({
      userId: STRANGER_ID,
      projectId: PROJECT_ID,
    });

    const firstResponse = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/star`)
      .set(createAuthHeaders(STRANGER_ID));

    const secondResponse = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/star`)
      .set(createAuthHeaders(STRANGER_ID));

    expect(firstResponse.statusCode).toBe(201);
    expect(secondResponse.statusCode).toBe(409);
    expect(prismaMock.star.create).toHaveBeenCalledTimes(1);
  });

  test("DELETE /:id/star removes an existing star", async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: PROJECT_ID,
      userId: PRIVATE_USER_ID,
      isPublic: true,
      user: { isPublic: true },
    });
    prismaMock.star.findUnique.mockResolvedValue({
      userId: STRANGER_ID,
      projectId: PROJECT_ID,
    });
    prismaMock.star.delete.mockResolvedValue({
      userId: STRANGER_ID,
      projectId: PROJECT_ID,
    });

    const response = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/star`)
      .set(createAuthHeaders(STRANGER_ID));

    expect(response.statusCode).toBe(204);
    expect(prismaMock.star.delete).toHaveBeenCalledWith({
      where: {
        userId_projectId: { userId: STRANGER_ID, projectId: PROJECT_ID },
      },
    });
  });

  test("DELETE /:id/star returns 404 when no star exists", async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: PROJECT_ID,
      userId: PRIVATE_USER_ID,
      isPublic: true,
      user: { isPublic: true },
    });
    prismaMock.star.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/star`)
      .set(createAuthHeaders(STRANGER_ID));

    expect(response.statusCode).toBe(404);
    expect(prismaMock.star.delete).not.toHaveBeenCalled();
  });
});
