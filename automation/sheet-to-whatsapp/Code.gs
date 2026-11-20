/**
 * Google Sheet -> WhatsApp (instant lead message)
 *
 * Jaise hi sheet me nayi lead aati hai, yeh script us lead ko
 * WhatsApp Cloud API (Meta) se ek approved template message bhejti hai,
 * aur sheet me "WA Status" column me SENT / ERROR likh deti hai
 * (taaki kisi ko 2 baar message na jaye).
 *
 * Secrets (token, phone number id) code me NAHI hain.
 * Woh Project Settings -> Script Properties me rakhe jaate hain:
 *   WA_TOKEN         = Meta WhatsApp permanent access token
 *   WA_PHONE_ID      = WhatsApp "Phone number ID" (number nahi, ID)
 */

// ====== SETTINGS (yahan apne hisaab se badlo) ======
const CONFIG = {
  // MODE:
  //  'LINK' = API ki zarurat nahi. Har nayi lead ke aage "WA Link" ban jata hai.
  //           Click karo -> phone/laptop ka WhatsApp khulega, message ready -> Send dabao.
  //  'API'  = Bilkul automatic (Meta WhatsApp Cloud API + approved template chahiye).
  MODE: 'LINK',
  LINK_HEADER: 'WA Link',
  // LINK mode ka message. {name} ki jagah lead ka naam aayega.
  MESSAGE_TEXT: 'Hi {name}, thanks for your interest! Aapki trading requirement ke baare me baat karne ke liye kab free ho?',
  SHEET_NAME: 'Sheet1',          // leads wali tab ka naam
  NAME_HEADER: 'full_name',      // naam wale column ka heading (Meta lead form)
  PHONE_HEADER: 'phone_number',  // phone wale column ka heading (format: p:+971...)
  STATUS_HEADER: 'WA Status',    // script khud bana degi agar nahi hai
  DEFAULT_COUNTRY_CODE: '91',    // sirf tab lagega jab number me + / country code na ho aur 10 digit ho
  TEMPLATE_NAME: 'lead_welcome', // Meta me approved template ka naam
  TEMPLATE_LANG: 'en',           // template ki language code (jaise en, hi, en_US)
  TEMPLATE_USES_NAME: true,      // template me {{1}} = lead ka naam ho to true
  API_VERSION: 'v21.0',
  MAX_PER_RUN: 50,               // ek baar me max kitne message
};
// ===================================================

/** Sheet kholte hi upar "WhatsApp Leads" menu aata hai. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('WhatsApp Leads')
    .addItem('1) Setup (ek baar chalao)', 'setup')
    .addItem('2) Abhi nayi leads ko bhejo', 'processNewLeads')
    .addItem('Test: mere number pe bhejo', 'testSendToMe')
    .addItem('Automation band karo', 'removeTriggers')
    .addToUi();
}

/** Ek baar chalao: triggers lagata hai + settings check karta hai. */
function setup() {
  if (CONFIG.MODE === 'API') checkSecrets_();
  removeTriggers();
  const ss = SpreadsheetApp.getActive();

  // 1) Form se lead aaye to turant
  ScriptApp.newTrigger('processNewLeads').forSpreadsheet(ss).onFormSubmit().create();
  // 2) Koi row add/badle to turant
  ScriptApp.newTrigger('processNewLeads').forSpreadsheet(ss).onChange().create();
  // 3) Backup: har 1 minute check (Meta/Zapier/API se aayi leads ke liye)
  ScriptApp.newTrigger('processNewLeads').timeBased().everyMinutes(1).create();

  if (CONFIG.MODE === 'API') {
    // API mode me purani leads ko apne aap message na chala jaye
    const marked = markExistingAsOld_();
    toast_('Setup ho gaya ✅ ' + marked + ' purani leads OLD mark ki. Ab sirf nayi leads ko WhatsApp jayega.');
  } else {
    // LINK mode me kuch apne aap nahi jaata, isliye sab leads ke link bana do
    processNewLeads();
    toast_('Setup ho gaya ✅ Har lead ke aage "📲 Send" link ban gaya. Click karo aur Send dabao.');
  }
}

/** Saare triggers hata deta hai (automation band). */
function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'processNewLeads') ScriptApp.deleteTrigger(t);
  });
}

/** Main kaam: jin rows ka status khaali hai, unko message bhejo. */
function processNewLeads() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return; // dusra run chal raha hai, double send nahi hoga
  try {
    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    const headers = getHeaders_(sheet);
    const nameCol = findCol_(headers, CONFIG.NAME_HEADER);
    const phoneCol = findCol_(headers, CONFIG.PHONE_HEADER);
    if (phoneCol < 0) throw new Error('"' + CONFIG.PHONE_HEADER + '" column nahi mila.');
    const statusCol = getStatusCol_(sheet); // 1-based

    const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    let sent = 0;

    for (let i = 0; i < data.length && sent < CONFIG.MAX_PER_RUN; i++) {
      const row = data[i];
      const status = String(row[statusCol - 1] || '').trim();
      const rawPhone = String(row[phoneCol] || '').trim();
      if (status || !rawPhone) continue;

      const rowNum = i + 2;
      const statusCell = sheet.getRange(rowNum, statusCol);
      const phone = normalizePhone_(rawPhone);
      if (!phone) {
        statusCell.setValue('ERROR: phone number galat hai');
        continue;
      }

      const name = nameCol >= 0 ? cleanName_(row[nameCol]) : '';

      if (CONFIG.MODE !== 'API') {
        const text = CONFIG.MESSAGE_TEXT.replace(/\{name\}/g, name || 'there');
        const url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text);
        sheet.getRange(rowNum, getCol_(sheet, CONFIG.LINK_HEADER))
          .setFormula('=HYPERLINK("' + url.replace(/"/g, '""') + '","📲 Send")');
        statusCell.setValue('LINK READY');
        continue;
      }

      statusCell.setValue('SENDING...');
      SpreadsheetApp.flush();

      const result = sendTemplate_(phone, name || 'there');
      statusCell.setValue(result.ok
        ? 'SENT ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy HH:mm')
        : 'ERROR: ' + result.error);
      sent++;
    }
  } finally {
    lock.releaseLock();
  }
}

