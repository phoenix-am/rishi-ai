import { Injectable } from "@nestjs/common";
import { z } from "zod";

/**
 * Zod schema defining the environment configuration variables for Phase 2.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  PRIMARY_AI_PROVIDER: z.enum(["gemini", "openai", "deepseek", "ollama"]).default("gemini"),
  AES_MASTER_KEY: z.string().length(64),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  ENABLE_SWAGGER: z.preprocess((val) => val === "true" || val === true, z.boolean()).default(false),
  ALLOWED_ORIGINS: z.string().default("*"),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  BODY_LIMIT_BYTES: z.coerce.number().default(1048576),
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().optional(),
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
