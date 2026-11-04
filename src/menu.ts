import type { ListRow } from "./whatsapp";

export const MENU_ROWS: ListRow[] = [
  { id: "menu_meta_ads", title: "Meta ads help", description: "Facebook/Instagram ads management" },
  { id: "menu_relay", title: "WhatsApp API (Relay)", description: "WhatsApp Business API plans" },
  { id: "menu_course", title: "Course ₹999", description: "Meta Ads course" },
  { id: "menu_call", title: "Book a free 30-min call", description: "Discovery call with the team" },
  { id: "menu_human", title: "Talk to a human", description: "Team member se baat karein" },
];

export const MENU_BUTTON = "Menu dekhein";
export const MENU_SECTION = "GrowZone Media";
export const DEFAULT_MENU_BODY = "Namaste! 👋 GrowZone Media mein swagat hai. Aap kis cheez mein help chahte hain? Neeche menu se choose karein.";
export const FALLBACK_TEXT = "Sorry, abhi thodi technical dikkat hai. Team jaldi reply karega 🙏 Tab tak neeche menu se option choose kar sakte hain.";

export function menuTitle(id: string): string | undefined {
  return MENU_ROWS.find((r) => r.id === id)?.title;
}
