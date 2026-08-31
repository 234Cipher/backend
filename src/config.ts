import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example for reference.`,
    );
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function numEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number, got: "${raw}"`);
  }
  return parsed;
}

function floatEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseFloat(raw);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number, got: "${raw}"`);
  }
  return parsed;
}

function validateEnvValue(name: string, value: string, allowedValues?: readonly string[]): void {
  if (!allowedValues || !value) return;
  if (!allowedValues.includes(value)) {
    throw new Error(
      `Environment variable ${name} must be one of: ${allowedValues.join(", ")}, got "${value}".`,
    );
  }
}

/** The Stellar networks this service knows how to talk to. */
export type StellarNetwork = "testnet" | "mainnet";

export const STELLAR_NETWORKS: readonly StellarNetwork[] = ["testnet", "mainnet"];

/**
 * Narrowing guard for STELLAR_NETWORK. Written as explicit comparisons so the
 * check is a real runtime validation and TypeScript can derive the narrowed
 * type without an assertion.
 */
export function isStellarNetworg(value: string): value is StellarNetwork {
  return value === "testnet" || value === "mainnet";
}

/**
 * Read a network-valued env var. An unset or unrecognised value falls back to
 * `fallback` so importing this module never throws. `validateRequiredEnv` is
 * what turns a misconfigured value into a startup error.
 */
function networkEnv(name: string, fallback: StellarNetwork): StellarNetwork {
  const raw = process.env[name];
  if (!raw) return fallback;
  return isStellarNetwork(raw) ? raw : fallback;
}

export const config = {
  /** Stellar / Soroban */
  STELLAR_NETWORK: networkEnv("STELLAR_NETWORK", "testnet"),
  ADMIN_SECRET_KEY: process.env.ADMIN_SECRET_KEY || "",
  PROJECT_REGISTRY_CONTRACT_ID: process.env.PROJECT_REGISTRY_CONTRACT_ID || "",
  RPC_URL: optionalEnv("RPC_URL", "https://soroban-testnet.stellar.org"),

  /** HTTP server */
  PORT: numEnv