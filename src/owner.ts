import { normalizeNumber } from "./config";
import { log, maskNumber } from "./logger";
import type { ToolDeps } from "./tools";

export type OwnerCommand =
  | { cmd: "PAID" | "BOT_OFF" | "BOT_ON"; number: string }
  | { cmd: "STATUS" };

/** Parse an owner command. Returns null for anything else. */
export function parseOwnerCommand(text: string): OwnerCommand | null {
  const t = (text || "").trim();
  if (/^status$/i.test(t)) return { cmd: "STATUS" };
  const m = t.match(/^(paid|bot\s+off|bot\s+on)\s+(\+?[\d][\d\s-]{8,18})$/i);
  if (!m) return null;
  const number = normalizeNumber(m[2]);
  if (number.length < 10 || number.length > 15) return null;
  const word = m[1].toUpperCase().replace(/\s+/g, "_") as "PAID" | "BOT_OFF" | "BOT_ON";
  return { cmd: word, number };
}

export const OWNER_HELP =
  'Owner commands:\n• PAID <number> – payment confirm karke customer ko batao\n• BOT OFF <number> – bot ko us user ke liye chup karao\n• BOT ON <number> – bot wapas on\n• STATUS – summary';

/** Execute an owner command and return the reply text for the owner. */
export async function runOwnerCommand(cmd: OwnerCommand, deps: ToolDeps, courseAccessMessage = ""): Promise<string> {
  const { store, leads, wa } = deps;

  if (cmd.cmd === "STATUS") {
    const users = store.allUsers();
    const handoff = users.filter((u) => u.handoff);
    const pending = users.filter((u) => u.paymentPending && !u.paid);
    const upcoming = users.filter((u) => u.booked && Date.parse(u.booked.start) > Date.now());
    const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
    const newToday = users.filter((u) => new Date(Date.parse(u.createdAt) + 330 * 60000).toISOString().slice(0, 10) === today);
    const list = (arr: typeof users) => arr.slice(0, 10).map((u) => `+${u.number}${u.name ? ` (${u.name})` : ""}`).join(", ") || "-";
    return [
      "📊 STATUS",
      `Total contacts: ${users.length} (new today: ${newToday.length})`,
      `Human handoff (bot off): ${handoff.length} → ${list(handoff)}`,
      `Payment pending: ${pending.length} → ${list(pending)}`,
      `Upcoming calls: ${upcoming.length}${upcoming.length ? " → " + upcoming.slice(0, 10).map((u) => `${u.booked!.label} +${u.number}`).join(", ") : ""}`,
    ].join("\n");
  }

  const user = store.getUser(cmd.number);
  if (!user) return `+${cmd.number} ne abhi tak bot ko message nahi kiya. (Bot sirf unhe reply karta hai jo pehle message karein.)`;

  if (cmd.cmd === "BOT_OFF") {
    store.update(cmd.number, { handoff: true });
    leads.append({ name: user.name, number: user.number, interest: user.interest, slot: "", status: "handoff" });
    return `✅ Bot OFF for +${cmd.number}. Ab aap khud reply karein. Wapas on: BOT ON ${cmd.number}`;
  }

  if (cmd.cmd === "BOT_ON") {
    store.update(cmd.number, { handoff: false });
    leads.append({ name: user.name, number: user.number, interest: user.interest, slot: "", status: "bot_on" });
    return `✅ Bot ON for +${cmd.number}.`;
  }

  // PAID
  store.update(cmd.number, { paid: true, paymentPending: null });
  leads.append({ name: user.name, number: user.number, interest: user.interest || "Course ₹999", slot: "", status: "paid" });
  const msg =
    `Payment confirm ho gaya ✅ Thank you${user.name ? " " + user.name : ""}!\n` +
    (courseAccessMessage || "Meta Ads Course ka access aapko jaldi share kiya jayega.");
  try {
    await wa.sendText(cmd.number, msg);
    return `✅ +${cmd.number} ko payment confirmation bhej diya.`;
  } catch (e) {
    log.warn("paid_confirm_send_failed", { to: maskNumber(cmd.number), error: e });
    return `⚠️ Paid mark ho gaya, lekin +${cmd.number} ko message deliver nahi hua (shayad 24h window band hai). Template ya call se confirm karein.`;
  }
}
