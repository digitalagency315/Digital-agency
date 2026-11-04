import { log, maskNumber } from "./logger";

export interface ListRow {
  id: string;
  title: string; // max 24 chars
  description?: string; // max 72 chars
}

const GRAPH = "https://graph.facebook.com";

export class WhatsAppError extends Error {
  constructor(message: string, public status: number, public code?: number) {
    super(message);
  }
}

/** Thin client over the WhatsApp Cloud API. Uses global fetch (so tests can mock it). */
export class WhatsApp {
  constructor(
    private token: string,
    private phoneNumberId: string,
    private version = "v21.0",
  ) {}

  private get base(): string {
    return `${GRAPH}/${this.version}/${this.phoneNumberId}`;
  }

  private async post(url: string, body: unknown, attempt = 1): Promise<any> {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = json?.error || {};
      if (res.status >= 500 && attempt < 2) {
        await new Promise((r) => setTimeout(r, 800));
        return this.post(url, body, attempt + 1);
      }
      log.warn("whatsapp_send_failed", { status: res.status, code: err.code, message: err.message });
      throw new WhatsAppError(err.message || `Graph API ${res.status}`, res.status, err.code);
    }
    return json;
  }

  async sendText(to: string, body: string): Promise<any> {
    log.info("wa_send_text", { to: maskNumber(to) });
    return this.post(`${this.base}/messages`, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: body.slice(0, 4096), preview_url: false },
    });
  }

  async sendList(
    to: string,
    opts: { header?: string; body: string; footer?: string; button: string; sectionTitle: string; rows: ListRow[] },
  ): Promise<any> {
    log.info("wa_send_list", { to: maskNumber(to) });
    return this.post(`${this.base}/messages`, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        ...(opts.header ? { header: { type: "text", text: opts.header.slice(0, 60) } } : {}),
        body: { text: opts.body.slice(0, 1024) },
        ...(opts.footer ? { footer: { text: opts.footer.slice(0, 60) } } : {}),
        action: {
          button: opts.button.slice(0, 20),
          sections: [
            {
              title: opts.sectionTitle.slice(0, 24),
              rows: opts.rows.slice(0, 10).map((r) => ({
                id: r.id.slice(0, 200),
                title: r.title.slice(0, 24),
                ...(r.description ? { description: r.description.slice(0, 72) } : {}),
              })),
            },
          ],
        },
      },
    });
  }

  async sendImageById(to: string, mediaId: string, caption: string): Promise<any> {
    log.info("wa_send_image", { to: maskNumber(to) });
    return this.post(`${this.base}/messages`, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "image",
      image: { id: mediaId, caption: caption.slice(0, 1024) },
    });
  }

  /** Approved template message, e.g. a utility alert for the owner (works outside the 24h window). */
  async sendTemplate(to: string, name: string, lang: string, bodyParams: string[]): Promise<any> {
    log.info("wa_send_template", { to: maskNumber(to), name });
    return this.post(`${this.base}/messages`, {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name,
        language: { code: lang },
        components: bodyParams.length
          ? [{ type: "body", parameters: bodyParams.map((t) => ({ type: "text", text: t.slice(0, 1000) })) }]
          : [],
      },
    });
  }

  /** Upload media (PNG etc.) via POST /{PHONE_NUMBER_ID}/media. Returns the media id. */
  async uploadMedia(data: Buffer, mimeType: string, filename: string): Promise<string> {
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", mimeType);
    form.append("file", new Blob([new Uint8Array(data)], { type: mimeType }), filename);
    const res = await fetch(`${this.base}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json.id) {
      log.warn("whatsapp_upload_failed", { status: res.status, message: json?.error?.message });
      throw new WhatsAppError(json?.error?.message || `Media upload ${res.status}`, res.status);
    }
    return String(json.id);
  }

  /** Download an incoming media file (e.g. payment screenshot). */
  async downloadMedia(mediaId: string): Promise<{ data: Buffer; mimeType: string }> {
    const metaRes = await fetch(`${GRAPH}/${this.version}/${encodeURIComponent(mediaId)}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    const meta: any = await metaRes.json().catch(() => ({}));
    if (!metaRes.ok || !meta.url) throw new WhatsAppError("Media lookup failed", metaRes.status);
    const fileRes = await fetch(meta.url, { headers: { Authorization: `Bearer ${this.token}` } });
    if (!fileRes.ok) throw new WhatsAppError("Media download failed", fileRes.status);
    return { data: Buffer.from(await fileRes.arrayBuffer()), mimeType: meta.mime_type || "image/jpeg" };
  }

  /** Mark the inbound message as read (blue ticks). Best effort. */
  async markRead(messageId: string): Promise<void> {
    try {
      await this.post(`${this.base}/messages`, {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      });
    } catch {
      /* ignore */
    }
  }
}
