// Kleiner Node-Server für das Portfolio (ohne Zusatzpakete)
// - liefert die statische Seite aus ../portfolio aus
// - GET /api/news: Top-Schlagzeilen über die World News API (1 Stunde zwischengespeichert)
// - POST /api/newsletter: Newsletter-Anmeldung, wird in Supabase gespeichert
// - POST /api/contact: Kontaktformular, wird geprüft und an den n8n-Webhook weitergeleitet
// - GET /api/motivation: "Motivation des Tages" über die OpenAI Responses API
//   Der API-Key bleibt hier auf dem Server und landet nie im Browser.
//
// Start:  node server/server.mjs   →  http://localhost:5500

import http from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(here, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const PORT = Number(process.env.PORT) || 5500;
const WEB_ROOT = path.resolve(here, "..", "portfolio");
const CACHE_FILE = path.join(here, "cache.json");
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/* ---------- Wetter (gleiche Logik wie im Frontend, nur grob) ---------- */
async function fetchWeather() {
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=51.2277&longitude=6.7735" +
    "&current=temperature_2m,is_day,precipitation,weather_code,wind_speed_10m" +
    "&daily=sunshine_duration&timezone=Europe%2FBerlin&forecast_days=1";
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const { current: c, daily } = await res.json();

  const code = c.weather_code;
  let mood = "neutral";
  if (code >= 95) mood = "gewitter";
  else if ((code >= 71 && code <= 77) || code === 85 || code === 86) mood = "schnee";
  else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || c.precipitation > 0) mood = "regen";
  else if (code === 45 || code === 48) mood = "nebel";
  else if (c.wind_speed_10m >= 39) mood = "sturm";
  else if (c.temperature_2m >= 28) mood = "hitze";
  else if (c.temperature_2m <= 0) mood = "frost";
  else if (code <= 1 && c.is_day) mood = "sonne";

  return {
    mood,
    temp: Math.round(c.temperature_2m),
    wind: Math.round(c.wind_speed_10m),
    sunHours: Math.round((daily.sunshine_duration[0] / 3600) * 10) / 10,
  };
}

/* ---------- OpenAI ---------- */
async function askOpenAI(weather, date) {
  const body = {
    model: OPENAI_MODEL,
    instructions:
      "Du schreibst die 'Motivation des Tages' für die Portfolio-Website von Jakow Smirin, " +
      "AI Consultant und CEO des STARTPLATZ AI HUB in Düsseldorf. " +
      "Schreibe genau einen motivierenden Satz auf Deutsch, höchstens 160 Zeichen, mit klarem Tech-Bezug " +
      "(z. B. KI, Code, Automatisierung, Daten, Deployments, Prompts). Duze die Lesenden. " +
      "Beziehe das Wetter nur ein, wenn es auffällig ist (Regen, Gewitter, Schnee, Sturm, Nebel, Hitze, Frost, viel Sonne); " +
      "bei unauffälligem Wetter lass es weg. Kein Zitat einer bekannten Person, keine Emojis, keine Anführungszeichen.",
    input: `Datum: ${date}. Wetter in Düsseldorf: ${weather.mood}, ${weather.temp} °C, Wind ${weather.wind} km/h, ${weather.sunHours} h Sonne heute.`,
    text: {
      format: {
        type: "json_schema",
        name: "motivation",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            text: { type: "string", description: "Der Motivationssatz" },
            weather_related: { type: "boolean", description: "true, wenn der Satz das Wetter aufgreift" },
          },
          required: ["text", "weather_related"],
        },
      },
    },
  };

  const res = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${data.error?.message || "unbekannter Fehler"}`);

  // Text aus der Antwort holen (output → message → content → output_text)
  const raw = (data.output || [])
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === "output_text")
    .map((part) => part.text)
    .join("");
  const parsed = JSON.parse(raw);
  if (!parsed.text) throw new Error("Leere Antwort von OpenAI");
  return parsed;
}

/* ---------- Cache: höchstens ein Aufruf pro Tag und Wetterlage ---------- */
async function readCache() {
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf8"));
  } catch {
    return {};
  }
}

const pending = new Map(); // verhindert parallele Doppel-Anfragen

async function motivation() {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error("Kein OPENAI_API_KEY in server/.env eingetragen");
    err.status = 503;
    throw err;
  }
  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }); // YYYY-MM-DD
  const weather = await fetchWeather().catch(() => ({ mood: "neutral", temp: null, wind: null, sunHours: null }));
  const key = `${date}:${weather.mood}`;

  const cache = await readCache();
  if (cache[key]) return { ...cache[key], cached: true };

  if (!pending.has(key)) {
    pending.set(
      key,
      (async () => {
        const result = await askOpenAI(weather, date);
        const entry = { text: result.text, weatherRelated: result.weather_related, mood: weather.mood, date };
        const fresh = await readCache();
        // nur die Einträge von heute behalten
        const kept = Object.fromEntries(Object.entries(fresh).filter(([k]) => k.startsWith(date)));
        await writeFile(CACHE_FILE, JSON.stringify({ ...kept, [key]: entry }, null, 2));
        return entry;
      })().finally(() => pending.delete(key))
    );
  }
  return pending.get(key);
}

/* ---------- News-Ticker (World News API) ---------- */
const NEWS_CACHE_FILE = path.join(here, "cache-news.json");
const NEWS_MAX_AGE = 60 * 60 * 1000; // 1 Stunde – schont das Kontingent der API
let newsPending = null;

async function fetchTopNews() {
  const params = new URLSearchParams({
    "source-country": process.env.NEWS_COUNTRY || "de",
    language: process.env.NEWS_LANGUAGE || "de",
    "headlines-only": "true",
    "max-news-per-cluster": "1",
  });
  const res = await fetch(`https://api.worldnewsapi.com/top-news?${params}`, {
    headers: { "x-api-key": process.env.WORLD_NEWS_API_KEY },
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`World News API HTTP ${res.status}: ${data.message || "unbekannter Fehler"}`);

  const seen = new Set();
  return (data.top_news || [])
    .map((cluster) => cluster.news?.[0])
    .filter((n) => n?.title && /^https?:\/\//.test(n.url || ""))
    .filter((n) => !seen.has(n.title) && seen.add(n.title))
    .slice(0, 12)
    .map((n) => ({ title: n.title.trim(), url: n.url, source: new URL(n.url).hostname.replace(/^www\./, "") }));
}

