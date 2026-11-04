import crypto from "node:crypto";
import { google, calendar_v3 } from "googleapis";
import { log } from "./logger";
import type { Slot } from "./store";

const IST_OFFSET_MIN = 330; // Asia/Kolkata = UTC+05:30, no DST
const TZ = "Asia/Kolkata";
const DAY_START_H = 11;
const DAY_END_H = 19;
const SLOT_MIN = 30;
const MIN_LEAD_MIN = 120; // don't offer slots starting within 2 hours

export interface Busy {
  start: string;
  end: string;
}

export interface BookResult {
  eventId: string;
  meetLink?: string;
  inviteSent: boolean;
  notes: string[];
}

export interface CalendarService {
  getFreeSlots(count?: number): Promise<Slot[]>;
  isFree(startIso: string, endIso: string): Promise<boolean>;
  book(opts: { name: string; number: string; startIso: string; email?: string; interest?: string }): Promise<BookResult>;
}

/** ISO string in IST, e.g. 2026-11-05T11:00:00+05:30 */
export function toIstIso(d: Date): string {
  const ist = new Date(d.getTime() + IST_OFFSET_MIN * 60000);
  return ist.toISOString().slice(0, 19) + "+05:30";
}

export function istLabel(d: Date): string {
  return (
    new Intl.DateTimeFormat("en-IN", {
      timeZone: TZ,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d) + " IST"
  );
}

/** UTC Date for a given IST calendar day (y, m0, d) and IST hour/minute. */
function istDate(y: number, m0: number, d: number, h: number, min: number): Date {
  return new Date(Date.UTC(y, m0, d, h, min) - IST_OFFSET_MIN * 60000);
}

/** The next `days` working days (in IST), starting today. */
export function workingDayWindows(now: Date, workingDays: number[], days = 3): Array<{ start: Date; end: Date }> {
  const out: Array<{ start: Date; end: Date }> = [];
  const istNow = new Date(now.getTime() + IST_OFFSET_MIN * 60000);
  for (let i = 0; i < 21 && out.length < days; i++) {
    const day = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() + i));
    if (!workingDays.includes(day.getUTCDay())) continue;
    const start = istDate(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), DAY_START_H, 0);
    const end = istDate(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), DAY_END_H, 0);
    if (end.getTime() - now.getTime() < (MIN_LEAD_MIN + SLOT_MIN) * 60000) continue; // today already over
    out.push({ start, end });
  }
  return out;
}

function overlaps(aStart: number, aEnd: number, busy: Busy[]): boolean {
  return busy.some((b) => aStart < Date.parse(b.end) && aEnd > Date.parse(b.start));
}

/**
 * Pure slot picker: 30-min slots 11:00-19:00 IST on the next 3 working days,
 * minus busy blocks. Spreads picks across days (one per day first), returns `count`.
 */
