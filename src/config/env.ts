// XS_APP_ENV_EAS_PROFILES_V1
export type XiascorAppEnv = "development" | "preview" | "production";

const CLOUD_RUN_BASE_URL = "https://xiascor-backend-tssdy62zqa-ez.a.run.app";

function normalizeEnv(value: unknown): XiascorAppEnv {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "preview" || raw === "production") return raw;
  return "development";
}

function cleanUrl(value: unknown, fallback: string): string {
  const raw = String(value || "").trim();
  return (raw || fallback).replace(/\/+$/, "");
}

export const APP_ENV = normalizeEnv(
  process.env.EXPO_PUBLIC_APP_ENV || process.env.APP_ENV
);

export const API_BASE_URL = cleanUrl(
  process.env.EXPO_PUBLIC_BASE_URL,
  CLOUD_RUN_BASE_URL
);

export const AUTH_BASE_URL = cleanUrl(
  process.env.EXPO_PUBLIC_AUTH_BASE_URL,
  API_BASE_URL
);

export const IS_DEV_ENV = APP_ENV === "development";
export const IS_PREVIEW_ENV = APP_ENV === "preview";
export const IS_PRODUCTION_ENV = APP_ENV === "production";

export const XIASCORE_ENV_CONFIG = {
  marker: "XS_APP_ENV_EAS_PROFILES_V1",
  appEnv: APP_ENV,
  apiBaseUrl: API_BASE_URL,
  authBaseUrl: AUTH_BASE_URL,
  isDevelopment: IS_DEV_ENV,
  isPreview: IS_PREVIEW_ENV,
  isProduction: IS_PRODUCTION_ENV,
} as const;
