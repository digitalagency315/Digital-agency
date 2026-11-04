import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOwnerCommand } from "../src/owner";
import { CUSTOMER, OWNER, fakeLLM, mockFetch, startTestApp, textReply, webhookPayload } from "./helpers";

test("parseOwnerCommand understands PAID / BOT OFF / BOT ON / STATUS", () => {
  assert.deepEqual(parseOwnerCommand("PAID 919876543210"), { cmd: "PAID", number: "919876543210" });
  assert.deepEqual(parseOwnerCommand("paid +91 98765-43210"), { cmd: "PAID", number: "919876543210" });
  assert.deepEqual(parseOwnerCommand("PAID 9876543210"), { cmd: "PAID", number: "919876543210" });
  assert.deepEqual(parseOwnerCommand("BOT OFF 919876543210"), { cmd: "BOT_OFF", number: "919876543210" });
  assert.deepEqual(parseOwnerCommand("bot   on 919876543210"), { cmd: "BOT_ON", number: "919876543210" });
  assert.deepEqual(parseOwnerCommand(" status "), { cmd: "STATUS" });
  assert.equal(parseOwnerCommand("PAID"), null);
  assert.equal(parseOwnerCommand("PAID abc"), null);
  assert.equal(parseOwnerCommand("hello"), null);
});

async function setup() {
  const fx = mockFetch();
  const llm = fakeLLM([textReply("Namaste!")]);
  const t = await startTestApp({ llm });
  // customer messages first (bot only talks to people who message first)
  await t.postWebhook(webhookPayload(CUSTOMER, { type: "text", text: { body: "hi" } }, "Priya"));
  await t.idle();
  return { fx, llm, t };
}

const owner = (text: string) => webhookPayload(OWNER, { type: "text", text: { body: text } }, "Owner");

test("BOT OFF then BOT ON from owner toggles handoff", async () => {
  const { fx, llm, t } = await setup();
  try {
    await t.postWebhook(owner(`BOT OFF ${CUSTOMER}`));
    await t.idle();
    assert.equal(t.store.getUser(CUSTOMER)?.handoff, true);
    assert.match(fx.messages().at(-1)!.body.text.body, /Bot OFF/);
    assert.equal(fx.messages().at(-1)!.body.to, OWNER);

    // customer is ignored while bot is off
    const before = fx.messages().length;
    await t.postWebhook(webhookPayload(CUSTOMER, { type: "text", text: { body: "anyone?" } }));
    await t.idle();
    assert.equal(fx.messages().length, before);
    assert.equal(llm.calls.length, 1);

    await t.postWebhook(owner(`BOT ON ${CUSTOMER}`));
    await t.idle();
    assert.equal(t.store.getUser(CUSTOMER)?.handoff, false);
    assert.match(fx.messages().at(-1)!.body.text.body, /Bot ON/);
  } finally {
    fx.restore();
    await t.close();
  }
});

test("PAID <number> confirms to the customer and to the owner", async () => {
  const { fx, t } = await setup();
  try {
    t.store.update(CUSTOMER, { paymentPending: { amount: 999, note: "x", ts: new Date().toISOString() } });
    await t.postWebhook(owner(`PAID ${CUSTOMER}`));
    await t.idle();
    const u = t.store.getUser(CUSTOMER)!;
    assert.equal(u.paid, true);
    assert.equal(u.paymentPending, null);
    const msgs = fx.messages().slice(-2);
    assert.equal(msgs[0].body.to, CUSTOMER);
    assert.match(msgs[0].body.text.body, /Payment confirm/);
    assert.equal(msgs[1].body.to, OWNER);
  } finally {
    fx.restore();
    await t.close();
  }
});

test("STATUS returns a summary; unknown number is refused", async () => {
  const { fx, t } = await setup();
  try {
    await t.postWebhook(owner("STATUS"));
    await t.idle();
    assert.match(fx.messages().at(-1)!.body.text.body, /Total contacts: 1/);
    await t.postWebhook(owner("PAID 911111111111"));
    await t.idle();
    assert.match(fx.messages().at(-1)!.body.text.body, /message nahi kiya/);
  } finally {
    fx.restore();
    await t.close();
  }
});

test("owner commands from a non-owner number are NOT executed", async () => {
  const { fx, llm, t } = await setup();
  try {
    llm.calls.length = 0;
    (llm as any).create = async (p: any) => {
      llm.calls.push(p);
      return textReply("Main aapki kaise madad kar sakta hoon?");
    };
    await t.postWebhook(webhookPayload(CUSTOMER, { type: "text", text: { body: `BOT OFF ${CUSTOMER}` } }));
    await t.postWebhook(webhookPayload(CUSTOMER, { type: "text", text: { body: `PAID ${CUSTOMER}` } }));
    await t.idle();
    const u = t.store.getUser(CUSTOMER)!;
    assert.equal(u.handoff, false);
    assert.equal(u.paid, false);
    assert.equal(llm.calls.length, 2); // treated as normal chat
  } finally {
    fx.restore();
    await t.close();
  }
});
