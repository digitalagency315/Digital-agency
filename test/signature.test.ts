import { test } from "node:test";
import assert from "node:assert/strict";
import { signBody, verifySignature } from "../src/signature";
import { mockFetch, startTestApp, webhookPayload, CUSTOMER, textReply, fakeLLM, realFetch } from "./helpers";

const SECRET = "app-secret-abc";

test("verifySignature accepts a correct sha256 HMAC", () => {
  const body = Buffer.from('{"hello":"world"}');
  assert.equal(verifySignature(body, signBody(body, SECRET), SECRET), true);
});

test("verifySignature rejects wrong secret, tampered body, bad format, missing header", () => {
  const body = Buffer.from('{"hello":"world"}');
  const sig = signBody(body, SECRET);
  assert.equal(verifySignature(body, signBody(body, "other"), SECRET), false);
  assert.equal(verifySignature(Buffer.from('{"hello":"w0rld"}'), sig, SECRET), false);
  assert.equal(verifySignature(body, "sha1=abcd", SECRET), false);
  assert.equal(verifySignature(body, "sha256=nothex", SECRET), false);
  assert.equal(verifySignature(body, undefined, SECRET), false);
  assert.equal(verifySignature(body, sig, ""), false);
});

test("POST /webhook with a bad signature gets 401 and nothing is processed", async () => {
  const fx = mockFetch();
  const t = await startTestApp({ llm: fakeLLM([textReply("hi")]) });
  try {
    const res = await t.postWebhook(webhookPayload(CUSTOMER, { type: "text", text: { body: "hi" } }), "sha256=" + "0".repeat(64));
    assert.equal(res.status, 401);
    await t.idle();
    assert.equal(fx.messages().length, 0);
  } finally {
    fx.restore();
    await t.close();
  }
});

test("GET /webhook verification handshake", async () => {
  const t = await startTestApp();
  try {
    const ok = await realFetch(`${t.base}/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345`);
    assert.equal(ok.status, 200);
    assert.equal(await ok.text(), "12345");
    const bad = await realFetch(`${t.base}/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345`);
    assert.equal(bad.status, 403);
  } finally {
    await t.close();
  }
});
