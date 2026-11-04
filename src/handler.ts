import { Agent } from "./agent";
import type { Config } from "./config";
import { log, maskNumber } from "./logger";
import { DEFAULT_MENU_BODY, FALLBACK_TEXT, MENU_BUTTON, MENU_ROWS, MENU_SECTION, menuTitle } from "./menu";
import { OWNER_HELP, parseOwnerCommand, runOwnerCommand } from "./owner";
import { doHandoff, Outbox, ToolDeps } from "./tools";

/** Shape of one entry in value.messages[] of the WhatsApp webhook. */
export interface InboundMessage {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  button?: { text: string; payload?: string };
  image?: { id: string; mime_type?: string; caption?: string };
  document?: { id: string; mime_type?: string; caption?: string; filename?: string };
}

const FLOOD_MAX = 8; // messages per user per minute; beyond this we stay quiet
const UTR_RE = /\b\d{12}\b/;

export class MessageHandler {
  private flood = new Map<string, number[]>();

  constructor(private cfg: Config, private deps: ToolDeps, private agent: Agent) {}

  private flooded(number: string): boolean {
    const now = Date.now();
    const arr = (this.flood.get(number) || []).filter((t) => now - t < 60_000);
    arr.push(now);
    this.flood.set(number, arr);
    return arr.length > FLOOD_MAX;
  }

  private async sendMenu(to: string, body: string): Promise<void> {
    await this.deps.wa.sendList(to, { body: body || DEFAULT_MENU_BODY, button: MENU_BUTTON, sectionTitle: MENU_SECTION, rows: MENU_ROWS });
  }

  /** Send exactly ONE reply for one inbound message, based on the agent's outbox. */
  private async sendReply(to: string, text: string, outbox: Outbox): Promise<string> {
    if (outbox.image) {
      const caption = [text, outbox.image.caption].filter(Boolean).join("\n\n").slice(0, 1024);
      await this.deps.wa.sendImageById(to, outbox.image.mediaId, caption);
      return caption;
    }
    if (outbox.menu) {
      await this.sendMenu(to, text);
      return text || DEFAULT_MENU_BODY;
    }
    await this.deps.wa.sendText(to, text);
    return text;
  }

  async handle(msg: InboundMessage, profileName = ""): Promise<void> {
    const { cfg, deps } = this;
    const from = msg.from;
    deps.wa.markRead(msg.id).catch(() => undefined);

    // ---- Owner commands (only from OWNER_NUMBER) ----
    if (cfg.ownerNumber && from === cfg.ownerNumber) {
      const text = msg.text?.body || "";
      const cmd = parseOwnerCommand(text);
      const reply = cmd ? await runOwnerCommand(cmd, deps, cfg.courseAccessMessage) : OWNER_HELP;
      log.info("owner_command", { cmd: cmd?.cmd || "help" });
      await deps.wa.sendText(from, reply);
      return;
    }

    if (this.flooded(from)) {
      log.warn("flood_ignored", { from: maskNumber(from) });
      return;
    }

    const { user, isNew } = deps.store.ensureUser(from, profileName);
    deps.store.update(from, { lastInboundAt: new Date().toISOString() });
    if (isNew) deps.leads.append({ name: user.name, number: from, interest: "", slot: "", status: "new" });

    // Human handoff active → bot stays silent for this user.
    if (user.handoff) {
      log.info("handoff_silent", { from: maskNumber(from) });
      return;
    }

    // ---- Work out the user's text ----
    let text = "";
    if (msg.type === "text") text = msg.text?.body?.trim() || "";
    else if (msg.type === "interactive") {
      const r = msg.interactive?.list_reply || msg.interactive?.button_reply;
      if (r?.id === "menu_human") {
        deps.store.addTurn(from, "user", "Talk to a human");
        await doHandoff(deps, deps.store.getUser(from)!, "Selected 'Talk to a human' in menu");
        const reply = "Theek hai 🙏 Hamari team ka member aapse jaldi baat karega.";
        await deps.wa.sendText(from, reply);
        deps.store.addTurn(from, "assistant", reply);
        return;
      }
      text = r ? `[Menu choice] ${menuTitle(r.id) || r.title}` : "";
    } else if (msg.type === "button") text = msg.button?.text || "";

    // ---- Payment proof (screenshot / UTR) → forward to owner, no AI ----
    const proofMedia = msg.type === "image" ? msg.image : msg.type === "document" ? msg.document : undefined;
    if (user.paymentPending && !user.paid && (proofMedia || UTR_RE.test(text))) {
      await this.forwardPaymentProof(from, proofMedia?.id, text);
      const reply = "Thank you! 🙏 Payment proof mil gaya. Team verify karke jaldi confirm karegi.";
      deps.store.addTurn(from, "user", text || "[payment screenshot]");
      await deps.wa.sendText(from, reply);
      deps.store.addTurn(from, "assistant", reply);
      return;
    }

    if (!text) {
      // audio, video, sticker, location, image without pending payment, etc.
      await this.sendMenu(from, "Abhi main sirf text messages samajh pata hoon 🙂 Kripya type karein ya neeche menu se choose karein.");
      return;
    }

    // ---- Claude ----
    deps.store.addTurn(from, "user", text.slice(0, 2000));
    let replyText = "";
    let outbox: Outbox = { menu: false, image: null, handoff: false };
    try {
      const res = await this.agent.run(deps.store.getUser(from)!);
      outbox = res.outbox;
      if (res.fallback) {
        if (outbox.image) replyText = "";
        else {
          outbox.menu = true;
          replyText = FALLBACK_TEXT;
        }
      } else replyText = res.text;
    } catch (e: any) {
      log.error("claude_error", { status: e?.status, name: e?.name, message: e?.message });
      outbox = { menu: true, image: null, handoff: false };
      replyText = FALLBACK_TEXT;
    }

    try {
      const sent = await this.sendReply(from, replyText, outbox);
      deps.store.addTurn(from, "assistant", sent);
    } catch (e) {
      log.error("reply_send_failed", { from: maskNumber(from), error: e });
    }
  }

  private async forwardPaymentProof(from: string, mediaId: string | undefined, text: string): Promise<void> {
    const { deps, cfg } = this;
    const user = deps.store.getUser(from)!;
    deps.leads.append({ name: user.name, number: from, interest: "Course ₹999", slot: "", status: "payment_proof" });
    const alert = `💰 Payment proof (Course ₹${cfg.coursePrice})\nName: ${user.name || "-"}\nNumber: +${from}\n${text ? `Text/UTR: ${text.slice(0, 200)}\n` : ""}Verify in your UPI app, then reply: PAID ${from}`;
    await deps.notifier.owner(alert);
    if (mediaId && cfg.ownerNumber) {
      try {
        const file = await deps.wa.downloadMedia(mediaId);
        const id = await deps.wa.uploadMedia(file.data, file.mimeType, "payment-proof");
        await deps.wa.sendImageById(cfg.ownerNumber, id, `Payment proof from +${from}`);
      } catch (e) {
        log.warn("forward_proof_failed", { error: e });
      }
    }
  }
}
