import request from "supertest";
import express, { Express } from "express";
import { getSolarData, getSatelliteData } from "../routes/iot";
import iotRouter from "../routes/iot";
import { errorHandler, notFoundHandler } from "../middleware/errors";

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/iot", iotRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("getSolarData", () => {
  it("returns expected shape", () => {
    const data = getSolarData(1);
    expect(typeof data.power_output_kw).toBe("number");
    expect(typeof data.efficiency_pct).toBe("number");
    expect(typeof data.max_power_kw).toBe("number");
    expect(typeof data.timestamp).toBe("number");
  });

  it("efficiency_pct is in 40–98 range", () => {
    for (let i = 0; i < 10; i++) {
      const { efficiency_pct } = getSolarData(i + 1);
      expect(efficiency_pct).toBeGreaterThanOrEqual(40);
      expect(efficiency_pct).toBeLessThanOrEqual(98);
    }
  });

  it("different project IDs produce different values", () => {
    expect(getSolarData(1).power_output_kw).not.toBe(getSolarData(2).power_output_kw);
  });
});

describe("getSatelliteData", () => {
  it("returns expected shape with valid ranges", () => {
    const data = getSatelliteData(1);
    expect(data.forest_density_pct).toBeGreaterThanOrEqual(0);
    expect(data.forest_density_pct).toBeLessThanOrEqual(100);
    expect(data.ndvi_score).toBeGreaterThanOrEqual(0);
    expect(data.ndvi_score).toBeLessThanOrEqual(1);
  });
});

describe("IoT route validation - non-numeric IDs", () => {
  const app = buildApp();

  it("GET /api/iot/solar/abc → 400 with 'invalid project id'", async () => {
    const res = await request(app).get("/api/iot/solar/abc").expect(400);
    expect(res.body).toEqual({
      error: "bad_request",
      message: expect.stringContaining("positive integer"),
    });
  });

  it("GET /api/iot/solar/1.5 → 400 with 'invalid project id'", async () => {
    const res = await request(app).get("/api/iot/solar/1.5").expect(400);
    expect(res.body).toEqual({
      error: "bad_request",
      message: expect.stringContaining("positive integer"),
    });
  });

  it("GET /api/iot/solar/ → 404 (empty id, no matching route)", async () => {
    const res = await request(app).get("/api/iot/solar/").expect(404);
    expect(res.body.error).toBe("not_found");
  });

  it("GET /api/iot/satellite/abc → 400 with 'invalid project id'", async () => {
    const res = await request(app).get("/api/iot/satellite/abc").expect(400);
    expect(res.body).toEqual({
      error: "bad_request",
      message: expect.stringContaining("positive integer"),
    });
  });
});
