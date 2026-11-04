import type Anthropic from "@anthropic-ai/sdk";
import type { CalendarService } from "./calendar";
import type { Config } from "./config";
import type { LeadLog } from "./leads";
import { log } from "./logger";
import type { Notifier } from "./notify";
import type { Store, UserState } from "./store";
import { buildUpiLink, renderQrPng } from "./upi";
import type { WhatsApp } from "./whatsapp";

type Tool = Anthropic.Beta.Messages.BetaTool;

export const TOOLS: Tool[] = [
  {
    name: "show_menu",
    description:
      "Show the interactive WhatsApp menu (Meta ads help, WhatsApp API (Relay), Course ₹999, Book a free 30-min call, Talk to a human). Use for greetings or when the user is unsure what they need. Your reply text becomes the menu message.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_free_slots",
    description:
      "Get 3 free 30-minute discovery-call slots (next 3 working days, 11:00-19:00 IST) from the team calendar. Call before offering times.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "hold_and_book_slot",
    description:
      "Book a free 30-min discovery call in one of the slots returned by get_free_slots. Re-checks the slot is still free. Requires the user's name. Email is optional (only if they want a calendar invite).",
    input_schema: {
      type: "object",
      properties: {
        slot_start: { type: "string", description: "Exact start value of an offered slot, e.g. 2026-11-05T11:00:00+05:30" },
        name: { type: "string", description: "User's name for the booking" },
        email: { type: "string", description: "Optional email for a calendar invite" },
      },
      required: ["slot_start", "name"],
      additionalProperties: false,
    },
  },
  {
    name: "send_upi_qr",
    description:
      "Send a UPI payment QR for the Meta Ads course (₹999) only. Never use for any other service. Payment is verified manually by the team after the user sends a screenshot/UTR.",
    input_schema: {
      type: "object",
      properties: { product: { type: "string", enum: ["meta_ads_course_999"] } },
      required: ["product"],
      additionalProperties: false,
    },
  },
  {
    name: "human_handoff",
    description:
      "Hand the chat to a human team member. The bot then stays silent for this user. Use when the user asks for a human, is unhappy, has a complex/custom request, or you are unsure.",
    input_schema: {
      type: "object",
      properties: { reason: { type: "string", description: "Short reason / summary for the owner" } },
      required: ["reason"],
      additionalProperties: false,
    },
  },
];

/** What the single outgoing reply should look like (one reply per user message). */
export interface Outbox {
  menu: boolean;
  image: { mediaId: string; caption: string } | null;
  handoff: boolean;
}

