import { computeScores } from "../lib/scoring";

describe("computeScores", () => {
  it("perfect data → 100/100", () => {
    const scores = computeScores({
      solar: { efficiency_pct: 100, power_output_kw: 1000, max_power_kw: 1000 },
      satellite: { forest_density_pct: 100, ndvi_score: 1.0 },
    });
    expect(scores.credit_quality).toBe(100);
    expect(scores.green_impact).toBe(100);
  });

  it("zero data → 0/0", () => {
    const scores = computeScores({
      solar: { efficiency_pct: 0, power_output_kw: 0, max_power_kw: 1000 },
      satellite: { forest_density_pct: 0, ndvi_score: 0 },
    });
    expect(scores.credit_quality).toBe(0);
    expect(scores.green_impact).toBe(0);
  });

  it("clamps out-of-range inputs to 0–100", () => {
    const scores = computeScores({
      solar: { efficiency_pct: 150, power_output_kw: 2000, max_power_kw: 1000 },
      satellite: { forest_density_pct: 120, ndvi_score: 1.5 },
    });
    expect(scores.credit_quality).toBeLessThanOrEqual(100);
    expect(scores.green_impact).toBeLessThanOrEqual(100);
  });

  it("blended green_impact formula: (power/max)*50 + (forest/100)*50", () => {
    // (800/1000)*50 + (60/100)*50 = 40 + 30 = 70
    const scores = computeScores({
      solar: { efficiency_pct: 80, power_output_kw: 800, max_power_kw: 1000 },
      satellite: { forest_density_pct: 60, ndvi_score: 0.6 },
    });
    expect(scores.green_impact).toBe(70);
    expect(scores.credit_quality).toBe(80);
  });

  it("NaN efficiency_pct → credit_quality clamped to 0", () => {
    const scores = computeScores({
      solar: { efficiency_pct: NaN, power_output_kw: 500, max_power_kw: 1000 },
      satellite: { forest_density_pct: 50, ndvi_score: 0.5 },
    });
    expect(scores.credit_quality).toBe(0);
    expect(scores.credit_quality).not.toBeNaN();
  });

  it("NaN power_output_kw → handled gracefully", () => {
    const scores = computeScores({
      solar: { efficiency_pct: 80, power_output_kw: NaN, max_power_kw: 1000 },
      satellite: { forest_density_pct: 50, ndvi_score: 0.5 },
    });
    // clamp catches NaN and returns 0 for the power ratio term
    expect(scores.green_impact).not.toBeNaN();
    expect(scores.green_impact).toBeGreaterThanOrEqual(0);
    expect(scores.green_impact).toBeLessThanOrEqual(100);
  });

  it("NaN max_power_kw → division by zero avoided", () => {
    const scores = computeScores({
      solar: { efficiency_pct: 80, power_output_kw: 500, max_power_kw: NaN },
      satellite: { forest_density_pct: 50, ndvi_score: 0.5 },
    });
    // NaN is not 0, so max_power_kw === 0 path is NOT taken. clamp catches NaN.
    expect(scores.green_impact).not.toBeNaN();
    expect(scores.green_impact).toBeGreaterThanOrEqual(0);
    expect(scores.green_impact).toBeLessThanOrEqual(100);
  });

  it("zero max_power_kw → division by zero handled, green_impact from forest only", () => {
    const scores = computeScores({
      solar: { efficiency_pct: 80, power_output_kw: 500, max_power_kw: 0 },
      satellite: { forest_density_pct: 60, ndvi_score: 0.6 },
    });
    // power ratio = 0, so green_impact = 0 + (60/100)*50 = 30
    expect(scores.green_impact).toBe(30);
    expect(scores.green_impact).not.toBeNaN();
  });

  it("NaN satellite forest_density_pct → handled gracefully", () => {
    const scores = computeScores({
      solar: { efficiency_pct: 80, power_output_kw: 500, max_power_kw: 1000 },
      satellite: { forest_density_pct: NaN, ndvi_score: 0.5 },
    });
    expect(scores.green_impact).not.toBeNaN();
    expect(scores.green_impact).toBeGreaterThanOrEqual(0);
    expect(scores.green_impact).toBeLessThanOrEqual(100);
  });

  it("all NaN inputs → scores are 0, not NaN", () => {
    const scores = computeScores({
      solar: { efficiency_pct: NaN, power_output_kw: NaN, max_power_kw: NaN },
      satellite: { forest_density_pct: NaN, ndvi_score: NaN },
    });
    expect(scores.credit_quality).toBe(0);
    expect(scores.credit_quality).not.toBeNaN();
    expect(scores.green_impact).not.toBeNaN();
    expect(scores.green_impact).toBe(0);
  });
});
