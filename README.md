# GrowZone Media: WhatsApp AI Agent

Official **WhatsApp Cloud API** + **Claude API** pe bana WhatsApp bot. Ye kya karta hai:
- Customers ko Hinglish mein (ya English mein, agar woh English likhein) reply karta hai, `business.md` ke hisaab se.
- Interactive menu dikhata hai, Google Calendar se free 30-min call slots deta hai aur call book karta hai.
- ₹999 course ke liye UPI QR bhejta hai. Payment aap manually verify karte ho.
- "Human chahiye" bolne pe aapko alert karta hai aur us user ke liye chup ho jata hai.
- Leads ko `leads.jsonl` mein log karta hai, aur ek CSV export script bhi hai.

> ⚠️ **Tokens kabhi chat mein paste mat karna** (na Claude chat, na WhatsApp, na email). Saare tokens/keys **sirf Render ke Environment tab** mein daalo.

---

## 0. Zaroori warning: Relay wala number

Jo number abhi **Relay** pe chal raha hai, woh **is bot pe ek saath nahi chal sakta**. Ek WhatsApp number ek waqt pe sirf ek Cloud API app/provider se juda ho sakta hai. Is bot ke liye ek **naya number** lo, ya pehle Relay se number hatao.

---

## 1. Meta (WhatsApp Cloud API) setup

1. **Meta Business account** banao/verify karo: https://business.facebook.com
2. **Meta App banao**: https://developers.facebook.com/apps → *Create App* → type **Business** → apna Business account select karo.
3. App dashboard mein **WhatsApp** product add karo (*Add product → WhatsApp → Set up*).
4. **Number add karo** (*WhatsApp → API Setup → Add phone number*):
   - Ek **NAYA number** use karo jo WhatsApp app / WhatsApp Business app pe **active na ho**. Agar active hai to pehle us app se account delete karna padega.
   - Ya phir **coexistence** (same number WhatsApp Business app + API dono pe) kisi provider ke through karo. Ye har number/provider pe available nahi hota.
   - Display name approve hone do, OTP se number verify karo.
   - **Phone number ID** copy karo. Ye `WHATSAPP_PHONE_NUMBER_ID` hai (ye phone number nahi, ek lamba ID hota hai).
5. **Permanent token (System User)** banao:
   - Business Settings → *Users → System users* → **Add** → role **Admin**.
   - *Add assets* → apna App aur WhatsApp account (WABA) assign karo (full control).
   - **Generate new token** → App select karo → expiry **Never** → permissions:
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
   - Ye token `WHATSAPP_TOKEN` hai. Seedha Render env mein daalo, kahin aur save mat karo.
6. **App secret**: App dashboard → *App settings → Basic* → **App secret** → *Show*. Ye `WHATSAPP_APP_SECRET` hai (webhook signature check ke liye).
7. **Verify token**: koi bhi lamba random string bana lo (jaise password manager se 32 characters). Ye `WHATSAPP_VERIFY_TOKEN` hai.
8. Payment method add karo (WhatsApp Manager → Payment settings). Templates aur business-initiated messages ke liye ye zaroori hai.

---

## 2. Google Calendar (free slots + booking)

1. https://console.cloud.google.com → naya project banao.
2. *APIs & Services → Library* → **Google Calendar API** → **Enable**.
3. *IAM & Admin → Service Accounts* → **Create service account** (role ki zarurat nahi).
4. Service account → *Keys → Add key → JSON*. File download hogi.
5. Us JSON ko base64 mein convert karo (apne computer pe, chat mein nahi):
   - Mac/Linux: `base64 -i key.json | tr -d '\n'`
   - Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("key.json"))`
   - Output `GOOGLE_SERVICE_ACCOUNT_JSON` mein daalo. Phir JSON file delete kar do.
6. **Calendar share karo**: Google Calendar (digitalagency315@gmail.com wala) → *Settings → Settings for my calendars → apna calendar → Share with specific people* → service account ka email (`...@...iam.gserviceaccount.com`) add karo → permission **"Make changes to events"**.
7. `GOOGLE_CALENDAR_ID=digitalagency315@gmail.com`

**Note:** Normal Gmail ke saath service account aksar **Google Meet link nahi bana pata** aur **attendees ko invite nahi bhej pata** (iske liye Google Workspace + domain-wide delegation chahiye). Bot pehle Meet link + invite try karta hai. Fail ho to bina link ke event bana deta hai, user ko bata deta hai ki "team link alag se bhejegi", aur aapko alert mein "no link (add manually)" dikhega. Customer ka email (agar diya) event description mein hota hai.

Slots: agle **3 working days** (default Mon-Fri, `WORKING_DAYS` se badlo), **11:00-19:00 IST**, 30 min. Ye 3 slots offer karta hai aur book karne se pehle dobara check karta hai ki slot abhi bhi free hai.

---

## 3. Render pe deploy

1. Is folder (`whatsapp-agent/`) ko ek **private GitHub repo** mein push karo. `.env` push nahi hoga (`.gitignore` mein hai).
2. Render → **New → Blueprint** → repo select karo (`render.yaml` automatically read hoga).
   - Plan: **Starter (~$7/month) recommended**. Free plan 15 min idle ke baad **sleep** ho jata hai, isse webhooks late ya miss ho jaate hain.
   - `render.yaml` ek **1 GB disk** `/var/data` pe mount karta hai (store + leads deploy ke baad bhi bache rahte hain). Disk ke liye paid plan chahiye.
3. Render dashboard mein **Environment** tab mein ye values bharo (`.env.example` dekho):

| Variable | Kya hai |
|---|---|
| `WHATSAPP_TOKEN` | System user permanent token |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | Aapka random verify string |
| `WHATSAPP_APP_SECRET` | App secret |
| `WHATSAPP_ALERT_TEMPLATE` | (optional) owner alert ka approved utility template name |
| `OWNER_NUMBER` | Aapka personal number, country code ke saath, sirf digits (jaise `9198xxxxxxxx`). Bot wala number nahi. |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com se |
| `CLAUDE_MODEL` | default `claude-sonnet-5-5` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | base64 JSON |
| `GOOGLE_CALENDAR_ID` | `digitalagency315@gmail.com` |
| `UPI_ID`, `UPI_NAME` | jaise `growzone@okaxis`, `GrowZone Media` |
| `COURSE_ACCESS_MESSAGE` | (optional) "PAID" ke baad customer ko jaane wala message, jaise course link |
| `SMTP_*`, `ALERT_EMAIL_TO` | (optional) email alerts |

4. Deploy hone do. Check karo: `https://<your-app>.onrender.com/health` pe `{"ok":true}` aana chahiye.