export function computeFreeSlots(now: Date, busy: Busy[], workingDays: number[], count = 3): Slot[] {
  const perDay: Slot[][] = [];
  for (const w of workingDayWindows(now, workingDays, 3)) {
    const free: Slot[] = [];
    for (let t = w.start.getTime(); t + SLOT_MIN * 60000 <= w.end.getTime(); t += SLOT_MIN * 60000) {
      const end = t + SLOT_MIN * 60000;
      if (t < now.getTime() + MIN_LEAD_MIN * 60000) continue;
      if (overlaps(t, end, busy)) continue;
      free.push({ start: toIstIso(new Date(t)), end: toIstIso(new Date(end)), label: istLabel(new Date(t)) });
    }
    perDay.push(free);
  }
  const picked: Slot[] = [];
  for (let round = 0; picked.length < count && perDay.some((d) => d.length > round); round++) {
    for (const day of perDay) {
      // first round: earliest free slot per day; later rounds spread later in the day
      const idx = Math.min(day.length - 1, round * Math.max(1, Math.floor(day.length / 3)));
      const s = day[idx];
      if (s && !picked.some((p) => p.start === s.start) && picked.length < count) picked.push(s);
    }
  }
  return picked.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

export class GoogleCalendar implements CalendarService {
  private cal: calendar_v3.Calendar;

  constructor(serviceAccountJsonB64: string, private calendarId: string, private workingDays: number[]) {
    const creds = JSON.parse(Buffer.from(serviceAccountJsonB64, "base64").toString("utf8"));
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    this.cal = google.calendar({ version: "v3", auth });
  }

  private async busy(timeMin: Date, timeMax: Date): Promise<Busy[]> {
    const res = await this.cal.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        timeZone: TZ,
        items: [{ id: this.calendarId }],
      },
    });
    const c = res.data.calendars?.[this.calendarId];
    if (c?.errors?.length) throw new Error("freebusy error: " + c.errors.map((e) => e.reason).join(","));
    return (c?.busy || []).map((b) => ({ start: b.start || "", end: b.end || "" }));
  }

  async getFreeSlots(count = 3): Promise<Slot[]> {
    const now = new Date();
    const windows = workingDayWindows(now, this.workingDays, 3);
    if (!windows.length) return [];
    const busy = await this.busy(windows[0].start, windows[windows.length - 1].end);
    return computeFreeSlots(now, busy, this.workingDays, count);
  }

  async isFree(startIso: string, endIso: string): Promise<boolean> {
    const busy = await this.busy(new Date(startIso), new Date(endIso));
    return !overlaps(Date.parse(startIso), Date.parse(endIso), busy);
  }

  async book(opts: { name: string; number: string; startIso: string; email?: string; interest?: string }): Promise<BookResult> {
    const start = new Date(opts.startIso);
    const end = new Date(start.getTime() + SLOT_MIN * 60000);
    const notes: string[] = [];
    const description = [
      `WhatsApp: +${opts.number}`,
      opts.email ? `Email: ${opts.email}` : "",
      opts.interest ? `Interest: ${opts.interest}` : "",
      "Booked by GrowZone WhatsApp bot.",
    ]
      .filter(Boolean)
      .join("\n");

    const base: calendar_v3.Schema$Event = {
      summary: `Discovery call: ${opts.name || "+" + opts.number} x GrowZone Media`,
      description,
      start: { dateTime: toIstIso(start), timeZone: TZ },
      end: { dateTime: toIstIso(end), timeZone: TZ },
      reminders: { useDefault: true },
    };

    // Service accounts often can't create Meet links or invite attendees (needs Workspace +
    // domain-wide delegation). Try the richest version first, then degrade gracefully.
    const attempts: Array<{ meet: boolean; attendee: boolean }> = [
      { meet: true, attendee: !!opts.email },
      { meet: false, attendee: !!opts.email },
      { meet: false, attendee: false },
    ].filter((a, i, arr) => arr.findIndex((b) => b.meet === a.meet && b.attendee === a.attendee) === i);

    let lastErr: unknown;
    for (const a of attempts) {
      try {
        const requestBody: calendar_v3.Schema$Event = { ...base };
        if (a.attendee && opts.email) requestBody.attendees = [{ email: opts.email }];
        if (a.meet) {
          requestBody.conferenceData = {
            createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } },
          };
        }
        const res = await this.cal.events.insert({
          calendarId: this.calendarId,
          conferenceDataVersion: a.meet ? 1 : 0,
          sendUpdates: a.attendee ? "all" : "none",
          requestBody,
        });
        const meetLink =
          res.data.hangoutLink ||
          res.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ||
          undefined;
        if (!meetLink) notes.push("Meet link auto-create nahi hua; team call link alag se bhejegi.");
        if (opts.email && !a.attendee) notes.push("Calendar invite email auto nahi gaya; team invite manually bhejegi.");
        return { eventId: res.data.id || "", meetLink, inviteSent: a.attendee, notes };
      } catch (e: any) {
        lastErr = e;
        log.warn("calendar_insert_retry", { meet: a.meet, attendee: a.attendee, message: e?.message });
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("calendar insert failed");
  }
}
