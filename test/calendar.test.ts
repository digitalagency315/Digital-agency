import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFreeSlots, toIstIso } from "../src/calendar";
import { leadsToCsv } from "../src/leads";

test("computeFreeSlots: 3 slots, 11:00-19:00 IST, working days only, skips busy", () => {
  // Fri 6 Nov 2026, 09:00 IST
  const now = new Date("2026-11-06T03:30:00Z");
  const busy = [{ start: "2026-11-06T11:00:00+05:30", end: "2026-11-06T12:00:00+05:30" }];
  const slots = computeFreeSlots(now, busy, [1, 2, 3, 4, 5], 3);
  assert.equal(slots.length, 3);
  assert.equal(slots[0].start, "2026-11-06T12:00:00+05:30"); // busy 11-12 skipped
  assert.equal(slots[1].start, "2026-11-09T11:00:00+05:30"); // Monday (weekend skipped)
  assert.equal(slots[2].start, "2026-11-10T11:00:00+05:30");
  for (const s of slots) {
    const h = Number(s.start.slice(11, 13));
    assert.ok(h >= 11 && h < 19);
    assert.equal(Date.parse(s.end) - Date.parse(s.start), 30 * 60000);
  }
});

test("toIstIso formats with +05:30", () => {
  assert.equal(toIstIso(new Date("2026-11-06T05:30:00Z")), "2026-11-06T11:00:00+05:30");
});

test("leadsToCsv escapes and can collapse to latest per number", () => {
  const csv = leadsToCsv(
    [
      { ts: "t1", name: "A, B", number: "91", interest: "Course", slot: "", status: "new" },
      { ts: "t2", name: "", number: "91", interest: "", slot: "Thu 11 AM", status: "booked" },
      { ts: "t3", name: "=cmd()", number: "92", interest: "", slot: "", status: "new" },
    ],
    true,
  );
  const lines = csv.trim().split("\n");
  assert.equal(lines[0], "ts,name,number,interest,slot,status");
  assert.equal(lines[1], 't2,"A, B",91,Course,Thu 11 AM,booked');
  assert.equal(lines[2], "t3,'=cmd(),92,,,new");
});
