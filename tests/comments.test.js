import { beforeEach, describe, expect, test } from "@jest/globals";
import request from "supertest";
import {
  COMMENT_ID,
  OWNER_ID,
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

describe("comment routes", () => {
  test("POST / creates a comment for the authenticated user", async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: PROJECT_ID,
      userId: OWNER_ID,
      isPublic: false,
      user: { isPublic: false },
    });
    prismaMock.comment.create.mockResolvedValue({
      id: COMMENT_ID,
      content: "Nice work",
      projectId: PROJECT_ID,
      userId: OWNER_ID,
    });

    const response = await request(app)
      .post("/api/v1/comments")
      .set(createAuthHeaders(OWNER_ID))
      .send({
        content: "Nice work",
        projectId: PROJECT_ID,
        userId: STRANGER_ID,
      });

    expect(response.statusCode).toBe(201);
    expect(prismaMock.comment.create.mock.calls[0][0].data).toMatchObject({
      content: "Nice work",
      projectId: PROJECT_ID,
      userId: OWNER_ID,
    });
  });

  test("GET /:id blocks strangers from a private comment's project", async () => {
    prismaMock.comment.findUnique.mockResolvedValue({
      id: COMMENT_ID,
      content: "Hidden comment",
      project: {
        isPublic: false,
        userId: OWNER_ID,
        user: { isPublic: false },
      },
    });

    const response = await request(app)
      .get(`/api/v1/comments/${COMMENT_ID}`)
      .set(createAuthHeaders(STRANGER_ID));

    expect(response.statusCode).toBe(403);
    expect(response.body.error.message).toBe("This project is private.");
  });

  test("DELETE /:id rejects deletes from non-owners", async () => {
    prismaMock.comment.findUnique.mockResolvedValue({
      id: COMMENT_ID,
      userId: OWNER_ID,
    });

    const response = await request(app)
      .delete(`/api/v1/comments/${COMMENT_ID}`)
      .set(createAuthHeaders(STRANGER_ID));

    expect(response.statusCode).toBe(403);
    expect(prismaMock.comment.delete).not.toHaveBeenCalled();
  });

  test("GET /:projectId/comments allows the owner to read comments on a private project", async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: PROJECT_ID,
      userId: OWNER_ID,
      isPublic: false,
      user: { isPublic: false },
    });
    prismaMock.comment.findMany.mockResolvedValue([
      {
        id: COMMENT_ID,
        content: "Nice work",
        projectId: PROJECT_ID,
        userId: OWNER_ID,
      },
    ]);

    const response = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/comments`)
      .set(createAuthHeaders(OWNER_ID));

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(1);
  });
});
