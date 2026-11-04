import type { Config } from "./config";
import { log } from "./logger";
import type { WhatsApp } from "./whatsapp";

export interface Notifier {
  owner(text: string): Promise<void>;
}

/**
 * Owner alerts.
 * 1) If WHATSAPP_ALERT_TEMPLATE is set, send that approved utility template (delivers anytime).
 * 2) Otherwise (or if the template fails) send free-form text: only delivers if the owner
 *    messaged the bot number within the last 24h.
 * 3) Also email via SMTP when SMTP_* + ALERT_EMAIL_TO are set.
 */
export class OwnerNotifier implements Notifier {
  constructor(private cfg: Config, private wa: WhatsApp) {}

  async owner(text: string): Promise<void> {
    await Promise.allSettled([this.whatsapp(text), this.email(text)]);
  }

  private async whatsapp(text: string): Promise<void> {
    if (!this.cfg.ownerNumber) return;
    if (this.cfg.alertTemplateName) {
      try {
        // Template params can't contain newlines / >4 spaces in a row.
        const flat = text.replace(/\s*\n+\s*/g, " | ").replace(/\s{4,}/g, "   ");
        await this.wa.sendTemplate(this.cfg.ownerNumber, this.cfg.alertTemplateName, this.cfg.alertTemplateLang, [flat]);
        return;
      } catch (e) {
        log.warn("owner_template_failed", { error: e });
      }
    }
    try {
      await this.wa.sendText(this.cfg.ownerNumber, text);
    } catch (e) {
      log.warn("owner_alert_failed_24h_window_maybe_closed", { error: e });
    }
  }

  private async email(text: string): Promise<void> {
    const c = this.cfg;
    if (!c.smtpHost || !c.alertEmailTo || !c.smtpFrom) return;
    try {
      const nodemailer = await import("nodemailer");
      const transport = nodemailer.createTransport({
        host: c.smtpHost,
        port: c.smtpPort,
        secure: c.smtpPort === 465,
        auth: c.smtpUser ? { user: c.smtpUser, pass: c.smtpPass } : undefined,
      });
      await transport.sendMail({
        from: c.smtpFrom,
        to: c.alertEmailTo,
        subject: "GrowZone WhatsApp bot alert",
        text,
      });
    } catch (e) {
      log.warn("owner_email_failed", { error: e });
    }
  }
}
