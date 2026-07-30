import { Request, Response, NextFunction } from "express";
import { httpRequestDuration, httpRequestsTotal } from "../lib/prometheus";

function normalizeRoute(req: Request): string {
  if (req.route?.path) {
    return `${req.baseUrl}${req.route.path}`;
  }
  return req.originalUrl.split("?")[0];
}

export function prometheusMiddleware(req: Request, res: Response, next: NextFunction): void {
  const end = httpRequestDuration.startTimer();

  res.on("finish", () => {
    const route = normalizeRoute(req);
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };
    end(labels);
    httpRequestsTotal.inc(labels);
  });

  next();
}
