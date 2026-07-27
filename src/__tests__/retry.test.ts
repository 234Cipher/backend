import { backoffDelay, isTransientError, withRetry } from "../lib/retry";

// ── isTransientError ──────────────────────────────────────────────────────────

describe("isTransientError", () => {
  it("returns true for generic network errors", () => {
    expect(isTransientError(new Error("ECONNRESET"))).toBe(true);
    expect(isTransientError(new Error("fetch failed"))).toBe(true);
  });

  it("returns false for tx_bad_auth", () => {
    expect(isTransientError(new Error("tx_bad_auth"))).toBe(false);
  });

  it("returns false for tx_insufficient_balance", () => {
    expect(isTransientError(new Error("tx_insufficient_balance"))).toBe(false);
  });

  it("returns false for tx_no_account", () => {
    expect(isTransientError(new Error("tx_no_account"))).toBe(false);
  });

  it("returns false for tx_insufficient_fee", () => {
    expect(isTransientError(new Error("tx_insufficient_fee"))).toBe(false);
  });

  it("returns false for contract_error", () => {
    expect(isTransientError(new Error("contract_error: revert"))).toBe(false);
  });

  it("returns false for ADMIN_SECRET_KEY not set", () => {
    expect(isTransientError(new Error("ADMIN_SECRET_KEY not set"))).toBe(false);
  });

  it("treats non-Error values as transient (no permanent keyword)", () => {
    expect(isTransientError("timeout")).toBe(true);
    expect(isTransientError(500)).toBe(true);
  });
});

// ── backoffDelay ──────────────────────────────────────────────────────────────

describe("backoffDelay", () => {
  const cfg = {
    maxAttempts: 4,
    baseDelayMs: 200,
    maxDelayMs: 30_000,
    jitter: 0,          // zero jitter → deterministic
    label: "test",
  };

  it("returns baseDelayMs on attempt 0 (first retry) when jitter is 0", () => {
    expect(backoffDelay(0, cfg)).toBe(200);
  });

  it("doubles the delay for each subsequent attempt", () => {
    expect(backoffDelay(1, cfg)).toBe(400);
    expect(backoffDelay(2, cfg)).toBe(800);
    expect(backoffDelay(3, cfg)).toBe(1_600);
  });

  it("caps delay at maxDelayMs", () => {
    expect(backoffDelay(20, cfg)).toBe(30_000);
  });

  it("applies jitter: result stays within the expected ± band", () => {
    const jitterCfg = { ...cfg, jitter: 0.3 };
    const delay = backoffDelay(0, jitterCfg); // exponential = 200
    expect(delay).toBeGreaterThanOrEqual(Math.floor(200 * 0.7));
    expect(delay).toBeLessThanOrEqual(Math.ceil(200 * 1.3));
  });

  it("always returns a non-negative integer", () => {
    for (let i = 0; i < 10; i++) {
      const d = backoffDelay(i, { ...cfg, jitter: 0.3 });
      expect(d).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(d)).toBe(true);
    }
  });
});

// ── withRetry ─────────────────────────────────────────────────────────────────

describe("withRetry", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("resolves immediately when fn succeeds on the first attempt", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const p = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100, jitter: 0 });
    await jest.runAllTimersAsync();
    await expect(p).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient errors and resolves when fn eventually succeeds", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue("recovered");

    const p = withRetry(fn, { maxAttempts: 4, baseDelayMs: 10, jitter: 0 });
    await jest.runAllTimersAsync();
    await expect(p).resolves.toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws immediately on a permanent error without retrying", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("tx_bad_auth"));
    const p = withRetry(fn, { maxAttempts: 4, baseDelayMs: 10, jitter: 0 });
    await jest.runAllTimersAsync();
    await expect(p).rejects.toThrow("tx_bad_auth");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("exhausts all attempts and re-throws when fn always fails transiently", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("ECONNRESET"));
    const p = withRetry(fn, { maxAttempts: 3, baseDelayMs: 10, jitter: 0 });
    await jest.runAllTimersAsync();
    await expect(p).rejects.toThrow("ECONNRESET");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("respects maxAttempts=1 — no retries at all", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("timeout"));
    const p = withRetry(fn, { maxAttempts: 1, baseDelayMs: 10, jitter: 0 });
    await jest.runAllTimersAsync();
    await expect(p).rejects.toThrow("timeout");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("uses exponential intervals between retries (base retry 1 = baseDelayMs)", async () => {
    const delays: number[] = [];
    const realSetTimeout = global.setTimeout;

    jest.useRealTimers();
    const spy = jest
      .spyOn(global, "setTimeout")
      .mockImplementation((cb: TimerHandler, ms?: number) => {
        delays.push(ms ?? 0);
        (cb as () => void)();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      });

    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue("ok");

    await withRetry(fn, { maxAttempts: 4, baseDelayMs: 200, maxDelayMs: 30_000, jitter: 0 });

    expect(delays[0]).toBe(200);   // attempt 0 → 200ms
    expect(delays[1]).toBe(400);   // attempt 1 → 400ms

    spy.mockRestore();
  });
});