### Webhook connect karo
1. Meta App → *WhatsApp → Configuration* → **Webhook → Edit**:
   - Callback URL: `https://<your-app>.onrender.com/webhook`
   - Verify token: wahi jo `WHATSAPP_VERIFY_TOKEN` mein hai
   - **Verify and save**
2. *Webhook fields* → **`messages`** ko **Subscribe** karo.
3. App ko **Live mode** mein daalo (App dashboard → publish). Privacy policy URL chahiye hoga.

---

## 4. Owner commands (sirf `OWNER_NUMBER` se bot number pe bhejo)

| Command | Kya hota hai |
|---|---|
| `PAID 919876543210` | Customer ko "Payment confirm ho gaya ✅" + `COURSE_ACCESS_MESSAGE` bhejta hai, lead `paid` mark karta hai |
| `BOT OFF 919876543210` | Us user ke liye bot chup (aap khud baat karo) |
| `BOT ON 919876543210` | Bot wapas on |
| `STATUS` | Contacts, handoff list, pending payments, upcoming calls |

Number 10 digit bhi chalega (`9876543210`), bot khud `91` laga deta hai.

**Payment flow:** customer "course" bole → bot UPI QR (₹999) bhejta hai → customer screenshot/UTR bhejta hai → bot aapko alert bhejta hai (screenshot bhi forward karta hai) → aap UPI app mein payment check karo → `PAID <number>` bhejo → bot customer ko confirm karta hai. **Payment auto-verify nahi hota.**

**Human handoff:** user "Talk to a human" chune ya bot unsure ho → aapko alert (naam, number, wa.me link) → bot us user ke liye chup. Aap apne phone se customer ko call/WhatsApp karo. Kaam ho jaye to `BOT ON <number>` bhejo.

### ⚠️ Owner alerts aur 24-hour rule
WhatsApp pe **free-form message sirf tab deliver hota hai jab saamne wale ne pichhle 24 ghante mein bot number ko message kiya ho**. Yaani agar aapne (owner ne) 24h se bot ko kuch nahi bheja, to aapke alerts **deliver nahi honge**.

Iske 2 fix hain:
1. **Recommended:** WhatsApp Manager mein ek **Utility template** banao aur approve karwao, jaise:
   - Name: `owner_alert`, Category: **Utility**, Language: English
   - Body: `GrowZone bot alert: {{1}}`
   - Phir `WHATSAPP_ALERT_TEMPLATE=owner_alert` set karo. Bot alerts isi template se bhejega (24h ke bahar bhi deliver hoga, per-message charge lagega).
2. Ya roz bot number ko `STATUS` bhej do (24h window khuli rahegi), aur saath mein SMTP email alerts on rakho.

---

## 5. Leads export

Leads `DATA_DIR/leads.jsonl` mein jaate hain (name, number, interest, slot, status, ts). CSV ke liye:
```bash
npm run export-leads              # data/leads.csv (saare events)
npm run export-leads -- --latest  # har number ki latest status
```
Render pe: service → **Shell** → `DATA_DIR=/var/data npm run export-leads -- --latest` → phir file download karo ya `cat /var/data/leads.csv`.

---

## 6. Local development aur tests

