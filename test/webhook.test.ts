import { test } from "node:test";
import assert from "node:assert/strict";
import { CUSTOMER, fakeLLM, mockFetch, startTestApp, textReply, toolReply, webhookPayload } from "./helpers";
import { MAX_TOOL_ROUNDS } from "../src/agent";

test("dedupe: same message id delivered twice is processed once", async () => {
  const fx = mockFetch();
  const llm = fakeLLM([textReply("Namaste Rahul!"), textReply("should not be used")]);
  const t = await startTestApp({ llm });
  try {
    const payload = webhookPayload(CUSTOMER, { id: "wamid.DUP1", type: "text", text: { body: "hello" } });
    const r1 = await t.postWebhook(payload);
    const r2 = await t.postWebhook(payload);
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    await t.idle();
    assert.equal(llm.calls.length, 1);
    const msgs = fx.messages();
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].body.to, CUSTOMER);
    assert.equal(msgs[0].body.text.body, "Namaste Rahul!");
    assert.ok(msgs[0].url.startsWith("https://graph.facebook.com/v21.0/1234567890/messages"));
  } finally {
    fx.restore();
    await t.close();
  }
});

test("acks 200 before processing finishes (async)", async () => {
  const fx = mockFetch();
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const llm = fakeLLM([async () => { await gate; return textReply("late reply"); }]);
  const t = await startTestApp({ llm });
  try {
    const res = await t.postWebhook(webhookPayload(CUSTOMER, { type: "text", text: { body: "hi" } }));
    assert.equal(res.status, 200);
    assert.equal(fx.messages().length, 0); // not replied yet
    release();
    await t.idle();
    assert.equal(fx.messages().length, 1);
  } finally {
    fx.restore();
    await t.close();
  }
});

test("show_menu tool -> exactly one interactive list reply", async () => {
  const fx = mockFetch();
  const llm = fakeLLM([toolReply("show_menu"), textReply("Aap kis cheez mein help chahte hain?")]);
  const t = await startTestApp({ llm });
  try {
    await t.postWebhook(webhookPayload(CUSTOMER, { type: "text", text: { body: "hi" } }));
    await t.idle();
    const msgs = fx.messages();
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].body.type, "interactive");
    assert.equal(msgs[0].body.interactive.type, "list");
    const rows = msgs[0].body.interactive.action.sections[0].rows;
    assert.deepEqual(rows.map((r: any) => r.id), ["menu_meta_ads", "menu_relay", "menu_course", "menu_call", "menu_human"]);
    for (const r of rows) assert.ok(r.title.length <= 24);
    // the tool_result was sent back to Claude
    assert.equal(llm.calls[1].messages.at(-1).content[0].type, "tool_result");
  } finally {
    fx.restore();
    await t.close();
  }
});

test("interactive list reply is passed to Claude as the menu choice", async () => {
  const fx = mockFetch();
  const llm = fakeLLM([textReply("Relay plans ₹1,500/month se start hote hain.")]);
  const t = await startTestApp({ llm });
  try {
    await t.postWebhook(webhookPayload(CUSTOMER, { type: "interactive", interactive: { type: "list_reply", list_reply: { id: "menu_relay", title: "WhatsApp API (Relay)" } } }));
    await t.idle();
    const lastUser = llm.calls[0].messages.at(-1);
    assert.equal(lastUser.role, "user");
    assert.match(lastUser.content, /WhatsApp API \(Relay\)/);
    assert.equal(fx.messages().length, 1);
  } finally {
    fx.restore();
    await t.close();
  }
});

test("'Talk to a human' button -> handoff, owner notified, bot silent afterwards", async () => {
  const fx = mockFetch();
  const llm = fakeLLM([]);
  const t = await startTestApp({ llm });
  try {
    await t.postWebhook(webhookPayload(CUSTOMER, { type: "interactive", interactive: { type: "button_reply", button_reply: { id: "menu_human", title: "Talk to a human" } } }));
    await t.idle();
    assert.equal(t.store.getUser(CUSTOMER)?.handoff, true);
    assert.equal(t.notifier.sent.length, 1);
    assert.match(t.notifier.sent[0], /Human handoff/);
    assert.equal(fx.messages().length, 1);
    // next message: silence, no Claude call
    await t.postWebhook(webhookPayload(CUSTOMER, { type: "text", text: { body: "hello?" } }));
    await t.idle();
    assert.equal(fx.messages().length, 1);
    assert.equal(llm.calls.length, 0);
  } finally {
    fx.restore();
    await t.close();
  }
});

test("Claude API error -> menu + 'Team jaldi reply karega'", async () => {
  const fx = mockFetch();
  const llm = fakeLLM([new Error("529 overloaded")]);
  const t = await startTestApp({ llm });
  try {
    await t.postWebhook(webhookPayload(CUSTOMER, { type: "text", text: { body: "price?" } }));
    await t.idle();
    const msgs = fx.messages();
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].body.type, "interactive");
    assert.match(msgs[0].body.interactive.body.text, /Team jaldi reply karega/);
  } finally {
    fx.restore();
    await t.close();
  }
});

test(`max ${MAX_TOOL_ROUNDS} tool loops, then fallback (still one reply)`, async () => {
  const fx = mockFetch();
  const llm = fakeLLM([toolReply("show_menu"), toolReply("show_menu"), toolReply("show_menu"), textReply("never")]);
  const t = await startTestApp({ llm });
  try {
    await t.postWebhook(webhookPayload(CUSTOMER, { type: "text", text: { body: "loop" } }));
    await t.idle();
    assert.equal(llm.calls.length, MAX_TOOL_ROUNDS + 1);
    const msgs = fx.messages();
    assert.equal(msgs.length, 1);
    assert.match(msgs[0].body.interactive.body.text, /Team jaldi reply karega/);
  } finally {
    fx.restore();
    await t.close();
  }
});

test("send_upi_qr uploads a PNG and sends one image with caption; screenshot is forwarded to owner", async () => {
  const fx = mockFetch();
  const llm = fakeLLM([toolReply("send_upi_qr", { product: "meta_ads_course_999" }), textReply("Ye raha QR 👇")]);
  const t = await startTestApp({ llm });
  try {
    await t.postWebhook(webhookPayload(CUSTOMER, { type: "text", text: { body: "course lena hai" } }));
    await t.idle();
    const upload = fx.calls.find((c) => c.url.endsWith("/1234567890/media"));
    assert.ok(upload, "media upload called");
    const msgs = fx.messages();
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].body.type, "image");
    assert.equal(msgs[0].body.image.id, "media-123");
    assert.match(msgs[0].body.image.caption, /₹999/);
    assert.ok(t.store.getUser(CUSTOMER)?.paymentPending);

    // customer sends UTR -> owner alerted, no Claude call
    await t.postWebhook(webhookPayload(CUSTOMER, { type: "text", text: { body: "UTR 412345678901" } }));
    await t.idle();
    assert.equal(llm.calls.length, 2);
    assert.match(t.notifier.sent.at(-1)!, new RegExp(`PAID ${CUSTOMER}`));
  } finally {
    fx.restore();
    await t.close();
  }
});

test("status-only webhooks (delivery receipts) are ignored", async () => {
  const fx = mockFetch();
  const t = await startTestApp();
  try {
    const res = await t.postWebhook({
      object: "whatsapp_business_account",
      entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: "1234567890" }, statuses: [{ id: "x", status: "delivered" }] } }] }],
    });
    assert.equal(res.status, 200);
    await t.idle();
    assert.equal(fx.calls.length, 0);
  } finally {
    fx.restore();
    await t.close();
  }
});
