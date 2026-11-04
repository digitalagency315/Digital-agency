import crypto from "node:crypto";

/**
 * Verify Meta's X-Hub-Signature-256 header ("sha256=<hex>") against the raw request body.
 * Uses a constant-time comparison.
 */
export function verifySignature(rawBody: Buffer, header: string | undefined, appSecret: string): boolean {
  if (!header || !appSecret || !rawBody) return false;
  const [algo, sig] = header.split("=");
  if (algo !== "sha256" || !sig || !/^[a-f0-9]{64}$/i.test(sig)) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest();
  const given = Buffer.from(sig, "hex");
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(given, expected);
}

export function signBody(rawBody: Buffer | string, appSecret: string): string {
  return "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
}
