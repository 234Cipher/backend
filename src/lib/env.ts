export interface Env {

  PORT: number;
  FRONTEND_URL: string;
  /**
   * Path to a CA certificate (PEM file) used to validate the database server's TLS certificate.
   * If not set, the system's default CAs are used.
   */
  DB_SSL_CA_PATH?: string;
}

export function initEnv(): Env {
  const port = parseInt(process.env.PORT ?? "3001", 10);
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const dbSslCaPath = process.env.DB_SSL_CA_PATH

  return {
    PORT: port,
    FRONTEND_URL: frontendUrl,
    DB_SSL_CA_PATH: dbSslCaPath,
  };
}
