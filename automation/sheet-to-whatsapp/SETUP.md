# Google Sheet → WhatsApp (nayi lead ko turant message)

Sheet me nayi lead aate hi usko WhatsApp pe message chala jayega.
Sab free hai (Google Apps Script + Meta WhatsApp Cloud API).
Meta sirf har message ka chhota charge leta hai.

## Kya chahiye
1. Leads wali Google Sheet. Pehli row me headings: `Name`, `Phone`.
2. Meta WhatsApp Business account (developers.facebook.com → WhatsApp).
3. Ek **approved template** (jaise `lead_welcome`).
   Example text: `Hi {{1}}, thanks for your interest! Hum jaldi aapse baat karenge.`

> Note: Naye customer ko pehla message sirf **approved template** se hi ja sakta hai. Yeh WhatsApp ka rule hai.

## Step 1 — Meta se 2 cheezein lo
WhatsApp → API Setup page pe:
- **Phone number ID** (lamba number, ID hai, phone number nahi)
- **Permanent access token** (Business Settings → System Users → Generate token, permission: `whatsapp_business_messaging`)

## Step 2 — Code sheet me daalo
1. Sheet kholo → **Extensions → Apps Script**.
2. Jo code hai, sab hata do. `Code.gs` ka pura code paste karo.
3. Upar `CONFIG` me check karo: tab ka naam, column naam, template naam, language.
4. **Save** (Ctrl+S).

## Step 3 — Token safe jagah rakho
Apps Script me left side ⚙️ **Project Settings → Script Properties → Add**:
- `WA_TOKEN` = aapka token
- `WA_PHONE_ID` = Phone number ID

(Token code me kabhi mat likhna.)

## Step 4 — Chalu karo
1. Sheet reload karo. Upar **WhatsApp Leads** menu aayega.
2. **WhatsApp Leads → 1) Setup** dabao. Google permission maangega → Allow.
3. **Test: mere number pe bhejo** → apna number daalo → WhatsApp check karo.

Bas. Ab har nayi lead ko message apne aap jayega ✅

## Kaise kaam karta hai
- Form se lead aaye → turant.
- Haath se / kisi tool se row add ho → turant ya 1 minute ke andar.
- `WA Status` column me `SENT` ya `ERROR` likh jata hai. Isliye kisi ko 2 baar message nahi jata.
- Purani leads ko message nahi bhejna? Unke `WA Status` me pehle hi `OLD` likh do.

## Band karna ho
**WhatsApp Leads → Automation band karo.**

## Common problems
| Error | Fix |
|---|---|
| `Template name does not exist` | Template naam / language CONFIG me sahi likho |
| `Invalid OAuth access token` | Token expire. Naya permanent token Script Properties me daalo |
| `phone number galat hai` | Number me 10 digit (ya country code ke saath) hona chahiye |
| `Recipient not in allowed list` | Test number ho to Meta me recipient add karo, ya apna real number verify karo |
