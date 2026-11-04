import fs from "node:fs";
import type { UserState } from "./store";
import { istLabel } from "./calendar";

let cache: { file: string; mtime: number; text: string } | null = null;

/** Reads business.md (re-read automatically when the owner edits it). */
export function readBusiness(file: string): string {
  try {
    const st = fs.statSync(file);
    if (cache && cache.file === file && cache.mtime === st.mtimeMs) return cache.text;
    const text = fs.readFileSync(file, "utf8").trim();
    cache = { file, mtime: st.mtimeMs, text };
    return text;
  } catch {
    return "GrowZone Media, India. Digital marketing agency.";
  }
}

const CORE = `You are the WhatsApp assistant of GrowZone Media. Follow the business notes below exactly.
Style: short WhatsApp replies (max ~4 short lines), friendly, Hinglish in Roman script; reply in English if the user writes in English. No markdown headings or tables; *bold* sparingly.
Tools: show_menu for options; get_free_slots then hold_and_book_slot to book a free 30-min call (ask their name first; email is optional, only if they want an invite); send_upi_qr only for the ₹999 course; human_handoff when the user asks for a person, is upset, or you are unsure.
Never state a price or fact that is not in the notes. Never promise results. Never ask for passwords or OTPs.`;

export function buildSystemPrompt(businessFile: string, user: UserState, now = new Date()): string {
  const ctx: string[] = [`Now: ${istLabel(now)}.`];
  if (user.name) ctx.push(`User's WhatsApp name: ${user.name}.`);
  if (user.offeredSlots.length)
    ctx.push(
      "Slots last offered (use the exact start value when booking): " +
        user.offeredSlots.map((s, i) => `${i + 1}) ${s.label} [start=${s.start}]`).join("; "),
    );
  if (user.booked) ctx.push(`Already booked: ${user.booked.label}.`);
  if (user.paymentPending) ctx.push("Course payment QR already sent; waiting for screenshot/UTR.");
  if (user.paid) ctx.push("User has paid for the course (confirmed by owner).");

  return `${CORE}\n\n<business_notes>\n${readBusiness(businessFile)}\n</business_notes>\n\n<context>\n${ctx.join("\n")}\n</context>`;
}
