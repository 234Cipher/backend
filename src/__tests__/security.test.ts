/**
 * @jest-environment node
 */
process.env.PROJECT_REGISTRY_CONTRACT_ID = "CCJZK7ZYK5N4T6Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5";

import request from "supertest";
import express, { Express } from "express";
import adminRouter from "../routes/admin";
import { errorHandler, notFoundHandler } from "../middleware/errors";
import * as registry from "../lib/registry";
import * as iot from "../routes/iot";
import * as scoring from "../lib/scoring";

jest.mock("../lib/registry");
jest.mock("../routes/iot");
jest.mock("../lib/scoring");

function buildAdminApp(): Express {
    const app = express();
    app.use(express.json());
    app.use("/api/admin", adminRouter);
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
}

describe("Security - injection attacks", () => {
    describe("Admin routes - prototype pollution attempts", () => {
        beforeEach(() => {
            process.env.ADMIN_API_KEY = "test-key";
            (registry.getTotalProjects as jest.Mock).mockResolvedValue(1);
            (iot.getSolarData as jest.Mock).mockReturnValue({
                efficiency_pct: 85,
                power_output_kw: 500,
                max_power_kw: 1000,
            });
            (iot.getSatelliteData as jest.Mock).mockReturnValue({
                forest_density_pct: 60,
                ndvi_score: 0.6,
            });
            (scoring.computeScores as jest.Mock).mockReturnValue({
                credit_quality: 85,
                green_impact: 70,
            });
            (registry.updateImpactScore as jest.Mock).mockResolvedValue("tx-hash-pp");
        });

        afterEach(() => {
            delete process.env.ADMIN_API_KEY;
        });

        it("__proto__ pollution → handled safely (falls through to all projects)", async () => {
            const app = buildAdminApp();
            const res = await request(app)
                .post("/api/admin/update-scores")
                .set("Authorization", "Bearer test-key")
                .send(JSON.parse('{"__proto__": {"project_ids": [999]}}'))
                .expect(200);

            expect(res.body.updated).toBe(1);
            expect(registry.getTotalProjects).toHaveBeenCalled();
        });

        it("constructor.prototype pollution → handled safely", async () => {
            const app = buildAdminApp();
            const res = await request(app)
                .post("/api/admin/update-scores")
                .set("Authorization", "Bearer test-key")
                .send({ constructor: { prototype: { project_ids: [999] } } })
                .expect(200);

            expect(res.body.updated).toBe(1);
            expect(registry.getTotalProjects).toHaveBeenCalled();
        });
    });
});