/** Test: apne number pe ek message bhejo. */
function testSendToMe() {
  checkSecrets_();
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('Test', 'Apna WhatsApp number likho (jaise 9876543210):', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const phone = normalizePhone_(res.getResponseText());
  if (!phone) return ui.alert('Number galat hai.');
  const r = sendTemplate_(phone, 'Test');
  ui.alert(r.ok ? 'Message chala gaya ✅ WhatsApp check karo.' : 'Error: ' + r.error);
}

// ---------------- helpers ----------------

function sendTemplate_(phone, name) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('WA_TOKEN');
  const phoneId = props.getProperty('WA_PHONE_ID');

  const template = { name: CONFIG.TEMPLATE_NAME, language: { code: CONFIG.TEMPLATE_LANG } };
  if (CONFIG.TEMPLATE_USES_NAME) {
    template.components = [{ type: 'body', parameters: [{ type: 'text', text: name }] }];
  }

  const resp = UrlFetchApp.fetch(
    'https://graph.facebook.com/' + CONFIG.API_VERSION + '/' + phoneId + '/messages',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: template,
      }),
      muteHttpExceptions: true,
    }
  );

  const code = resp.getResponseCode();
  if (code >= 200 && code < 300) return { ok: true };
  let msg = 'HTTP ' + code;
  try {
    const body = JSON.parse(resp.getContentText());
    if (body.error && body.error.message) msg = body.error.message;
  } catch (e) { /* ignore */ }
  return { ok: false, error: msg.slice(0, 200) };
}

/** "p:+971541714813" -> "971541714813". Galat number -> "" */
function normalizePhone_(raw) {
  const s = String(raw).replace(/^p:/i, '').trim();
  const hasCountryCode = /^(\+|00)/.test(s);
  let d = s.replace(/\D/g, '');
  if (s.indexOf('00') === 0) d = d.slice(2);
  if (!hasCountryCode) {
    d = d.replace(/^0+/, '');
    if (d.length === 10) d = CONFIG.DEFAULT_COUNTRY_CODE + d;
  }
  if (d.length < 11 || d.length > 15) return '';
  if (/^(\d)\1+$/.test(d.slice(-9))) return ''; // 888888888 jaise fake number
  return d;
}

/** Fancy font naam ("𝑇𝑎𝑟𝑎𝑛𝑝𝑟𝑒𝑒𝑡 𝑆𝑖𝑛𝑔ℎ") ko normal karke sirf first name. */
function cleanName_(raw) {
  const plain = String(raw || '').normalize('NFKC')
    .replace(/[^\p{L}\s.'-]/gu, ' ').replace(/\s+/g, ' ').trim();
  const first = (plain.split(' ')[0] || '').replace(/[.'-]/g, '');
  if (first.length < 3) return ''; // "S.B." jaise initials -> "there"
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** Setup ke time jo leads pehle se hain unko OLD mark karo, taaki unko message na jaye. */
function markExistingAsOld_() {
  const sheet = getSheet_();
  const statusCol = getStatusCol_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const range = sheet.getRange(2, statusCol, lastRow - 1, 1);
  const vals = range.getValues();
  let n = 0;
  vals.forEach(function (r) { if (!String(r[0]).trim()) { r[0] = 'OLD'; n++; } });
  range.setValues(vals);
  return n;
}

function getSheet_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('"' + CONFIG.SHEET_NAME + '" naam ki tab nahi mili.');
  return sheet;
}

function getHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0]
    .map(function (h) { return String(h).trim().toLowerCase(); });
}

function findCol_(headers, name) {
  return headers.indexOf(String(name).trim().toLowerCase()); // 0-based, -1 = nahi mila
}

/** Status column dhoondo, na ho to aakhir me bana do. Returns 1-based index. */
function getStatusCol_(sheet) {
  return getCol_(sheet, CONFIG.STATUS_HEADER);
}

/** Koi bhi column heading se dhoondo, na ho to aakhir me bana do. Returns 1-based. */
function getCol_(sheet, header) {
  const headers = getHeaders_(sheet);
  const idx = findCol_(headers, header);
  if (idx >= 0) return idx + 1;
  const col = sheet.getLastColumn() + 1;
  sheet.getRange(1, col).setValue(header);
  return col;
}

function checkSecrets_() {
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('WA_TOKEN') || !p.getProperty('WA_PHONE_ID')) {
    throw new Error('Script Properties me WA_TOKEN aur WA_PHONE_ID daalo (SETUP.md dekho).');
  }
}

function toast_(msg) {
  try { SpreadsheetApp.getActive().toast(msg, 'WhatsApp Leads', 8); } catch (e) { /* ignore */ }
}
