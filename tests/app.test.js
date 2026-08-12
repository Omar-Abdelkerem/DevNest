import request from "supertest";
import app from "../src/app.js";

describe("Express app smoke tests", () => {
  test("GET / responds with the API welcome message", async () => {
    const response = await request(app).get("/");

    expect(response.statusCode).toBe(200);
    expect(response.text).toBe("Welcome to the API");
  });

  test("GET /does-not-exist returns the not found response", async () => {
    const response = await request(app).get("/does-not-exist");

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ message: "Route does not exist" });
  });
});
