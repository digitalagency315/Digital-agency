import express from "express";
import type { Config } from "./config";
import type { InboundMessage, MessageHandler } from "./handler";
import { log, maskNumber } from "./logger";
import { verifySignature } from "./signature";
import type { Store } from "./store";

export interface AppDeps {
  cfg: Config;
  store: Store;
  handler: Pick<MessageHandler, "handle">;
}

/**
 * Express app:
 *  GET  /webhook  – Meta verification handshake (hub.verify_token)
 *  POST /webhook  – signed events; verified, acked 200 immediately, processed async
 *  GET  /health   – health check for Render
 */
export function createApp({ cfg, store, handler }: AppDeps) {
  const app = express();
  app.disable("x-powered-by");

  // Per-user queues so one user's messages are handled in order; different users run in parallel.
  const queues = new Map<string, Promise<void>>();
  const inflight = new Set<Promise<void>>();

  function enqueue(user: string, job: () => Promise<void>): void {
    const prev = queues.get(user) || Promise.resolve();
    const next = prev
      .then(job)
      .catch((e) => log.error("process_failed", { user: maskNumber(user), error: e }))
      .finally(() => {
        inflight.delete(next);
        if (queues.get(user) === next) queues.delete(user);
      });
    queues.set(user, next);
    inflight.add(next);
  }

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && cfg.whatsappVerifyToken && token === cfg.whatsappVerifyToken && typeof challenge === "string") {
      log.info("webhook_verified");
      res.status(200).type("text/plain").send(challenge);
      return;
    }
    log.warn("webhook_verify_failed");
    res.sendStatus(403);
  });

  app.post("/webhook", express.raw({ type: "*/*", limit: "1mb" }), (req, res) => {
    const raw: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    if (!verifySignature(raw, req.get("x-hub-signature-256"), cfg.whatsappAppSecret)) {
      log.warn("bad_signature");
      res.sendStatus(401);
      return;
    }
    let body: any;
    try {
      body = JSON.parse(raw.toString("utf8"));
    } catch {
      res.sendStatus(400);
      return;
    }

    // Ack fast; Meta retries if it doesn't get a 200 quickly.
    res.sendStatus(200);

    if (body?.object !== "whatsapp_business_account") return;
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "messages") continue;
        const value = change.value || {};
        if (cfg.whatsappPhoneNumberId && value.metadata?.phone_number_id && value.metadata.phone_number_id !== cfg.whatsappPhoneNumberId) continue;
        const contacts: Array<{ wa_id: string; profile?: { name?: string } }> = value.contacts || [];
        for (const msg of (value.messages || []) as InboundMessage[]) {
          if (!msg?.id || !msg.from) continue;
          if (store.seen(msg.id)) {
            log.info("duplicate_ignored", { id: msg.id.slice(-8) });
            continue;
          }
          const name = contacts.find((c) => c.wa_id === msg.from)?.profile?.name || "";
          enqueue(msg.from, () => handler.handle(msg, name));
        }
      }
    }
  });

  /** Resolves when all queued work is done (used by tests and graceful shutdown). */
  async function idle(): Promise<void> {
    while (inflight.size) await Promise.allSettled([...inflight]);
  }

  return { app, idle };
}
