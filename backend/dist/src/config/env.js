"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function requiredEnv(name, fallback) {
    const value = process.env[name] ?? fallback;
    if (!value || !String(value).trim()) {
        throw new Error(`${name} is required`);
    }
    return value;
}
function optionalNumber(name, fallback) {
    const raw = process.env[name];
    if (!raw)
        return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value)) {
        throw new Error(`${name} must be a valid number`);
    }
    return value;
}
function parseOrigins(value) {
    return String(value || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
}
const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const corsOrigins = parseOrigins(process.env.CORS_ORIGINS || frontendUrl);
const jwtSecret = isProduction
    ? requiredEnv("JWT_SECRET")
    : requiredEnv("JWT_SECRET", "development-only-change-me");
if (isProduction && jwtSecret === "development-only-change-me") {
    throw new Error("JWT_SECRET must be set to a strong production value");
}
exports.env = {
    NODE_ENV: nodeEnv,
    IS_PRODUCTION: isProduction,
    PORT: optionalNumber("PORT", 4000),
    HOST: process.env.HOST || "0.0.0.0",
    DATABASE_URL: requiredEnv("DATABASE_URL"),
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
    FRONTEND_URL: frontendUrl,
    CORS_ORIGINS: corsOrigins,
};