export interface ToolDeps {
  cfg: Config;
  wa: WhatsApp;
  store: Store;
  leads: LeadLog;
  calendar: CalendarService | null;
  notifier: Notifier;
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;

export async function doHandoff(deps: ToolDeps, user: UserState, reason: string): Promise<void> {
  deps.store.update(user.number, { handoff: true });
  deps.leads.append({ name: user.name, number: user.number, interest: user.interest || reason, slot: "", status: "handoff" });
  const lastMsg = [...user.history].reverse().find((t) => t.role === "user")?.text || "";
  await deps.notifier.owner(
    `🙋 Human handoff\nName: ${user.name || "-"}\nNumber: +${user.number}\nReason: ${reason.slice(0, 300)}\nLast msg: ${lastMsg.slice(0, 300)}\nChat: https://wa.me/${user.number}\nBot is OFF for this user. Send "BOT ON ${user.number}" to resume.`,
  );
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  deps: ToolDeps,
  user: UserState,
  outbox: Outbox,
): Promise<{ result: string; isError?: boolean }> {
  const { cfg, store, leads, calendar } = deps;
  try {
    switch (name) {
      case "show_menu": {
        outbox.menu = true;
        return { result: JSON.stringify({ ok: true, note: "Menu will be shown with your reply text as its body." }) };
      }

      case "get_free_slots": {
        if (!calendar) return { result: JSON.stringify({ ok: false, error: "calendar_not_configured", hint: "Offer human_handoff." }), isError: true };
        const slots = await calendar.getFreeSlots(3);
        store.update(user.number, { offeredSlots: slots, interest: user.interest || "Discovery call" });
        leads.append({ name: user.name, number: user.number, interest: user.interest || "Discovery call", slot: slots.map((s) => s.label).join(" | "), status: "slots_shown" });
        if (!slots.length) return { result: JSON.stringify({ ok: true, slots: [], hint: "No free slots; offer human_handoff." }) };
        return { result: JSON.stringify({ ok: true, slots: slots.map((s) => ({ start: s.start, label: s.label })) }) };
      }

      case "hold_and_book_slot": {
        if (!calendar) return { result: JSON.stringify({ ok: false, error: "calendar_not_configured" }), isError: true };
        const slotStart = String(input.slot_start || "");
        const bookName = String(input.name || "").trim().slice(0, 80);
        const email = input.email ? String(input.email).trim() : "";
        if (!bookName) return { result: JSON.stringify({ ok: false, error: "name_required" }), isError: true };
        if (email && !EMAIL_RE.test(email)) return { result: JSON.stringify({ ok: false, error: "invalid_email" }), isError: true };
        const slot = user.offeredSlots.find((s) => s.start === slotStart);
        if (!slot) return { result: JSON.stringify({ ok: false, error: "unknown_slot", hint: "Use an exact start from get_free_slots." }), isError: true };
        if (user.booked && Date.parse(user.booked.start) > Date.now())
          return { result: JSON.stringify({ ok: false, error: "already_booked", booked: user.booked.label, hint: "For changes, offer human_handoff." }) };

        // Re-check the slot is still free right before booking.
        if (!(await calendar.isFree(slot.start, slot.end))) {
          const fresh = await calendar.getFreeSlots(3);
          store.update(user.number, { offeredSlots: fresh });
          return { result: JSON.stringify({ ok: false, error: "slot_taken", new_slots: fresh.map((s) => ({ start: s.start, label: s.label })) }) };
        }
        const res = await calendar.book({ name: bookName, number: user.number, startIso: slot.start, email: email || undefined, interest: user.interest });
        store.update(user.number, {
          name: user.name || bookName,
          booked: { start: slot.start, label: slot.label, eventId: res.eventId, meetLink: res.meetLink },
          offeredSlots: [],
        });
        leads.append({ name: bookName, number: user.number, interest: user.interest || "Discovery call", slot: slot.label, status: "booked" });
        await deps.notifier.owner(
          `📅 Call booked\nName: ${bookName}\nNumber: +${user.number}\nSlot: ${slot.label}${email ? `\nEmail: ${email}` : ""}\nMeet: ${res.meetLink || "no link (add manually)"}`,
        );
        return {
          result: JSON.stringify({
            ok: true,
            slot: slot.label,
            meet_link: res.meetLink || null,
            invite_sent: res.inviteSent,
            notes: res.notes,
          }),
        };
      }

      case "send_upi_qr": {
        if (input.product !== "meta_ads_course_999") return { result: JSON.stringify({ ok: false, error: "only_course_999" }), isError: true };
        if (!cfg.upiId) return { result: JSON.stringify({ ok: false, error: "upi_not_configured", hint: "Offer human_handoff." }), isError: true };
        if (user.paid) return { result: JSON.stringify({ ok: false, error: "already_paid" }) };
        const amount = cfg.coursePrice;
        const note = `GZ Course ${user.number.slice(-4)}`;
        const link = buildUpiLink({ upiId: cfg.upiId, name: cfg.upiName, amount, note });
        const png = await renderQrPng(link);
        const mediaId = await deps.wa.uploadMedia(png, "image/png", "growzone-course-upi.png");
        outbox.image = {
          mediaId,
          caption:
            `*Meta Ads Course — ₹${amount}*\nUPI ID: ${cfg.upiId}\nScan karke pay karein (GPay/PhonePe/Paytm).\n` +
            `Payment ke baad screenshot ya 12-digit UTR yahin bhejein. Team verify karke confirm karegi.`,
        };
        store.update(user.number, { paymentPending: { amount, note, ts: new Date().toISOString() }, interest: "Course ₹999" });
        leads.append({ name: user.name, number: user.number, interest: "Course ₹999", slot: "", status: "payment_pending" });
        return { result: JSON.stringify({ ok: true, note: "QR will be sent as an image; your reply text is added to its caption. Do not repeat the UPI ID." }) };
      }

      case "human_handoff": {
        outbox.handoff = true;
        await doHandoff(deps, user, String(input.reason || "User asked for a human"));
        return { result: JSON.stringify({ ok: true, note: "Owner notified. Tell the user a team member will reply soon." }) };
      }

      default:
        return { result: JSON.stringify({ ok: false, error: "unknown_tool" }), isError: true };
    }
  } catch (e: any) {
    log.error("tool_failed", { tool: name, error: e });
    return { result: JSON.stringify({ ok: false, error: "tool_failed", hint: "Apologise briefly and offer human_handoff." }), isError: true };
  }
}
