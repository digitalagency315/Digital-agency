import QRCode from "qrcode";

export interface UpiParams {
  upiId: string; // pa
  name: string; // pn
  amount: number; // am
  note: string; // tn
}

const UPI_ID_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/;

/** Build a standard UPI deep link: upi://pay?pa=..&pn=..&am=..&cu=INR&tn=.. */
export function buildUpiLink(p: UpiParams): string {
  if (!UPI_ID_RE.test(p.upiId)) throw new Error("Invalid UPI_ID");
  if (!Number.isFinite(p.amount) || p.amount <= 0) throw new Error("Invalid amount");
  const enc = (s: string) => encodeURIComponent(s.trim());
  const note = p.note.trim().slice(0, 50);
  return (
    "upi://pay?pa=" + enc(p.upiId) +
    "&pn=" + enc(p.name || "GrowZone Media") +
    "&am=" + p.amount.toFixed(2) +
    "&cu=INR" +
    "&tn=" + enc(note)
  );
}

export async function renderQrPng(link: string): Promise<Buffer> {
  return QRCode.toBuffer(link, { type: "png", width: 600, margin: 2, errorCorrectionLevel: "M" });
}
