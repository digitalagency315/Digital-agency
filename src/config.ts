import path from "node:path";

export interface Config {
  port: number;
  dataDir: string;
  businessFile: string;

  whatsappToken: string;
  whatsappPhoneNumberId: string;
  whatsappVerifyToken: string;
  whatsappAppSecret: string;
  graphVersion: string;
  /** Optional approved utility template used for owner alerts (works outside the 24h window). */
  alertTemplateName: string;
  alertTemplateLang: string;

  anthropicApiKey: string;
  claudeModel: string;
  claudeEffort: "low" | "medium" | "high";
  claudeFallbacks: boolean;

  ownerNumber: string;

  googleServiceAccountJsonB64: string;
  googleCalendarId: string;
  workingDays: number[]; // 0=Sun ... 6=Sat (IST)

  upiId: string;
  upiName: string;
  coursePrice: number;
  courseAccessMessage: string;

  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  alertEmailTo: string;
}

/** Normalise any phone number to WhatsApp's digits-only format (India default country code 91). */
export function normalizeNumber(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 11 && digits.startsWith("0")) return "91" + digits.slice(1);
  return digits;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const dataDir = env.DATA_DIR || path.resolve(process.cwd(), "data");
  const effort = (env.CLAUDE_EFFORT || "low").toLowerCase();
  return {
    port: Number(env.PORT || 3000),
    dataDir,
    businessFile: env.BUSINESS_FILE || path.resolve(process.cwd(), "business.md"),

    whatsappToken: env.WHATSAPP_TOKEN || "",
    whatsappPhoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || "",
    whatsappVerifyToken: env.WHATSAPP_VERIFY_TOKEN || "",
    whatsappAppSecret: env.WHATSAPP_APP_SECRET || "",
    graphVersion: env.GRAPH_API_VERSION || "v21.0",
    alertTemplateName: env.WHATSAPP_ALERT_TEMPLATE || "",
    alertTemplateLang: env.WHATSAPP_ALERT_TEMPLATE_LANG || "en",

    anthropicApiKey: env.ANTHROPIC_API_KEY || "",
    claudeModel: env.CLAUDE_MODEL || "claude-sonnet-5-5",
    claudeEffort: (["low", "medium", "high"].includes(effort) ? effort : "low") as Config["claudeEffort"],
    claudeFallbacks: (env.CLAUDE_FALLBACKS || "on").toLowerCase() !== "off",

    ownerNumber: normalizeNumber(env.OWNER_NUMBER || ""),

    googleServiceAccountJsonB64: env.GOOGLE_SERVICE_ACCOUNT_JSON || "",
    googleCalendarId: env.GOOGLE_CALENDAR_ID || "",
    workingDays: (env.WORKING_DAYS || "1,2,3,4,5")
      .split(",")
      .map((d) => Number(d.trim()))
      .filter((d) => d >= 0 && d <= 6),

    upiId: env.UPI_ID || "",
    upiName: env.UPI_NAME || "GrowZone Media",
    coursePrice: Number(env.COURSE_PRICE || 999),
    courseAccessMessage: env.COURSE_ACCESS_MESSAGE || "",

    smtpHost: env.SMTP_HOST || "",
    smtpPort: Number(env.SMTP_PORT || 587),
    smtpUser: env.SMTP_USER || "",
    smtpPass: env.SMTP_PASS || "",
    smtpFrom: env.SMTP_FROM || env.SMTP_USER || "",
    alertEmailTo: env.ALERT_EMAIL_TO || "",
  };
}

/** Values that must never appear in logs. */
export function secretValues(cfg: Config): string[] {
  return [
    cfg.whatsappToken,
    cfg.whatsappAppSecret,
    cfg.whatsappVerifyToken,
    cfg.anthropicApiKey,
    cfg.googleServiceAccountJsonB64,
    cfg.smtpPass,
  ].filter((v) => v && v.length >= 6);
}

export function missingRequired(cfg: Config): string[] {
  const req: Array<[string, string]> = [
    ["WHATSAPP_TOKEN", cfg.whatsappToken],
    ["WHATSAPP_PHONE_NUMBER_ID", cfg.whatsappPhoneNumberId],
    ["WHATSAPP_VERIFY_TOKEN", cfg.whatsappVerifyToken],
    ["WHATSAPP_APP_SECRET", cfg.whatsappAppSecret],
    ["ANTHROPIC_API_KEY", cfg.anthropicApiKey],
    ["OWNER_NUMBER", cfg.ownerNumber],
  ];
  return req.filter(([, v]) => !v).map(([k]) => k);
}
