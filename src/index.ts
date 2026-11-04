import { Agent, anthropicLLM } from "./agent";
import { CalendarService, GoogleCalendar } from "./calendar";
import { loadConfig, missingRequired, secretValues } from "./config";
import { MessageHandler } from "./handler";
import { LeadLog } from "./leads";
import { log, registerSecrets } from "./logger";
import { OwnerNotifier } from "./notify";
import { createApp } from "./server";
import { Store } from "./store";
import type { ToolDeps } from "./tools";
import { WhatsApp } from "./whatsapp";

const cfg = loadConfig();
registerSecrets(secretValues(cfg));

const missing = missingRequired(cfg);
if (missing.length) log.error("missing_env", { missing });

const store = new Store(cfg.dataDir);
const leads = new LeadLog(cfg.dataDir);
const wa = new WhatsApp(cfg.whatsappToken, cfg.whatsappPhoneNumberId, cfg.graphVersion);

let calendar: CalendarService | null = null;
if (cfg.googleServiceAccountJsonB64 && cfg.googleCalendarId) {
  try {
    calendar = new GoogleCalendar(cfg.googleServiceAccountJsonB64, cfg.googleCalendarId, cfg.workingDays);
  } catch (e) {
    log.error("calendar_init_failed", { error: e });
  }
} else log.warn("calendar_not_configured");

const deps: ToolDeps = { cfg, wa, store, leads, calendar, notifier: new OwnerNotifier(cfg, wa) };
const agent = new Agent(cfg, anthropicLLM(cfg.anthropicApiKey), deps);
const handler = new MessageHandler(cfg, deps, agent);
const { app, idle } = createApp({ cfg, store, handler });

const server = app.listen(cfg.port, () => log.info("listening", { port: cfg.port, model: cfg.claudeModel }));

async function shutdown(sig: string) {
  log.info("shutdown", { sig });
  server.close();
  await Promise.race([idle(), new Promise((r) => setTimeout(r, 8000))]);
  store.flush();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
