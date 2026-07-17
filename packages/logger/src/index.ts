import pino from "pino";
import type { EnvConfig } from "@rishi/config";

/**
 * Core logging interface for Rishi AI business layers.
 */
export interface ILogger {
  /**
   * Logs an informational message.
   * @param msg - The log message.
   * @param context - Additional structured context metadata.
   */
  info(msg: string, context?: Record<string, any>): void;

  /**
   * Logs a warning message.
   * @param msg - The log message.
   * @param context - Additional structured context metadata.
   */
  warn(msg: string, context?: Record<string, any>): void;

  /**
   * Logs an error message.
   * @param msg - The log message.
   * @param context - Additional structured context metadata or Error object.
   */
  error(msg: string, context?: Record<string, any> | Error): void;

  /**
   * Logs a debug message.
   * @param msg - The log message.
   * @param context - Additional structured context metadata.
   */
  debug(msg: string, context?: Record<string, any>): void;
}

/**
 * Concrete implementation of ILogger wrapping the Pino logging engine.
 * Hidden from the public API to ensure engine encapsulation.
 */
class PinoLoggerAdapter implements ILogger {
  private readonly pinoInstance: pino.Logger;
  private readonly correlationIdProvider?: () => string | undefined;

  constructor(pinoInstance: pino.Logger, correlationIdProvider?: () => string | undefined) {
    this.pinoInstance = pinoInstance;
    this.correlationIdProvider = correlationIdProvider;
  }

  private getCorrelationContext(): Record<string, any> {
    if (this.correlationIdProvider) {
      const id = this.correlationIdProvider();
      if (id) {
        return { correlationId: id };
      }
    }
    return {};
  }

  public info(msg: string, context?: Record<string, any>): void {
    this.pinoInstance.info({ ...this.getCorrelationContext(), ...context }, msg);
  }

  public warn(msg: string, context?: Record<string, any>): void {
    this.pinoInstance.warn({ ...this.getCorrelationContext(), ...context }, msg);
  }

  public error(msg: string, context?: Record<string, any> | Error): void {
    let payload: Record<string, any> = { ...this.getCorrelationContext() };
    if (context instanceof Error) {
      payload.err = {
        message: context.message,
        stack: context.stack,
        name: context.name,
      };
    } else if (context) {
      payload = { ...payload, ...context };
    }
    this.pinoInstance.error(payload, msg);
  }

  public debug(msg: string, context?: Record<string, any>): void {
    this.pinoInstance.debug({ ...this.getCorrelationContext(), ...context }, msg);
  }
}

/**
 * Stateless factory for constructing ILogger instances.
 */
export class LoggerFactory {
  /**
   * Creates an instance of ILogger utilizing the concrete Pino logger engine.
   * Lifecycle management of the logger is owned entirely by the consuming application.
   *
   * @param config - The validated EnvConfig configuration, or a configuration service adapter.
   * @param correlationIdProvider - Optional callback to retrieve the active correlation ID context.
   * @returns A stateless implementation of ILogger.
   */
  public static createLogger(
    config: EnvConfig | { get<T extends keyof EnvConfig>(key: T): EnvConfig[T] },
    correlationIdProvider?: () => string | undefined
  ): ILogger {
    const logLevel =
      typeof (config as any).get === "function"
        ? (config as any).get("LOG_LEVEL")
        : (config as EnvConfig).LOG_LEVEL;

    const rawLogger = pino({
      level: logLevel || "info",
      messageKey: "message",
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
      },
    });

    return new PinoLoggerAdapter(rawLogger, correlationIdProvider);
  }
}
