import fs from "node:fs";
import path from "node:path";
import { log } from "./logger";

export type LeadStatus =
  | "new"
  | "slots_shown"
  | "booked"
  | "payment_pending"
  | "payment_proof"
  | "paid"
  | "handoff"
  | "bot_on";

export interface LeadEvent {
  ts: string;
  name: string;
  number: string;
  interest: string;
  slot: string;
  status: LeadStatus;
}

/** Append-only JSON Lines lead log (one event per line). */
export class LeadLog {
  readonly file: string;
  constructor(dir: string, private enabled = true) {
    this.file = path.join(dir, "leads.jsonl");
  }

  append(e: Omit<LeadEvent, "ts"> & { ts?: string }): void {
    if (!this.enabled) return;
    const row: LeadEvent = {
      ts: e.ts || new Date().toISOString(),
      name: e.name || "",
      number: e.number,
      interest: e.interest || "",
      slot: e.slot || "",
      status: e.status,
    };
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.appendFileSync(this.file, JSON.stringify(row) + "\n");
    } catch (err) {
      log.error("lead_log_failed", { error: err });
    }
  }
}

export function readLeads(file: string): LeadEvent[] {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      try {
        return JSON.parse(l) as LeadEvent;
      } catch {
        return null;
      }
    })
    .filter((x): x is LeadEvent => !!x);
}

function csvCell(v: string): string {
  let s = String(v ?? "");
  // Neutralise spreadsheet formula injection
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** CSV with one row per event, or (latestOnly) the latest event per number. */
export function leadsToCsv(events: LeadEvent[], latestOnly = false): string {
  let rows = events;
  if (latestOnly) {
    const byNum = new Map<string, LeadEvent>();
    for (const e of events) {
      const prev = byNum.get(e.number);
      byNum.set(e.number, {
        ...e,
        name: e.name || prev?.name || "",
        interest: e.interest || prev?.interest || "",
        slot: e.slot || prev?.slot || "",
      });
    }
    rows = [...byNum.values()];
  }
  const header = ["ts", "name", "number", "interest", "slot", "status"];
  const lines = [header.join(",")];
  for (const r of rows) lines.push([r.ts, r.name, r.number, r.interest, r.slot, r.status].map(csvCell).join(","));
  return lines.join("\n") + "\n";
}