async function news() {
  if (!process.env.WORLD_NEWS_API_KEY) {
    throw Object.assign(new Error("Kein WORLD_NEWS_API_KEY in server/.env eingetragen"), { status: 503 });
  }
  let cached = null;
  try {
    cached = JSON.parse(await readFile(NEWS_CACHE_FILE, "utf8"));
  } catch {
    /* noch kein Cache */
  }
  if (cached && Date.now() - cached.t < NEWS_MAX_AGE) return { items: cached.items, updated: cached.t };

  newsPending ??= fetchTopNews()
    .then(async (items) => {
      if (!items.length) throw new Error("Keine Schlagzeilen erhalten");
      const t = Date.now();
      await writeFile(NEWS_CACHE_FILE, JSON.stringify({ t, items }, null, 2));
      return { items, updated: t };
    })
    .catch((err) => {
      // lieber ältere Schlagzeilen zeigen als gar keine
      if (cached?.items?.length) {
        console.warn("[news]", err.message, "– nutze ältere Schlagzeilen");
        return { items: cached.items, updated: cached.t, stale: true };
      }
      throw err;
    })
    .finally(() => (newsPending = null));
  return newsPending;
}

/* ---------- Kontaktformular → n8n-Webhook ---------- */
const TOPICS = ["KI-Beratung", "Workshop & Training", "Speaker & Events", "Automatisierung mit n8n", "Sonstiges"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const contactLog = new Map(); // IP → Zeitstempel der letzten Anfragen (einfacher Spam-Schutz)

function readBody(req, limit = 20_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error("Anfrage zu groß"), { status: 413 }));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function validateContact(input) {
  const clean = (v, max) => String(v ?? "").trim().slice(0, max);
  const data = {
    name: clean(input.name, 100),
    email: clean(input.email, 200),
    topic: TOPICS.includes(input.topic) ? input.topic : "Sonstiges",
    message: clean(input.message, 3000),
  };
  const fields = {};
  if (data.name.length < 2) fields.name = "Bitte gib deinen Namen an.";
  if (!EMAIL_RE.test(data.email)) fields.email = "Bitte gib eine gültige E-Mail-Adresse an.";
  if (data.message.length < 10) fields.message = "Bitte beschreibe dein Anliegen in mindestens 10 Zeichen.";
  return { data, fields };
}

