import type { AddressInfo } from "node:net";
import { Agent, LLM } from "../src/agent";
import { loadConfig, Config } from "../src/config";
import { MessageHandler } from "../src/handler";
import { LeadLog } from "../src/leads";
import { setSilent } from "../src/logger";
import { createApp } from "../src/server";
import { signBody } from "../src/signature";
import { Store } from "../src/store";
import type { Notifier } from "../src/notify";
import type { ToolDeps } from "../src/tools";
import type { CalendarService } from "../src/calendar";
import { WhatsApp } from "../src/whatsapp";

setSilent(true);

export const realFetch = globalThis.fetch;

export interface GraphCall {
  url: string;
  method: string;
  body: any;
}

/** Replace global fetch: graph.facebook.com is mocked, everything else (local test server) passes through. */
export function mockFetch(): { calls: GraphCall[]; messages: () => GraphCall[]; restore: () => void } {
  const calls: GraphCall[] = [];
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input.url;
    if (!url.startsWith("https://graph.facebook.com")) return realFetch(input, init);
    let body: any = init?.body;
    if (typeof body === "string") body = JSON.parse(body);
    calls.push({ url, method: init?.method || "GET", body });
    if (url.endsWith("/media")) return new Response(JSON.stringify({ id: "media-123" }), { status: 200 });
    return new Response(JSON.stringify({ messaging_product: "whatsapp", messages: [{ id: "wamid.out" }] }), { status: 200 });
  }) as typeof fetch;
  return {
    calls,
    // outbound chat messages only (ignore read receipts)
    messages: () => calls.filter((c) => c.url.endsWith("/messages") && c.body?.status !== "read"),
    restore: () => {
      globalThis.fetch = realFetch;
    },
  };
}

export const OWNER = "919999900000";
export const CUSTOMER = "919876543210";

export function testConfig(over: Partial<Config> = {}): Config {
  return {
    ...loadConfig({
      WHATSAPP_TOKEN: "test-wa-token-xyz",
      WHATSAPP_PHONE_NUMBER_ID: "1234567890",
      WHATSAPP_VERIFY_TOKEN: "verify-me",
      WHATSAPP_APP_SECRET: "app-secret-abc",
      ANTHROPIC_API_KEY: "sk-test",
      OWNER_NUMBER: OWNER,
      UPI_ID: "growzone@okaxis",
      UPI_NAME: "GrowZone Media",
    } as NodeJS.ProcessEnv),
    ...over,
  };
}

export class FakeNotifier implements Notifier {
  sent: string[] = [];
  async owner(text: string) {
    this.sent.push(text);
  }
}

/** Scripted fake Claude. Each call pops the next response (or a function result). */
export function fakeLLM(script: Array<any | ((params: any) => any)>): LLM & { calls: any[] } {
  const calls: any[] = [];
  return {
    calls,
    async create(params: any) {
      calls.push(params);
      const next = script.shift();
      if (next === undefined) throw new Error("fake LLM: no more responses");
      const r = typeof next === "function" ? next(params) : next;
      if (r instanceof Error) throw r;
      return r;
    },
  };
}

export const textReply = (text: string) => ({ stop_reason: "end_turn", content: [{ type: "text", text }], usage: { input_tokens: 1, output_tokens: 1 } });
export const toolReply = (name: string, input: any = {}, id = "tu_" + Math.random().toString(36).slice(2)) => ({
  stop_reason: "tool_use",
  content: [{ type: "tool_use", id, name, input }],
  usage: { input_tokens: 1, output_tokens: 1 },
});

export async function startTestApp(opts: { llm?: LLM; calendar?: CalendarService | null; cfg?: Partial<Config> } = {}) {
  const cfg = testConfig(opts.cfg);
  const store = new Store("/nonexistent", false);
  const leads = new LeadLog("/nonexistent", false);
  const wa = new WhatsApp(cfg.whatsappToken, cfg.whatsappPhoneNumberId, cfg.graphVersion);
  const notifier = new FakeNotifier();
  const deps: ToolDeps = { cfg, wa, store, leads, calendar: opts.calendar ?? null, notifier };
  const llm = opts.llm || fakeLLM([]);
  const agent = new Agent(cfg, llm, deps);
  const handler = new MessageHandler(cfg, deps, agent);
  const { app, idle } = createApp({ cfg, store, handler });
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  async function postWebhook(payload: unknown, signature?: string) {
    const raw = JSON.stringify(payload);
    const res = await realFetch(base + "/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Hub-Signature-256": signature ?? signBody(raw, cfg.whatsappAppSecret) },
      body: raw,
    });
    return res;
  }

  return { cfg, store, deps, notifier, llm, base, idle, postWebhook, close: () => new Promise<void>((r) => server.close(() => r())) };
}

let n = 0;
/** Build a realistic WhatsApp Cloud API webhook payload. */
export function webhookPayload(from: string, message: Record<string, unknown>, name = "Rahul") {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_ID",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "15550001111", phone_number_id: "1234567890" },
              contacts: [{ profile: { name }, wa_id: from }],
              messages: [{ from, id: message.id || `wamid.test.${++n}`, timestamp: "1730700000", ...message }],
            },
          },
        ],
      },
    ],
  };
}
