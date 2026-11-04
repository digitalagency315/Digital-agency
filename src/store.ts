import fs from "node:fs";
import path from "node:path";
import { log } from "./logger";

export const MAX_HISTORY = 20; // last ~20 turns (user + assistant messages)
const MAX_PROCESSED_IDS = 5000;

export interface Turn {
  role: "user" | "assistant";
  text: string;
  ts: string;
}

export interface Slot {
  start: string; // ISO with +05:30
  end: string;
  label: string; // human friendly, IST
}

export interface UserState {
  number: string;
  name: string;
  history: Turn[];
  handoff: boolean;
  interest: string;
  offeredSlots: Slot[];
  booked: { start: string; label: string; eventId: string; meetLink?: string } | null;
  paymentPending: { amount: number; note: string; ts: string } | null;
  paid: boolean;
  createdAt: string;
  lastInboundAt: string;
}

interface StoreData {
  users: Record<string, UserState>;
  processedIds: string[];
}

/**
 * Small JSON-file store. Writes are atomic (tmp + rename) and debounced.
 * Good for a single Render instance. Mount a persistent disk at DATA_DIR so it survives deploys.
 */
export class Store {
  private data: StoreData = { users: {}, processedIds: [] };
  private file: string;
  private timer: NodeJS.Timeout | null = null;
  private processedSet = new Set<string>();

  constructor(private dir: string, private persist = true) {
    this.file = path.join(dir, "store.json");
    if (persist) this.load();
  }

  private load(): void {
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      if (fs.existsSync(this.file)) {
        const parsed = JSON.parse(fs.readFileSync(this.file, "utf8")) as StoreData;
        this.data = { users: parsed.users || {}, processedIds: parsed.processedIds || [] };
      }
    } catch (e) {
      log.error("store_load_failed", { error: e });
    }
    this.processedSet = new Set(this.data.processedIds);
  }

  save(): void {
    if (!this.persist) return;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, 200);
  }

  flush(): void {
    if (!this.persist) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      const tmp = this.file + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(this.data));
      fs.renameSync(tmp, this.file);
    } catch (e) {
      log.error("store_save_failed", { error: e });
    }
  }

  /** Returns true if this message id was seen before; otherwise records it. */
  seen(messageId: string): boolean {
    if (this.processedSet.has(messageId)) return true;
    this.processedSet.add(messageId);
    this.data.processedIds.push(messageId);
    if (this.data.processedIds.length > MAX_PROCESSED_IDS) {
      const drop = this.data.processedIds.splice(0, this.data.processedIds.length - MAX_PROCESSED_IDS);
      for (const id of drop) this.processedSet.delete(id);
    }
    this.save();
    return false;
  }

  getUser(number: string): UserState | undefined {
    return this.data.users[number];
  }

  ensureUser(number: string, name = ""): { user: UserState; isNew: boolean } {
    let user = this.data.users[number];
    const isNew = !user;
    if (!user) {
      const now = new Date().toISOString();
      user = {
        number,
        name: name || "",
        history: [],
        handoff: false,
        interest: "",
        offeredSlots: [],
        booked: null,
        paymentPending: null,
        paid: false,
        createdAt: now,
        lastInboundAt: now,
      };
      this.data.users[number] = user;
    }
    if (name && !user.name) user.name = name;
    this.save();
    return { user, isNew };
  }

  update(number: string, patch: Partial<UserState>): UserState | undefined {
    const u = this.data.users[number];
    if (!u) return undefined;
    Object.assign(u, patch);
    this.save();
    return u;
  }

  addTurn(number: string, role: Turn["role"], text: string): void {
    const u = this.data.users[number];
    if (!u || !text) return;
    u.history.push({ role, text: text.slice(0, 4000), ts: new Date().toISOString() });
    if (u.history.length > MAX_HISTORY) u.history = u.history.slice(-MAX_HISTORY);
    this.save();
  }

  allUsers(): UserState[] {
    return Object.values(this.data.users);
  }
}
