export interface IotInput {
  solar: { efficiency_pct: number; power_output_kw: number; max_power_kw: number };
  satellite: { forest_density_pct: number; ndvi_score: number };
}

export interface ImpactScores {
  credit_quality: number;
  green_impact: number;
}

function clamp(v: number, min: number, max: number): number {
  if (isNaN(v)) return 0;
  return Math.max(min, Math.min(max, v));
}

export function computeScores(input: IotInput): ImpactScores {
  const { solar, satellite } = input;
  const credit_quality = Math.round(clamp(isNaN(solar.efficiency_pct) ? 0 : solar.efficiency_pct, 0, 100));
  const powerRatio = solar.max_power_kw === 0 ? 0 : solar.power_output_kw / solar.max_power_kw;
  const green_impact = Math.round(
    clamp(
      powerRatio * 50 +
      (satellite.forest_density_pct / 100) * 50,
      0,
      100
    )
  );
  return { credit_quality, green_impact };
}
