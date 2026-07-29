import { withIotCache, clearIotCache } from "../lib/iot";

beforeEach(() => {
  clearIotCache();
  delete process.env.IOT_CACHE_DISABLED;
});

afterEach(() => {
  delete process.env.IOT_CACHE_DISABLED;
});

describe("withIotCache — cache miss", () => {
  it("calls the fetch function on first access", () => {
    const fn = jest.fn().mockReturnValue({ power_output_kw: 42 });
    withIotCache("solar:1:99999", fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("returns the value produced by the fetch function", () => {
    const result = withIotCache("solar:2:99999", () => ({ efficiency_pct: 75 }));
    expect(result).toEqual({ efficiency_pct: 75 });
  });
});

describe("withIotCache — cache hit", () => {
  it("does not call fetch again on the second access within TTL", () => {
    const fn = jest.fn().mockReturnValue({ power_output_kw: 42 });
    withIotCache("solar:3:99999", fn, 60_000);
    withIotCache("solar:3:99999", fn, 60_000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("returns the previously cached value on the second access", () => {
    const first = withIotCache("solar:4:99999", () => ({ val: "original" }), 60_000);
    const second = withIotCache("solar:4:99999", () => ({ val: "stale" }), 60_000);
    expect(first).toEqual({ val: "original" });
    expect(second).toEqual({ val: "original" });
  });

  it("isolates cache entries by key — different project IDs do not collide", () => {
    withIotCache("solar:10:99999", () => "projectA", 60_000);
    const b = withIotCache("solar:11:99999", () => "projectB", 60_000);
    expect(b).toBe("projectB");
  });
});

describe("withIotCache — TTL expiry", () => {
  it("fetches fresh data after the TTL has elapsed", () => {
    jest.useFakeTimers();

    const fn = jest.fn().mockReturnValueOnce("first").mockReturnValueOnce("second");

    withIotCache("solar:5:99999", fn, 1_000);       // prime cache
    jest.advanceTimersByTime(1_001);                 // expire TTL
    const result = withIotCache("solar:5:99999", fn, 1_000);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(result).toBe("second");

    jest.useRealTimers();
  });

  it("does not refetch before the TTL elapses", () => {
    jest.useFakeTimers();

    const fn = jest.fn().mockReturnValue("data");
    withIotCache("solar:6:99999", fn, 5_000);
    jest.advanceTimersByTime(4_999);
    withIotCache("solar:6:99999", fn, 5_000);

    expect(fn).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});

describe("withIotCache — IOT_CACHE_DISABLED", () => {
  it("bypasses the cache entirely when IOT_CACHE_DISABLED=true", () => {
    process.env.IOT_CACHE_DISABLED = "true";

    const fn = jest.fn().mockReturnValue({ bypassed: true });
    withIotCache("solar:7:99999", fn, 60_000);
    withIotCache("solar:7:99999", fn, 60_000);
    withIotCache("solar:7:99999", fn, 60_000);

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("re-enables caching when IOT_CACHE_DISABLED is unset", () => {
    process.env.IOT_CACHE_DISABLED = "true";
    const fn = jest.fn().mockReturnValue(1);
    withIotCache("solar:8:99999", fn, 60_000);

    delete process.env.IOT_CACHE_DISABLED;
    withIotCache("solar:8:99999", fn, 60_000);
    withIotCache("solar:8:99999", fn, 60_000);

    // First call (disabled) + prime call + cached call = 2 total
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