async function handleContact(req, res) {
  if (!process.env.N8N_WEBHOOK_URL) {
    return sendJson(res, 503, { error: "Das Formular ist noch nicht mit n8n verbunden (N8N_WEBHOOK_URL in server/.env fehlt)." });
  }

  const ip = req.socket.remoteAddress || "unbekannt";
  const now = Date.now();
  const recent = (contactLog.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 5) {
    return sendJson(res, 429, { error: "Zu viele Anfragen. Bitte versuche es in ein paar Minuten erneut." });
  }

  let input;
  try {
    input = JSON.parse(await readBody(req));
  } catch (err) {
    return sendJson(res, err.status || 400, { error: "Ungültige Anfrage." });
  }

  // Honeypot: echte Menschen sehen dieses Feld nicht – Bots füllen es aus
  if (input.website) return sendJson(res, 200, { ok: true });

  const { data, fields } = validateContact(input);
  if (Object.keys(fields).length) return sendJson(res, 400, { error: "Bitte prüfe deine Eingaben.", fields });

  recent.push(now);
  contactLog.set(ip, recent);

  const payload = {
    ...data,
    submittedAt: new Date().toISOString(),
    source: "portfolio-kontaktformular",
    page: req.headers.referer || null,
  };
  const headers = { "Content-Type": "application/json" };
  if (process.env.N8N_WEBHOOK_SECRET) headers["X-Webhook-Secret"] = process.env.N8N_WEBHOOK_SECRET;

  try {
    const hook = await fetch(process.env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    if (!hook.ok) throw new Error(`n8n antwortete mit HTTP ${hook.status}`);
    console.log(`[kontakt] Anfrage von ${data.name} an n8n übergeben`);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.warn("[kontakt]", err.message);
    sendJson(res, 502, { error: "Die Nachricht konnte gerade nicht zugestellt werden. Bitte versuche es später erneut oder schreib mir direkt per E-Mail." });
  }
}

/* ---------- Newsletter → Supabase (REST, ohne Zusatzpakete) ---------- */
const newsletterLog = new Map();

async function handleNewsletter(req, res) {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return sendJson(res, 503, { error: "Die Newsletter-Anmeldung ist noch nicht mit der Datenbank verbunden." });
  }

  const ip = req.socket.remoteAddress || "unbekannt";
  const now = Date.now();
  const recent = (newsletterLog.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 5) {
    return sendJson(res, 429, { error: "Zu viele Anmeldungen. Bitte versuche es in ein paar Minuten erneut." });
  }

  let input;
  try {
    input = JSON.parse(await readBody(req, 5_000));
  } catch (err) {
    return sendJson(res, err.status || 400, { error: "Ungültige Anfrage." });
  }
  if (input.website) return sendJson(res, 200, { ok: true }); // Honeypot

  const email = String(input.email ?? "").trim().toLowerCase().slice(0, 200);
  const name = String(input.name ?? "").trim().slice(0, 100);
  const fields = {};
  if (name.length < 2) fields.name = "Bitte gib deinen Vornamen an.";
  if (!EMAIL_RE.test(email)) fields.email = "Bitte gib eine gültige E-Mail-Adresse an.";
  if (input.consent !== true) fields.consent = "Bitte bestätige die Einwilligung.";
  if (Object.keys(fields).length) return sendJson(res, 400, { error: "Bitte prüfe deine Eingaben.", fields });

  recent.push(now);
  newsletterLog.set(ip, recent);

  try {
    const db = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/newsletter_subscribers?on_conflict=email`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        // schon eingetragen? → still ignorieren, damit niemand Adressen „abfragen“ kann
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      // Spalten der Supabase-Tabelle: id, name, email, consent, consented_at, source
      body: JSON.stringify({ email, name, consent: true, consented_at: new Date().toISOString(), source: "portfolio" }),
      signal: AbortSignal.timeout(10000),
    });
    if (!db.ok) {
      const detail = await db.json().catch(() => ({}));
      throw new Error(`Supabase HTTP ${db.status}: ${detail.message || detail.hint || "unbekannter Fehler"}`);
    }
    console.log("[newsletter] neue Anmeldung gespeichert");
    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.warn("[newsletter]", err.message);
    sendJson(res, 502, { error: "Die Anmeldung konnte gerade nicht gespeichert werden. Bitte versuche es später erneut." });
  }
}

/* ---------- HTTP ---------- */
function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": MIME[".json"], "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/contact") {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Nur POST erlaubt." });
    return handleContact(req, res);
  }

  if (url.pathname === "/api/newsletter") {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Nur POST erlaubt." });
    return handleNewsletter(req, res);
  }

  if (url.pathname === "/api/news") {
    try {
      sendJson(res, 200, await news());
    } catch (err) {
      console.warn("[news]", err.message);
      sendJson(res, err.status || 502, { error: err.message });
    }
    return;
  }

  if (url.pathname === "/api/motivation") {
    try {
      sendJson(res, 200, await motivation());
    } catch (err) {
      console.warn("[motivation]", err.message);
      sendJson(res, err.status || 502, { error: err.message });
    }
    return;
  }

  // Statische Dateien – nur innerhalb von ../portfolio, keine versteckten Dateien
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const file = path.resolve(WEB_ROOT, "." + pathname);
  if (!file.startsWith(WEB_ROOT + path.sep) || pathname.split("/").some((p) => p.startsWith("."))) {
    res.writeHead(403).end("Verboten");
    return;
  }
  try {
    const content = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Nicht gefunden");
  }
});

server.listen(PORT, () => {
  console.log(`Portfolio läuft auf http://localhost:${PORT}`);
  console.log(process.env.OPENAI_API_KEY ? `OpenAI aktiv (Modell: ${OPENAI_MODEL})` : "Hinweis: kein OPENAI_API_KEY in server/.env – Motivation nutzt Ersatztexte");
  console.log(process.env.WORLD_NEWS_API_KEY ? "News-Ticker aktiv (World News API)" : "Hinweis: kein WORLD_NEWS_API_KEY in server/.env – News-Ticker bleibt ausgeblendet");
  console.log(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY ? "Newsletter → Supabase aktiv" : "Hinweis: SUPABASE_URL/SUPABASE_SERVICE_KEY fehlen in server/.env – Newsletter ist noch nicht verbunden");
  console.log(process.env.N8N_WEBHOOK_URL ? "Kontaktformular → n8n aktiv" : "Hinweis: kein N8N_WEBHOOK_URL in server/.env – Kontaktformular ist noch nicht verbunden");
});
