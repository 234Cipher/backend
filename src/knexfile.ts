import type { Knex } from "knex";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const baseConfig: Knex.Config = {
  client: "pg",
  migrations: {
    directory: "./src/db/migrations",
    extension: "ts",
    tableName: "knex_migrations",
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMilis: 30000,
    idleTimeoutMilis: 60000,
  },
};

function getSslConfig(): any {
  const caPath =
    process.env.DB_SSL_CA_PATH || process.env.DB_SSL_CA || process.env.DATABASE_CA;
  if (caPath) {
    return {
      ca: fs.readFileSync(caPath),
      rejectUnauthorized: true,
    };
  }
  return true;
}

const config: Record<string, Knex.Config> = {
  development: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || "heliobond_dev",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
    },
  },

  test: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || "heliobond_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
    },
    pool: {
      min: 1,
      max: 5,
    },
  },

  staging: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: getSslConfig(),
    },
  },

  production: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: getSslConfig(),
    },
    pool: {
      min: 5,
      max: 30,
    },
  },
};

export default config;
