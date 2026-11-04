import { test } from "node:test";
import assert from "node:assert/strict";
import { buildUpiLink, renderQrPng } from "../src/upi";

test("buildUpiLink builds a standard UPI deep link", () => {
  const link = buildUpiLink({ upiId: "growzone@okaxis", name: "GrowZone Media", amount: 999, note: "GZ Course 3210" });
  assert.equal(link, "upi://pay?pa=growzone%40okaxis&pn=GrowZone%20Media&am=999.00&cu=INR&tn=GZ%20Course%203210");
  const u = new URL(link);
  assert.equal(u.protocol, "upi:");
  assert.equal(u.searchParams.get("pa"), "growzone@okaxis");
  assert.equal(u.searchParams.get("pn"), "GrowZone Media");
  assert.equal(u.searchParams.get("am"), "999.00");
  assert.equal(u.searchParams.get("cu"), "INR");
  assert.equal(u.searchParams.get("tn"), "GZ Course 3210");
});

test("buildUpiLink escapes special characters and rejects bad input", () => {
  const link = buildUpiLink({ upiId: "a.b-c@ybl", name: "A & B", amount: 1.5, note: "x&am=1" });
  assert.match(link, /pn=A%20%26%20B/);
  assert.match(link, /am=1\.50/);
  assert.match(link, /tn=x%26am%3D1$/);
  assert.throws(() => buildUpiLink({ upiId: "not-a-upi", name: "x", amount: 999, note: "" }));
  assert.throws(() => buildUpiLink({ upiId: "a@ybl", name: "x", amount: 0, note: "" }));
  assert.throws(() => buildUpiLink({ upiId: "a@ybl", name: "x", amount: NaN, note: "" }));
});

test("renderQrPng returns a PNG buffer", async () => {
  const png = await renderQrPng("upi://pay?pa=a@ybl&pn=x&am=999.00&cu=INR&tn=t");
  assert.deepEqual([...png.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
});
