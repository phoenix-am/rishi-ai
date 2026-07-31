import js from "@eslint/js";
import ts from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/out/**",
      "**/coverage/**",
      "packages/database/migrations/**",
      "configs/**",
      "scripts/**",
      "**/*.config.js",
      "**/*.config.ts",
      "**/vite.config.ts",
      "**/vitest.config.ts",
      "**/*.cjs",
      "**/.pnpmfile.cjs",
    ],
  },
  {
    plugins: {
      boundaries,
    },
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json", "./apps/*/tsconfig.json", "./packages/*/tsconfig.json"],
        tsconfigRootDir: rootDir,
      },
    },
    settings: {
      "boundaries/elements": [
        { type: "shared", pattern: "packages/shared" },
        { type: "domain", pattern: "packages/domain" },
        { type: "events", pattern: "packages/events" },
        { type: "auth", pattern: "packages/auth" },
        { type: "config", pattern: "packages/config" },
        { type: "logger", pattern: "packages/logger" },
        { type: "transaction", pattern: "packages/transaction" },
        { type: "database", pattern: "packages/database" },
        { type: "storage", pattern: "packages/storage" },
        { type: "testing", pattern: "packages/testing" },
        { type: "server", pattern: "apps/server" },
        { type: "client", pattern: "apps/client" },
      ],
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // Prevent importing internals of sibling packages
      "boundaries/entry-point": [
        "error",
        {
          default: "disallow",
          rules: [
            {
              target: [
                "shared",
                "domain",
                "events",
                "auth",
                "config",
                "logger",
                "transaction",
                "database",
                "storage",
                "testing",
              ],
              allow: "src/index.ts",
            },
          ],
        },
      ],
      // Enforce the strict package dependency rules
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            {
              from: "shared",
              allow: [],
            },
            {
              from: "domain",
              allow: ["shared"],
            },
            {
              from: "events",
              allow: ["domain", "shared"],
            },
            {
              from: "auth",
              allow: ["domain", "shared"],
            },
            {
              from: "config",
              allow: ["shared"],
            },
            {
              from: "logger",
              allow: ["config", "shared"],
            },
            {
              from: "transaction",
              allow: ["logger", "config", "shared"],
            },
            {
              from: "database",
              allow: ["transaction", "logger", "config", "domain", "shared"],
            },
            {
              from: "storage",
              allow: ["config"],
            },
            {
              from: "testing",
              allow: ["database", "transaction", "logger", "config", "domain", "shared"],
            },
            {
              from: "server",
              allow: [
                "auth",
                "config",
                "logger",
                "database",
                "storage",
                "events",
                "domain",
                "shared",
              ],
            },
            {
              from: "client",
              allow: ["domain", "shared"],
            },
          ],
        },
      ],
    },
  }
);