```bash
npm install
npm test          # mocked webhook + mocked fetch, koi real API call nahi
cp .env.example .env   # sirf local testing ke liye, real tokens commit mat karna
npm run dev       # node --env-file=.env
```
Tests ye cover karte hain: signature verify, GET verify handshake, dedupe, fast 200 ack + async processing, menu/interactive replies, owner commands (PAID / BOT OFF / BOT ON / STATUS, aur non-owner se command ignore), UPI link builder + QR PNG, booking re-check, tool-loop limit, Claude error fallback, log redaction.

---

## 7. Test checklist (deploy ke baad)

- [ ] `/health` pe `{"ok":true}` aata hai
- [ ] Meta webhook **Verify and save** successful hai, `messages` subscribed hai
- [ ] **Doosre number** se (owner wale se nahi) "Hi" bhejo → reply ya menu aata hai
- [ ] Menu se **WhatsApp API (Relay)** chuno → pricing sahi aati hai (₹1,500 / ₹2,999 / ₹4,999 / custom + Meta charges alag)
- [ ] "Funnel / coaches system ka price?" → bot price **nahi** batata, call offer karta hai
- [ ] "English please, what do you do?" → English mein reply aata hai
- [ ] **Book a free 30-min call** → 3 slots (IST, working days, 11-7) → naam do → Google Calendar mein "Discovery call: <name> x GrowZone Media" event banta hai, aapko alert aata hai
- [ ] **Course ₹999** → QR image aata hai → GPay/PhonePe se scan karne pe ₹999 aur sahi UPI naam dikhta hai (pay karna zaroori nahi)
- [ ] Screenshot bhejo → owner ko alert + screenshot → owner `PAID <number>` → customer ko confirmation
- [ ] **Talk to a human** → owner alert → bot chup → `BOT ON <number>` → bot wapas
- [ ] Owner se `STATUS` → summary
- [ ] Same message do baar aaye (Meta retry) → reply sirf ek baar jaata hai
- [ ] Render logs mein koi token nahi dikhta

---

## 8. Costs (approx, rates badalte rehte hain, official pages check karo)

- **Claude API**: per-use billing (input/output tokens). `CLAUDE_EFFORT=low` aur chhota system prompt cost kam rakhte hain. Anthropic console mein spend limit set karo.
- **Meta / WhatsApp**:
  - Customer ne message kiya, uske **24 ghante ke andar** aapke service replies **free** hain.
  - **Template messages** (jaise owner alert template, ya 24h ke baad customer ko message) **paid** hain, category ke hisaab se per-message charge lagta hai.
- **Render**: Starter **~$7/month recommended** (free tier sleep ho jata hai). 1 GB disk ka extra chhota charge.
- **Google Calendar API**: is usage pe free.

---

## 9. Safety rules jo code mein built-in hain

- Webhook POST pe `X-Hub-Signature-256` check hota hai (`WHATSAPP_APP_SECRET`). Galat signature pe 401.
- Message IDs dedupe hote hain (disk pe bhi save, restart ke baad bhi).
- Meta ko turant 200 milta hai, processing background mein hoti hai. Ek user ke messages order mein process hote hain.
- **Har user message pe max 1 reply.** Spam guard: ek user 1 minute mein 8 se zyada messages bheje to extra messages ignore.
- Har message pe Claude ke max **2 tool loops**. Uske baad menu + "Team jaldi reply karega".
- Claude API error ho to: menu + "Team jaldi reply karega".
- Bot sirf unhe reply karta hai jo pehle message karein. Koi broadcast feature nahi hai.
- Logs mein tokens/secrets redact hote hain, phone numbers masked hote hain.
- Prices sirf `business.md` se aate hain. Bot ko guarantees/ROI claims, medical/financial advice, aur password/OTP maangna mana hai.
- `CLAUDE_FALLBACKS=on`: agar model ka safety filter kisi message ko galti se decline kare, to API server-side fallback model pe retry karti hai. Off karna ho to `off` set karo.

## Files
```
src/index.ts      app start (env, wiring)
src/server.ts     express: GET/POST /webhook, /health, per-user queue
src/handler.ts    message flow: owner cmds, handoff, payment proof, Claude, ek reply
src/agent.ts      Claude tool-use loop (max 2 rounds)
src/tools.ts      show_menu, get_free_slots, hold_and_book_slot, send_upi_qr, human_handoff
src/prompt.ts     business.md se short system prompt
src/calendar.ts   Google Calendar free/busy + booking (Meet fallback)
src/whatsapp.ts   Cloud API v21.0: text, list, image, template, media upload/download
src/upi.ts        UPI link + QR PNG
src/owner.ts      PAID / BOT OFF / BOT ON / STATUS
src/store.ts      JSON store (history last 20, handoff, slots, payments, dedupe ids)
src/leads.ts      leads.jsonl + CSV
scripts/export-leads.ts
business.md       ← owner isko edit kare
```
