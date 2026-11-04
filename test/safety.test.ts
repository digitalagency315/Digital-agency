import { test } from "node:test";
import assert from "node:assert/strict";
import { redact, registerSecrets } from "../src/logger";
import type { CalendarService } from "../src/calendar";
import { CUSTOMER, fakeLLM, mockFetch, startTestApp, textReply, toolReply, webhookPayload } from "./helpers";

test("logger redacts secret keys and secret values", () => {
  registerSecrets(["EAAG-super-secret-token"]);
  const out = redact({ access_token: "abc", nested: { msg: "failed with EAAG-super-secret-token", Authorization: "Bearer x" }, url: "https://x?access_token=zzz" }) as any;
  assert.equal(out.access_token, "[REDACTED]");
  assert.equal(out.nested.Authorization, "[REDACTED]");
  assert.equal(out.nested.msg, "failed with [REDACTED]");
  assert.equal(out.url, "https://x?access_token=[REDACTED]");
  registerSecrets([]);
});

function fakeCalendar(freeOnRecheck: boolean): CalendarService & { booked: any[] } {
  const slot = { start: "2026-11-09T11:00:00+05:30", end: "2026-11-09T11:30:00+05:30", label: "Mon, 9 Nov, 11:00 am IST" };
  const other = { start: "2026-11-09T12:00:00+05:30", end: "2026-11-09T12:30:00+05:30", label: "Mon, 9 Nov, 12:00 pm IST" };
  return {
    booked: [],
    async getFreeSlots() {
      return freeOnRecheck ? [slot] : [other];
    },
    async isFree() {
      return freeOnRecheck;
    },
    async book(opts) {
      this.booked.push(opts);
      return { eventId: "evt1", meetLink: undefined, inviteSent: false, notes: ["Meet link auto-create nahi hua"] };
    },
  };
}

test("booking flow: get_free_slots then hold_and_book_slot re-checks and books", async () => {
  const fx = mockFetch();
  const cal = fakeCalendar(true);
  const llm = fakeLLM([
    toolReply("get_free_slots"),
    textReply("Ye slots free hain: Mon 11 AM. Kaunsa chalega? Aur aapka naam?"),
    toolReply("hold_and_book_slot", { slot_start: "2026-11-09T11:00:00+05:30", name: "Rahul" }),
    textReply("Done! Call book ho gaya ✅"),
  ]);
  const t = await startTestApp({ llm, calendar: cal });
  try {
    await t.postWebhook(webhookPayload(CUSTOMER, { type: "text", text: { body: "call book karna hai" } }));
    await t.idle();
    assert.equal(t.store.getUser(CUSTOMER)!.offeredSlots.length, 1);
    await t.postWebhook(webhookPayload(CUSTOMER, { type: "text", text: { body: "Mon 11 theek hai, Rahul" } }));
    await t.idle();
    assert.equal(cal.booked.length, 1);
    assert.equal(t.store.getUser(CUSTOMER)!.booked?.eventId, "evt1");
    assert.match(t.notifier.sent.at(-1)!, /Call booked/);
    assert.equal(fx.messages().length, 2); // one reply per user message
    // the system prompt carried the offered slot for the second turn
    assert.match(llm.calls[2].system, /start=2026-11-09T11:00:00\+05:30/);
  } finally {
    fx.restore();
    await t.close();
  }
});

test("booking refuses a slot that is no longer free and offers new ones", async () => {
  const fx = mockFetch();
  const cal = fakeCalendar(false);
  const llm = fakeLLM([
    toolReply("get_free_slots"),
    toolReply("hold_and_book_slot", { slot_start: "2026-11-09T12:00:00+05:30", name: "Rahul" }),
    (p: any) => {
      const last = p.messages.at(-1).content[0];
      assert.match(last.content, /slot_taken/);
      return textReply("Ye slot abhi book ho gaya, naya slot choose karein.");
    },
  ]);
  const t = await startTestApp({ llm, calendar: cal });
  try {
    await t.postWebhook(webhookPayload(CUSTOMER, { type: "text", text: { body: "call" } }));
    await t.idle();
    assert.equal(cal.booked.length, 0);
    assert.equal(fx.messages().length, 1);
  } finally {
    fx.restore();
    await t.close();
  }
});
