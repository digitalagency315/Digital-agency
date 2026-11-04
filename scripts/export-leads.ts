/**
 * Export leads.jsonl to CSV.
 *   npm run export-leads                 -> data/leads.csv (every event)
 *   npm run export-leads -- --latest     -> one row per number (latest status)
 *   npm run export-leads -- --out x.csv  -> custom output path
 */
import fs from "node:fs";
import path from "node:path";
import { leadsToCsv, readLeads } from "../src/leads";

const args = process.argv.slice(2);
const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), "data");
const input = path.join(dataDir, "leads.jsonl");
const outIdx = args.indexOf("--out");
const out = outIdx >= 0 && args[outIdx + 1] ? args[outIdx + 1] : path.join(dataDir, "leads.csv");
const latest = args.includes("--latest");

const events = readLeads(input);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, leadsToCsv(events, latest));
console.log(`Exported ${events.length} lead events${latest ? " (latest per number)" : ""} -> ${out}`);
