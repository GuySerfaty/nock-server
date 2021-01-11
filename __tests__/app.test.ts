import app from "../app";
import request from "supertest";

// const app = 'http://localhost:8000'
const adminPath = '/_routes'
describe("GET / - a simple api endpoint", () => {
  it("Hello API Request", async () => {
    const result = await request(app).get("/");
    expect(result.text).toEqual("hello");
    expect(result.status).toEqual(200);
  });

  it("Can add new route, get it and delete it", async () => {
    await request(app).post(adminPath).send({
      method: "get",
      path: "/api/v1/users",
      response: {
        body: [{ "id": 1, "name": "guy" }],
        status: 200
      }
    });

    const { body: beforeCallingTheApi } = await request(app).get(adminPath).query({
      method: 'get',
      path: '/api/v1/users'
    });
    console.log('beforeCallingTheApi', beforeCallingTheApi)
    const resultWork = await request(app).get("/api/v1/users").query({
      page: 5,
    });
    const { body: afterCallingTheApi } = await request(app).get(adminPath).query({
      method: 'get',
      path: '/api/v1/users'
    });
    console.log('afterCallingTheApi', afterCallingTheApi)

    expect(resultWork.status).toEqual(200);

    await request(app).delete(adminPath).send({
      path: "/api/v1/users",
      method: "get",
    });

    const result = await request(app).get("/api/v1/users");

    expect(result.status).toEqual(404);
  });
});