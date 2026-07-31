import { Injectable } from "@nestjs/common";
import { z } from "zod";

/**
 * Zod schema defining the environment configuration variables for Phase 2.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url(),
    PRIMARY_AI_PROVIDER: z.enum(["gemini", "openai", "deepseek", "ollama"]).default("gemini"),
    AES_MASTER_KEY: z.string().length(64),
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
    ENABLE_SWAGGER: z
      .preprocess((val) => val === "true" || val === true, z.boolean())
      .default(false),
    ALLOWED_ORIGINS: z.string().default("*"),
    RATE_LIMIT_MAX: z.coerce.number().default(100),
    BODY_LIMIT_BYTES: z.coerce.number().default(1048576),
    JWT_PRIVATE_KEY: z.string().min(1),
    JWT_PUBLIC_KEY: z.string().min(1),
    STORAGE_PROVIDER: z.literal("local").default("local"),
    STORAGE_LOCAL_BASE_DIR: z.string().trim().min(1).default("storage"),
    QUEUE_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(5),
    QUEUE_POLL_INTERVAL_MS: z.coerce.number().int().min(100).max(60_000).default(2_000),
    QUEUE_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(100).default(25),
    QUEUE_SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(15_000),
    EMAIL_PROVIDER: z.enum(["disabled", "smtp"]).default("disabled"),
    SMTP_HOST: z.string().trim().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: z.preprocess((val) => val === "true" || val === true, z.boolean()).default(false),
    SMTP_USER: z.string().trim().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    SMTP_FROM: z.string().email().optional(),
    GOOGLE_OAUTH_ENABLED: z
      .preprocess((val) => val === "true" || val === true, z.boolean())
      .default(false),
    GOOGLE_OAUTH_CLIENT_ID: z.string().trim().min(1).optional(),
    GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_OAUTH_CALLBACK_URL: z.string().url().optional(),
    AUTH_SUCCESS_REDIRECT_URL: z.string().url().default("http://localhost:5173/auth/callback"),
    AUTH_FAILURE_REDIRECT_URL: z
      .string()
      .url()
      .default("http://localhost:5173/login?error=oauth_failed"),
    GEMINI_API_KEY: z.string().optional(),
  })
  .superRefine((config, context) => {
    if (config.NODE_ENV === "production" && config.EMAIL_PROVIDER !== "smtp") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["EMAIL_PROVIDER"],
        message: "Production requires the SMTP email provider.",
      });
    }

    if (config.EMAIL_PROVIDER === "smtp") {
      for (const key of ["SMTP_HOST", "SMTP_FROM"] as const) {
        if (!config[key]) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when EMAIL_PROVIDER is smtp.`,
          });
        }
      }
      if (Boolean(config.SMTP_USER) !== Boolean(config.SMTP_PASSWORD)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SMTP_PASSWORD"],
          message: "SMTP_USER and SMTP_PASSWORD must be configured together.",
        });
      }
    }

    if (config.GOOGLE_OAUTH_ENABLED) {
      for (const key of [
        "GOOGLE_OAUTH_CLIENT_ID",
        "GOOGLE_OAUTH_CLIENT_SECRET",
        "GOOGLE_OAUTH_CALLBACK_URL",
      ] as const) {
        if (!config[key]) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when Google OAuth is enabled.`,
          });
        }
      }
    }
  });

/**
 * Type representation of the environment configuration.
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Custom error thrown when environment validation fails during bootstrap.
 */
export class ConfigurationValidationError extends Error {
  public readonly errors: Record<string, string[]>;

  constructor(zodError: z.ZodError) {
    const fieldErrors = zodError.flatten().fieldErrors;
    const errors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(fieldErrors)) {
      if (value) {
        errors[key] = value;
      }
    }
    const formattedMessage = `[Fatal] Environment configuration validation failed: ${JSON.stringify(errors)}`;
    super(formattedMessage);
    this.name = "ConfigurationValidationError";
    this.errors = errors;
  }
}

let _config: EnvConfig | null = null;

/**
 * Initializes the configuration singleton using the provided environment variables.
 * This function is idempotent: subsequent calls with identical properties are safe,
 * but trying to reinitialize with conflicting properties will throw an error.
 *
 * @param env - The raw environment variables.
 * @returns The frozen EnvConfig instance.
 */
export function initializeConfig(env: Record<string, unknown> = process.env): EnvConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new ConfigurationValidationError(result.error);
  }
  const parsed = Object.freeze(result.data);

  if (_config) {
    // Enforce idempotency: check if properties differ
    const keys = Object.keys(parsed) as Array<keyof EnvConfig>;
    for (const key of keys) {
      if (_config[key] !== parsed[key]) {
        throw new Error("Configuration has already been initialized with different parameters.");
      }
    }
    return _config;
  }

  _config = parsed;
  return _config;
}

/**
 * Safely retrieves the validated configuration instance lazily.
 *
 * @returns The frozen EnvConfig instance.
 */
export function getConfig(): EnvConfig {
  if (!_config) {
    initializeConfig(process.env);
  }
  return _config!;
}

/**
 * NestJS service adapter that injects the immutable configuration.
 */
@Injectable()
export class ConfigService {
  private readonly envConfig: EnvConfig;

  constructor(env?: Record<string, unknown>) {
    if (env) {
      // Test isolation: allow passing custom environment variables
      const result = envSchema.safeParse(env);
      if (!result.success) {
        throw new ConfigurationValidationError(result.error);
      }
      this.envConfig = Object.freeze(result.data);
    } else {
      this.envConfig = getConfig();
    }
  }

  /**
   * Retrieves a configuration property by key.
   *
   * @param key - The configuration key.
   * @returns The value of the configuration key.
   */
  public get<T extends keyof EnvConfig>(key: T): EnvConfig[T] {
    return this.envConfig[key];
  }
}
