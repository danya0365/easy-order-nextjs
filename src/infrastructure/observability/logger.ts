import "server-only";

import type { ILogger, LogFields } from "@/src/application/services/ILogger";
import {
  type ErrorTracker,
  createErrorTracker,
  noopErrorTracker,
} from "./error-tracker";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
export type Level = keyof typeof LEVELS;

/** LOG_LEVEL env wins ("silent"/"off" mutes everything); else info in prod, debug elsewhere. */
function resolveMinLevel(): number {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env === "silent" || env === "off") return Infinity;
  if (env && env in LEVELS) return LEVELS[env as Level];
  return process.env.NODE_ENV === "production" ? LEVELS.info : LEVELS.debug;
}

function serializeError(error: unknown): LogFields {
  if (error instanceof Error) {
    return { err: { name: error.name, message: error.message, stack: error.stack } };
  }
  return { err: { message: String(error) } };
}

const consoleSink = (level: Level, line: string): void => {
  // The single sanctioned place that touches console — everything else logs
  // through ILogger. error→stderr, warn→stderr, info/debug→stdout.
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

export interface LoggerOptions {
  tracker?: ErrorTracker;
  /** JSON lines (default: on in production, pretty elsewhere). */
  json?: boolean;
  minLevel?: number;
  /** Output seam — overridable in tests. */
  out?: (level: Level, line: string) => void;
}

/**
 * Structured logger. Emits one JSON line per event in production (ready for log
 * aggregation) and a compact human line in dev. `captureException` also forwards
 * to the error tracker. Synchronous + never throws — safe on any code path.
 */
export class Logger implements ILogger {
  private readonly tracker: ErrorTracker;
  private readonly json: boolean;
  private readonly min: number;
  private readonly out: (level: Level, line: string) => void;

  constructor(opts: LoggerOptions = {}) {
    this.tracker = opts.tracker ?? noopErrorTracker;
    this.json =
      opts.json ??
      (process.env.LOG_FORMAT === "json" ||
        process.env.NODE_ENV === "production");
    this.min = opts.minLevel ?? resolveMinLevel();
    this.out = opts.out ?? consoleSink;
  }

  debug(message: string, fields?: LogFields): void {
    this.write("debug", message, fields);
  }
  info(message: string, fields?: LogFields): void {
    this.write("info", message, fields);
  }
  warn(message: string, fields?: LogFields): void {
    this.write("warn", message, fields);
  }
  error(message: string, fields?: LogFields): void {
    this.write("error", message, fields);
  }

  captureException(error: unknown, fields?: LogFields): void {
    this.write("error", messageOf(error), { ...fields, ...serializeError(error) });
    try {
      this.tracker.capture(error, fields);
    } catch {
      /* the tracker is best-effort; never let it break the caller */
    }
  }

  private write(level: Level, message: string, fields?: LogFields): void {
    if (LEVELS[level] < this.min) return;
    const hasFields = fields && Object.keys(fields).length > 0;
    if (this.json) {
      this.out(
        level,
        JSON.stringify({
          level,
          time: new Date().toISOString(),
          msg: message,
          ...fields,
        }),
      );
    } else {
      const tail = hasFields ? ` ${JSON.stringify(fields)}` : "";
      this.out(level, `[${level}] ${message}${tail}`);
    }
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/** Process-wide logger. Infrastructure/presentation import this directly. */
export const logger: ILogger = new Logger({ tracker: createErrorTracker() });
