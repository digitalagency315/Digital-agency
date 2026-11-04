/**
 * Tiny JSON logger. Redacts secret-looking keys and any known secret values,
 * so tokens never end up in Render logs.
 */
const SECRET_KEY = /token|secret|password|passwd|api[_-]?key|authorization|private[_-]?key|pass$/i;
let secrets: string[] = [];

export function registerSecrets(values: string[]): void {
  secrets = values.filter(Boolean);
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[depth]";
  if (typeof value === "string") {
    let out = value;
    for (const s of secrets) if (s && out.includes(s)) out = out.split(s).join("[REDACTED]");
    // Bearer tokens / Graph access tokens that slipped into strings
    out = out.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [REDACTED]");
    out = out.replace(/access_token=[^&\s]+/g, "access_token=[REDACTED]");
    return out;
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value instanceof Error) return { name: value.name, message: redact(value.message, depth + 1) };
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY.test(k) ? "[REDACTED]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

type Level = "debug" | "info" | "warn" | "error";
let silent = false;
export function setSilent(v: boolean): void {
  silent = v;
}

function write(level: Level, msg: string, meta?: Record<string, unknown>): void {
  if (silent) return;
  if (level === "debug" && process.env.LOG_LEVEL !== "debug") return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...((redact(meta || {}) as object) || {}) });
  (level === "error" || level === "warn" ? process.stderr : process.stdout).write(line + "\n");
}

export const log = {
  debug: (m: string, meta?: Record<string, unknown>) => write("debug", m, meta),
  info: (m: string, meta?: Record<string, unknown>) => write("info", m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => write("warn", m, meta),
  error: (m: string, meta?: Record<string, unknown>) => write("error", m, meta),
};

/** Mask a phone number for logs: 919876543210 -> 91******3210 */
export function maskNumber(n: string): string {
  if (!n || n.length < 6) return n;
  return n.slice(0, 2) + "*".repeat(n.length - 6) + n.slice(-4);
}
