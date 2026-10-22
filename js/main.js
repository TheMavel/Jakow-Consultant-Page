/* =========================================================
   Jakow Smirin – Portfolio · Interaktionen
   ========================================================= */
(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ---------- Überschriften in Wörter zerlegen ---------- */
  function splitWords(root) {
    let index = 0;

    const wrap = (word) => {
      const outer = document.createElement("span");
      const inner = document.createElement("span");
      outer.className = "w";
      inner.textContent = word;
      inner.style.setProperty("--wd", `${0.1 + index++ * 0.07}s`);
      outer.appendChild(inner);
      return outer;
    };

    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((part) => {
            if (!part) return;
            frag.appendChild(/^\s+$/.test(part) ? document.createTextNode(" ") : wrap(part));
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
          walk(child);
        }
      });
    };

    walk(root);
  }

  $$("[data-split]").forEach(splitWords);

  /* ---------- Reveal beim Scrollen ---------- */
  $$(".job").forEach((job) => job.setAttribute("data-reveal", ""));

  const revealTargets = $$("[data-reveal], [data-split]");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach((el) => el.classList.add("is-in"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealTargets.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- Zahlen hochzählen ---------- */
  const counters = $$("[data-count]");
  const runCounter = (el) => {
    const target = Number(el.dataset.count);
    if (prefersReducedMotion) {
      el.textContent = target;
      return;
    }
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window) {
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setTimeout(() => runCounter(entry.target), 600);
          countObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => countObserver.observe(el));
  } else {
    counters.forEach((el) => (el.textContent = el.dataset.count));
  }

  /* ---------- Navigation: ein-/ausblenden, Fortschritt, aktiver Link ---------- */
  const nav = $("#nav");
  const progress = $(".progress span");
  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);

    const goingDown = y > lastY;
    const menuOpen = document.body.classList.contains("menu-open");
    nav.classList.toggle("is-hidden", goingDown && y > 240 && !menuOpen);
    lastY = y;
    ticking = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true }
  );
  onScroll();

  const navLinks = $$(".nav__links a");
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`));
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    $$("main > section[id]").forEach((s) => sectionObserver.observe(s));
  }

  /* ---------- Mobile-Menü ---------- */
  const burger = $("#burger");
  const menu = $("#mobile-menu");

  const openMenu = () => {
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add("is-open"));
    document.body.classList.add("menu-open");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Menü schließen");
    nav.classList.remove("is-hidden");
    $("a", menu).focus({ preventScroll: true });
  };
  const closeMenu = (returnFocus = true) => {
    menu.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Menü öffnen");
    setTimeout(() => {
      if (!menu.classList.contains("is-open")) menu.hidden = true;
    }, 400);
    if (returnFocus) burger.focus({ preventScroll: true });
  };

  burger.addEventListener("click", () => (menu.hidden ? openMenu() : closeMenu()));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => closeMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) closeMenu();
  });
  window.matchMedia("(min-width: 901px)").addEventListener("change", (e) => {
    if (e.matches && !menu.hidden) closeMenu(false);
  });

  /* ---------- Laufband ---------- */
  const marquee = $("#marquee");
  const marqueeToggle = $("#marquee-toggle");
  const setMarquee = (paused) => {
    marquee.classList.toggle("is-paused", paused);
    marqueeToggle.setAttribute("aria-pressed", String(paused));
    marqueeToggle.setAttribute("aria-label", paused ? "Laufband abspielen" : "Laufband pausieren");
  };
  marqueeToggle.addEventListener("click", () => setMarquee(!marquee.classList.contains("is-paused")));
  if (prefersReducedMotion) setMarquee(true);

  /* ---------- Akkordeon ---------- */
  const accHeads = $$(".acc__head");
  accHeads.forEach((head) => {
    head.addEventListener("click", () => {
      const open = head.getAttribute("aria-expanded") === "true";
      accHeads.forEach((h) => h.setAttribute("aria-expanded", "false"));
      head.setAttribute("aria-expanded", String(!open));
    });
  });

  /* ---------- Spotlight auf Karten ---------- */
  $$(".card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  /* ---------- Werdegang filtern ---------- */
  const filters = $$(".filter");
  const jobs = $$(".job");
  const emptyNote = $(".timeline__empty");

  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.filter;
      filters.forEach((f) => {
        const active = f === btn;
        f.classList.toggle("is-active", active);
        f.setAttribute("aria-pressed", String(active));
      });

      let shown = 0;
      jobs.forEach((job) => {
        const match = key === "all" || job.dataset.tags.split(" ").includes(key);
        job.classList.add("is-in");
        job.classList.toggle("is-hidden", !match);
        job.classList.remove("is-entering");
        if (match) {
          void job.offsetWidth; // Animation neu starten
          job.style.setProperty("--jd", `${shown * 0.06}s`);
          job.classList.add("is-entering");
          shown++;
        }
      });
      emptyNote.hidden = shown > 0;
    });
  });
  jobs.forEach((job) => job.addEventListener("animationend", () => job.classList.remove("is-entering")));

  /* ---------- E-Mail kopieren ---------- */
  const toast = $("#toast");
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
  };

  $("#copy-mail").addEventListener("click", async (e) => {
    const mail = e.currentTarget.dataset.mail;
    try {
      await navigator.clipboard.writeText(mail);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = mail;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    showToast(`${mail} kopiert ✓`);
  });

  $("#year").textContent = new Date().getFullYear();

  const rand = (a, b) => a + Math.random() * (b - a);

  /* =========================================================
     Live-Wetter für Düsseldorf (Open-Meteo, ohne API-Key)
     ========================================================= */
  const WEATHER_URL =
    "https://api.open-meteo.com/v1/forecast?" +
    new URLSearchParams({
      latitude: "51.2277",
      longitude: "6.7735",
      current:
        "temperature_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      hourly: "precipitation_probability,precipitation",
      daily: "sunshine_duration,daylight_duration,precipitation_sum,sunrise,sunset",
      timezone: "Europe/Berlin",
      forecast_days: "2",
    });
  const WEATHER_CACHE_KEY = "js-portfolio-weather";
  const WEATHER_MAX_AGE = 10 * 60 * 1000; // Open-Meteo aktualisiert alle 15 Minuten
  const WEATHER_REFRESH = 15 * 60 * 1000;

  // Zuletzt geladene Werte für die Canvas-Effekte (Regen, Schnee, Wind)
  let latestWeather = null;

  // WMO-Wettercodes → [Beschreibung, Icon, Niederschlagsstärke 0–1]
  const WMO = {
    0: ["Sonnig", "sun"], 1: ["Überwiegend sonnig", "partly"], 2: ["Teils bewölkt", "partly"], 3: ["Bedeckt", "cloud"],
    45: ["Nebel", "fog"], 48: ["Nebel mit Raureif", "fog"],
    51: ["Leichter Nieselregen", "drizzle", 0.3], 53: ["Nieselregen", "drizzle", 0.4], 55: ["Starker Nieselregen", "drizzle", 0.5],
    56: ["Gefrierender Niesel", "drizzle", 0.4], 57: ["Gefrierender Niesel", "drizzle", 0.5],
    61: ["Leichter Regen", "rain", 0.5], 63: ["Regen", "rain", 0.75], 65: ["Starker Regen", "rain", 1],
    66: ["Gefrierender Regen", "rain", 0.6], 67: ["Gefrierender Regen", "rain", 0.9],
    71: ["Leichter Schneefall", "snow", 0.4], 73: ["Schneefall", "snow", 0.7], 75: ["Starker Schneefall", "snow", 1],
    77: ["Schneegriesel", "snow", 0.4],
    80: ["Leichte Regenschauer", "rain", 0.5], 81: ["Regenschauer", "rain", 0.75], 82: ["Heftige Regenschauer", "rain", 1],
    85: ["Leichte Schneeschauer", "snow", 0.5], 86: ["Schneeschauer", "snow", 0.8],
    95: ["Gewitter", "thunder", 1], 96: ["Gewitter mit Hagel", "thunder", 1], 99: ["Schweres Gewitter", "thunder", 1],
  };

  function describeWeather(code, isDay, precipitation) {
    let [label, kind, amount = 0] = WMO[code] || ["Wechselhaft", "cloud"];
    if (!isDay && code === 0) label = "Klare Nacht";
    if (!isDay && code === 1) label = "Überwiegend klar";

    const icon =
      kind === "sun" ? (isDay ? "sun" : "moon")
      : kind === "partly" ? (isDay ? "partlyDay" : "partlyNight")
      : kind;
    const mood =
      code <= 1 ? (isDay ? "sun" : "night")
      : kind === "partly" ? "cloud"
      : { drizzle: "rain", rain: "rain", thunder: "storm" }[kind] || kind;

    let rain = ["drizzle", "rain", "thunder"].includes(kind) ? amount : 0;
    const snow = kind === "snow" ? amount : 0;
    if (precipitation > 0 && !rain && !snow) rain = 0.3;
    return { label, icon, mood, rain, snow };
  }

  const COMPASS = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];
  const COMPASS_LONG = ["Nord", "Nordost", "Ost", "Südost", "Süd", "Südwest", "West", "Nordwest"];
  const compassIndex = (deg) => Math.round(deg / 45) % 8;

  function beaufort(kmh) {
    const limits = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
    const names = [
      "Windstill", "Leiser Zug", "Leichte Brise", "Schwache Brise", "Mäßige Brise", "Frische Brise",
      "Starker Wind", "Steifer Wind", "Stürmischer Wind", "Sturm", "Schwerer Sturm", "Orkanartiger Sturm", "Orkan",
    ];
    const i = limits.findIndex((l) => kmh < l);
    return names[i === -1 ? names.length - 1 : i];
  }

  const fmt1 = (n) => Number(n).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const deg = (n) => String(Math.round(n) || 0).replace("-", "−"); // typografisches Minus, keine "-0"

  /* ---------- Animierte Wetter-Icons (SVG, 64×64) ---------- */
  const svgSun = (cx, cy, r) => {
    let rays = "";
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const p = (d) => [(cx + Math.cos(a) * d).toFixed(1), (cy + Math.sin(a) * d).toFixed(1)];
      const [x1, y1] = p(r + 5);
      const [x2, y2] = p(r + 10);
      rays += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    }
    return `<g class="wi__rays" stroke="#ffd166" stroke-width="3" stroke-linecap="round">${rays}</g>
      <circle class="wi__core" cx="${cx}" cy="${cy}" r="${r}" fill="#ffd166"/>`;
  };
  const svgMoon = (cx, cy, r) => `
    <mask id="wi-moon-${cx}-${cy}"><rect width="64" height="64" fill="#fff"/><circle cx="${cx + r * 0.55}" cy="${cy - r * 0.45}" r="${r * 0.85}" fill="#000"/></mask>
    <circle class="wi__moon" cx="${cx}" cy="${cy}" r="${r}" fill="#e3ecff" mask="url(#wi-moon-${cx}-${cy})"/>`;
  const svgCloud = (dx = 0, dy = 0, s = 1, fill = "#fff", extra = "") => `
    <g transform="translate(${dx} ${dy}) scale(${s})"><g class="wi__cloud ${extra}" fill="${fill}">
      <circle cx="24" cy="36" r="10"/><circle cx="36" cy="30" r="13"/><circle cx="47" cy="38" r="8"/><rect x="24" y="36" width="23" height="10"/>
    </g></g>`;
  const svgDrops = (xs, len) => `
    <g stroke="#7cc4ff" stroke-width="2.6" stroke-linecap="round">
      ${xs.map((x) => `<line class="wi__drop" x1="${x}" y1="44" x2="${x - 2}" y2="${44 + len}"/>`).join("")}
    </g>`;

  const ICONS = {
    sun: () => svgSun(32, 32, 11),
    moon: () => svgMoon(30, 32, 16),
    partlyDay: () => svgSun(24, 24, 9) + svgCloud(5, 5),
    partlyNight: () => svgMoon(24, 22, 12) + svgCloud(5, 5),
    cloud: () => svgCloud(-8, -9, 0.85, "rgba(255,255,255,0.5)", "wi__cloud--back") + svgCloud(3, 2),
    fog: () => svgCloud(0, -8) + `
      <g stroke="rgba(255,255,255,0.75)" stroke-width="3" stroke-linecap="round">
        <line class="wi__fog" x1="14" y1="46" x2="44" y2="46"/><line class="wi__fog" x1="22" y1="53" x2="52" y2="53"/>
      </g>`,
    drizzle: () => svgCloud(0, -8) + svgDrops([26, 35, 44], 4),
    rain: () => svgCloud(0, -8) + svgDrops([22, 30, 38, 46], 8),
    snow: () => svgCloud(0, -8) + `
      <g fill="#fff">
        <circle class="wi__flake" cx="24" cy="48" r="2.4"/><circle class="wi__flake" cx="34" cy="50" r="2.4"/><circle class="wi__flake" cx="44" cy="47" r="2.4"/>
      </g>`,
    thunder: () => svgCloud(0, -8, 1, "#c9d6f2") + svgDrops([22, 46], 6) + `
      <polygon class="wi__bolt" points="35,38 27,51 33,51 29,62 42,46 36,46 40,38" fill="#ffd166"/>`,
  };

  /* ---------- Darstellung ---------- */
  function initWeather() {
    const box = $("#weather");
    if (!box) return;
    const hero = $("#top"); // Wetterstimmung (Sonnenschein, Regen …) färbt weiterhin den Hero
    const field = (name) => $(`[data-w="${name}"]`, box);
    let lastLoad = 0;

    const readCache = () => {
      try {
        return JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY));
      } catch {
        return null;
      }
    };
    const writeCache = (data) => {
      try {
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ t: Date.now(), data }));
      } catch {
        /* Speicher nicht verfügbar – dann eben ohne Cache */
      }
    };

    function render(data) {
      const c = data.current;
      const { hourly, daily } = data;
      const info = describeWeather(c.weather_code, c.is_day, c.precipitation);

      field("icon").innerHTML = `<svg class="wi" viewBox="0 0 64 64">${ICONS[info.icon]()}</svg>`;
      field("temp").textContent = deg(c.temperature_2m);
      field("desc").textContent = info.label;
      field("feels").textContent = `Gefühlt ${deg(c.apparent_temperature)}° · ${beaufort(c.wind_speed_10m)}`;
      field("time").textContent = `Stand ${c.time.slice(11, 16)} Uhr`;

      // Regen: regnet es gerade → Menge, sonst Wahrscheinlichkeit für die aktuelle Stunde
      let i0 = hourly.time.indexOf(`${c.time.slice(0, 13)}:00`);
      if (i0 < 0) i0 = 0;
      const probNow = Number(hourly.precipitation_probability[i0]) || 0;
      const rainingNow = c.precipitation > 0;
      field("rain").innerHTML = rainingNow ? `${fmt1(c.precipitation)}<small>mm</small>` : `${probNow}<small>%</small>`;
      field("rain-sub").textContent = rainingNow
        ? info.snow ? "schneit gerade" : "regnet gerade"
        : `${fmt1(daily.precipitation_sum[0])} mm heute`;
      box.classList.toggle("is-raining", rainingNow);

      // Sonne: Sonnenstunden heute im Verhältnis zum Tageslicht
      const sunH = daily.sunshine_duration[0] / 3600;
      const dayH = daily.daylight_duration[0] / 3600;
      field("sun").innerHTML = `${fmt1(sunH)}<small>h</small>`;
      field("sun-sub").innerHTML =
        `<span>↑${daily.sunrise[0].slice(11, 16)}</span><span>↓${daily.sunset[0].slice(11, 16)}</span>`;
      field("sun-bar").style.setProperty("--sun", `${Math.min(100, (sunH / dayH) * 100).toFixed(0)}%`);
      field("sun").closest(".metric").title = `${fmt1(sunH)} von ${fmt1(dayH)} Stunden Tageslicht mit Sonnenschein`;

      // Wind: Stärke, Richtung (Pfeil zeigt, wohin er weht) und Böen
      const dir = Number(c.wind_direction_10m) || 0;
      field("wind").innerHTML = `${Math.round(c.wind_speed_10m)}<small>km/h</small>`;
      field("wind-sub").textContent = `aus ${COMPASS[compassIndex(dir)]}`;
      field("gust").textContent = `Böen ${Math.round(c.wind_gusts_10m)}`;
      field("wind-arrow").style.setProperty("--dir", `${(dir + 180) % 360}deg`);
      field("wind").closest(".metric").title =
        `${beaufort(c.wind_speed_10m)} aus ${COMPASS_LONG[compassIndex(dir)]}, Böen bis ${Math.round(c.wind_gusts_10m)} km/h`;

      // Regenwahrscheinlichkeit der nächsten 8 Stunden
      field("bars").innerHTML = Array.from({ length: 8 }, (_, k) => {
        const i = Math.min(i0 + k, hourly.time.length - 1);
        const prob = Number(hourly.precipitation_probability[i]) || 0;
        const mm = Number(hourly.precipitation[i]) || 0;
        const hour = hourly.time[i].slice(11, 13);
        const label = k === 0 ? "Jetzt" : hour;
        return `<li class="${k === 0 ? "is-now" : ""}" title="${hour}:00 Uhr · ${prob} % · ${fmt1(mm)} mm">
          <span class="rainbars__track"><span class="rainbars__fill" style="--h:${prob}%;--p:${(prob / 100).toFixed(2)};--bd:${(k * 0.06).toFixed(2)}s"></span>${
            prob >= 15 ? `<span class="rainbars__pct">${prob}</span>` : ""
          }</span>
          <span class="rainbars__hour">${label}</span>
        </li>`;
      }).join("");

      box.dataset.state = "ready";
      hero.dataset.weather = info.mood;

      latestWeather = { wind: Number(c.wind_speed_10m) || 0, dir, rain: info.rain, snow: info.snow };
      document.dispatchEvent(new CustomEvent("weather:update", { detail: latestWeather }));
    }

    async function load({ force = false } = {}) {
      const cached = readCache();
      if (cached?.data?.current) {
        render(cached.data);
        if (!force && Date.now() - cached.t < WEATHER_MAX_AGE) {
          lastLoad = cached.t;
          return;
        }
      }
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(WEATHER_URL, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.current) throw new Error(data.reason || "Keine Wetterdaten");
        render(data);
        writeCache(data);
        lastLoad = Date.now();
      } catch (err) {
        // Mit älteren Daten aus dem Cache weiterzeigen, sonst Fehlerzustand
        if (!cached?.data?.current) {
          box.dataset.state = "error";
          field("desc").textContent = "Keine Verbindung";
          field("time").textContent = "offline";
        }
        console.warn("Wetter konnte nicht geladen werden:", err);
      }
    }

    field("retry").addEventListener("click", () => {
      box.dataset.state = "loading";
      load({ force: true });
    });
    setInterval(() => {
      if (!document.hidden) load();
    }, WEATHER_REFRESH);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && Date.now() - lastLoad > WEATHER_REFRESH) load();
    });

    load();
  }

  /* =========================================================
     Canvas: fließende Lichtlinien (Hero & Kontakt)
     ========================================================= */
  class Flow {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.mirror = canvas.hasAttribute("data-flow-mirror");
      this.mouse = { x: 0.5, y: 0.5 };
      this.target = { x: 0.5, y: 0.5 };
      this.running = false;
      this.time = 0;
      this.last = 0;
      this.weather = latestWeather || { wind: 0, dir: 0, rain: 0, snow: 0 };

      this.resize();
      new ResizeObserver(() => {
        this.resize();
        if (!this.running) this.draw();
      }).observe(canvas);

      document.addEventListener("weather:update", (e) => {
        this.weather = e.detail;
        this.buildDrops();
        if (!this.running) this.draw();
      });

      const host = canvas.parentElement;
      host.addEventListener("pointermove", (e) => {
        const r = host.getBoundingClientRect();
        this.target.x = (e.clientX - r.left) / r.width;
        this.target.y = (e.clientY - r.top) / r.height;
      });
      host.addEventListener("pointerleave", () => {
        this.target.x = 0.5;
        this.target.y = 0.5;
      });

      if (prefersReducedMotion) {
        this.draw();
        return;
      }
      new IntersectionObserver(([entry]) => {
        entry.isIntersecting ? this.start() : this.stop();
      }).observe(canvas);
      document.addEventListener("visibilitychange", () => {
        document.hidden ? this.stop() : this.start();
      });
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { clientWidth: w, clientHeight: h } = this.canvas;
      this.w = w;
      this.h = h;
      // Linien dezenter, wo Text darüber liegt: Kontaktbereich (mittig) und schmale Screens
      this.dim = (this.mirror ? 0.6 : 1) * (w < 700 ? 0.6 : 1);
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.dpr = dpr;
      this.build();
    }

    build() {
      const { w, h } = this;
      const count = w < 700 ? 16 : 30;

      this.lines = Array.from({ length: count }, (_, i) => {
        const spread = i / (count - 1);
        return {
          y0: h * (0.48 + rand(-0.06, 0.06)),
          y3: h * (0.04 + spread * 0.92) + rand(-20, 20),
          phase: rand(0, Math.PI * 2),
          speed: rand(0.25, 0.6),
          amp: rand(18, 48),
          depth: rand(0.4, 1.2),
          alpha: rand(0.25, 0.65),
          particles: Array.from({ length: Math.random() < 0.6 ? 1 : 2 }, () => ({
            t: Math.random(),
            v: rand(0.04, 0.11),
          })),
        };
      });

      this.stars = Array.from({ length: Math.round((w * h) / 9000) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: rand(0.3, 1.2),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.4, 1.4),
      }));

      this.buildDrops();
    }

    // Regen bzw. Schnee aus den Live-Wetterdaten; der Wind gibt die Schräglage vor
    buildDrops() {
      const { w, h } = this;
      const { rain, snow, wind, dir } = this.weather;
      this.isSnow = snow > rain;
      const amount = Math.max(rain, snow);
      const blowX = Math.sin(((dir + 180) * Math.PI) / 180) * (Math.min(wind, 60) / 60);
      this.slant = (this.mirror ? -blowX : blowX) * (this.isSnow ? 1 : 0.45);

      this.drops = Array.from({ length: Math.round(((w * h) / 7000) * amount) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        len: rand(10, 22),
        v: this.isSnow ? rand(25, 60) : rand(520, 820),
        r: rand(0.8, 2.2),
        phase: rand(0, Math.PI * 2),
      }));
    }

    curve(line) {
      const { w, h, time, mouse } = this;
      const mx = (mouse.x - 0.5) * 2;
      const my = (mouse.y - 0.5) * 2;
      const wave = Math.sin(time * line.speed + line.phase) * line.amp;
      const wave2 = Math.cos(time * line.speed * 0.8 + line.phase) * line.amp;
      const x0 = w * (w < 700 ? 0.2 : 0.42);
      return [
        x0, line.y0,
        w * 0.55 + mx * 30 * line.depth, line.y0 + (line.y3 - line.y0) * 0.15 + wave + my * 30 * line.depth,
        w * 0.78 + mx * 20 * line.depth, line.y3 - (line.y3 - line.y0) * 0.1 + wave2 + my * 20 * line.depth,
        w * 1.04, line.y3,
      ];
    }

    static point(c, t) {
      const u = 1 - t;
      const a = u * u * u, b = 3 * u * u * t, d = 3 * u * t * t, e = t * t * t;
      return [a * c[0] + b * c[2] + d * c[4] + e * c[6], a * c[1] + b * c[3] + d * c[5] + e * c[7]];
    }

    draw() {
      const { ctx, w, h, dpr, time } = this;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (this.mirror) ctx.setTransform(-dpr, 0, 0, dpr, w * dpr, 0);
      ctx.clearRect(0, 0, w, h);

      // Sterne
      for (const s of this.stars) {
        const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase));
        ctx.fillStyle = `rgba(200,225,255,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Regen / Schnee
      if (this.drops.length) {
        if (this.isSnow) {
          ctx.fillStyle = "rgba(235,245,255,0.7)";
          for (const d of this.drops) {
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.strokeStyle = "rgba(190,215,255,0.26)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (const d of this.drops) {
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x - this.slant * d.len, d.y - d.len);
          }
          ctx.stroke();
        }
      }

      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 1;

      for (const line of this.lines) {
        const c = this.curve(line);
        const alpha = line.alpha * this.dim;
        const grad = ctx.createLinearGradient(c[0], c[1], c[6], c[7]);
        grad.addColorStop(0, "rgba(124,188,255,0)");
        grad.addColorStop(0.35, `rgba(124,188,255,${(alpha * 0.55).toFixed(3)})`);
        grad.addColorStop(1, `rgba(94,224,255,${alpha.toFixed(3)})`);
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(c[0], c[1]);
        ctx.bezierCurveTo(c[2], c[3], c[4], c[5], c[6], c[7]);
        ctx.stroke();

        for (const p of line.particles) {
          const [x, y] = Flow.point(c, p.t);
          const fade = Math.sin(p.t * Math.PI);
          ctx.fillStyle = `rgba(94,224,255,${(0.18 * fade).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(220,245,255,${(0.95 * fade).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    }

    frame = (now) => {
      if (!this.running) return;
      const dt = Math.min((now - (this.last || now)) / 1000, 0.05);
      this.last = now;
      // mehr Wind = schnellere Lichtlinien
      const pace = 0.75 + Math.min(this.weather.wind, 60) / 30;
      this.time += dt * pace;

      this.mouse.x += (this.target.x - this.mouse.x) * 0.04;
      this.mouse.y += (this.target.y - this.mouse.y) * 0.04;

      for (const line of this.lines) {
        for (const p of line.particles) {
          p.t += p.v * dt * pace;
          if (p.t > 1) p.t -= 1;
        }
      }

      const { w, h } = this;
      for (const d of this.drops) {
        d.y += d.v * dt;
        d.x += this.isSnow
          ? (Math.sin(this.time * 0.8 + d.phase) * 12 + this.slant * 40) * dt
          : d.v * this.slant * dt;
        if (d.y > h + 24) {
          d.y = -24;
          d.x = Math.random() * w;
        }
        if (d.x < -24) d.x += w + 48;
        else if (d.x > w + 24) d.x -= w + 48;
      }
      this.draw();
      requestAnimationFrame(this.frame);
    };

    start() {
      if (this.running || document.hidden) return;
      this.running = true;
      this.last = 0;
      requestAnimationFrame(this.frame);
    }

    stop() {
      this.running = false;
    }
  }

  /* =========================================================
     Canvas: Sternenhimmel mit Sternschnuppen (Werdegang)
     ========================================================= */
  class Stars {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.running = false;
      this.time = 0;
      this.last = 0;
      this.shooting = null;
      this.nextShot = 3;

      this.resize();
      new ResizeObserver(() => {
        this.resize();
        if (!this.running) this.draw();
      }).observe(canvas);

      if (prefersReducedMotion) {
        this.draw();
        return;
      }
      new IntersectionObserver(([entry]) => {
        entry.isIntersecting ? this.start() : this.stop();
      }).observe(canvas);
      document.addEventListener("visibilitychange", () => {
        document.hidden ? this.stop() : this.start();
      });
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = this.canvas.clientWidth;
      this.h = this.canvas.clientHeight;
      this.dpr = dpr;
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      const n = Math.round((this.w * this.h) / 7000);
      this.stars = Array.from({ length: n }, () => ({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        r: Math.random() * 1.1 + 0.25,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 1.2 + 0.3,
      }));
    }

    draw() {
      const { ctx, w, h, dpr, time } = this;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      for (const s of this.stars) {
        const a = 0.2 + 0.6 * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase));
        ctx.fillStyle = `rgba(210,230,255,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const sh = this.shooting;
      if (sh) {
        const p = sh.age / sh.life;
        const x = sh.x + sh.dx * sh.age;
        const y = sh.y + sh.dy * sh.age;
        const tail = 120;
        const len = Math.hypot(sh.dx, sh.dy);
        const grad = ctx.createLinearGradient(x, y, x - (sh.dx / len) * tail, y - (sh.dy / len) * tail);
        const a = Math.sin(p * Math.PI);
        grad.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`);
        grad.addColorStop(1, "rgba(124,188,255,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - (sh.dx / len) * tail, y - (sh.dy / len) * tail);
        ctx.stroke();
      }
    }

    frame = (now) => {
      if (!this.running) return;
      const dt = Math.min((now - (this.last || now)) / 1000, 0.05);
      this.last = now;
      this.time += dt;

      if (this.shooting) {
        this.shooting.age += dt;
        if (this.shooting.age > this.shooting.life) this.shooting = null;
      } else if ((this.nextShot -= dt) <= 0) {
        this.shooting = {
          x: Math.random() * this.w * 0.7,
          y: Math.random() * this.h * 0.4,
          dx: 520 + Math.random() * 260,
          dy: 200 + Math.random() * 140,
          age: 0,
          life: 0.9,
        };
        this.nextShot = 5 + Math.random() * 6;
      }

      this.draw();
      requestAnimationFrame(this.frame);
    };

    start() {
      if (this.running || document.hidden) return;
      this.running = true;
      this.last = 0;
      requestAnimationFrame(this.frame);
    }

    stop() {
      this.running = false;
    }
  }

  if ("ResizeObserver" in window && "IntersectionObserver" in window) {
    $$("[data-flow]").forEach((c) => new Flow(c));
    $$("[data-stars]").forEach((c) => new Stars(c));
  }

  initNews();
  initWeather();
  initMotivation();
  initContactForm();
  initNewsletter();

  /* =========================================================
     Newsletter-Anmeldung → eigener Server → Supabase
     ========================================================= */
  function initNewsletter() {
    const form = $("#newsletter-form");
    if (!form) return;
    const nameInput = form.elements.name;
    const email = form.elements.email;
    const consent = form.elements.consent;
    const status = $(".nl__status", form);
    const submit = $(".nl__submit", form);
    const label = $(".nl__label", form);

    const inputs = { name: nameInput, email, consent };
    const setError = (name, msg) => {
      const input = inputs[name];
      input.closest(".nl__field, .nl__consent").classList.toggle("is-invalid", Boolean(msg));
      input.setAttribute("aria-invalid", String(Boolean(msg)));
      $(`#nl-${name}-error`).textContent = msg;
    };
    const validate = () => {
      const errors = {
        name: nameInput.value.trim().length >= 2 ? "" : "Bitte gib deinen Vornamen an.",
        email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()) ? "" : "Bitte gib eine gültige E-Mail-Adresse an.",
        consent: consent.checked ? "" : "Bitte bestätige, dass du den Newsletter erhalten möchtest.",
      };
      Object.entries(errors).forEach(([k, v]) => setError(k, v));
      return errors;
    };
    [nameInput, email].forEach((el) =>
      el.addEventListener("input", () => el.closest(".nl__field").classList.contains("is-invalid") && validate())
    );
    consent.addEventListener("change", () => consent.closest(".nl__consent").classList.contains("is-invalid") && validate());

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      status.textContent = "";
      status.classList.remove("is-error");
      const errors = validate();
      const firstInvalid = Object.keys(errors).find((k) => errors[k]);
      if (firstInvalid) {
        inputs[firstInvalid].focus();
        return;
      }

      submit.disabled = true;
      label.textContent = "Wird gespeichert …";
      try {
        const res = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.elements.name.value,
            email: email.value,
            consent: consent.checked,
            website: form.elements.website.value,
          }),
          signal: AbortSignal.timeout(15000),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          Object.entries(body.fields || {}).forEach(([k, v]) => setError(k, v));
          throw new Error(body.error || "Die Anmeldung hat nicht geklappt.");
        }
        const first = form.elements.name.value.trim().split(/\s+/)[0];
        $('[data-nl="name"]', form).textContent = first ? `, ${first}` : "";
        form.classList.add("is-sent");
        $(".nl__done", form).focus();
      } catch (err) {
        status.classList.add("is-error");
        status.textContent =
          err.name === "TimeoutError" || err.name === "TypeError"
            ? "Keine Verbindung zum Server. Bitte versuche es erneut."
            : err.message;
      } finally {
        submit.disabled = false;
        label.textContent = "Kostenlos anmelden";
      }
    });
  }

  /* =========================================================
     News-Ticker (World News API über den eigenen Node-Server)
     ========================================================= */
  function initNews() {
    const ticker = $("#news");
    if (!ticker) return;
    const list = $('[data-news="list"]', ticker);
    const clone = $('[data-news="clone"]', ticker);
    const toggle = $(".ticker__toggle", ticker);

    const render = (items) => {
      list.replaceChildren(
        ...items.map(({ title, url, source }) => {
          const li = document.createElement("li");
          const a = Object.assign(document.createElement("a"), { href: url, target: "_blank", rel: "noopener", textContent: title });
          const src = Object.assign(document.createElement("span"), { className: "ticker__src", textContent: source });
          li.append(a, src);
          return li;
        })
      );
      // Kopie für die nahtlose Schleife – für Screenreader und Tastatur ausgeblendet
      clone.replaceChildren(...[...list.children].map((li) => li.cloneNode(true)));
      $$("a", clone).forEach((a) => a.setAttribute("tabindex", "-1"));

      ticker.hidden = false;
      document.body.classList.add("has-ticker");
      // gleichbleibendes Lesetempo (~70 px/s), egal wie viele Schlagzeilen
      ticker.style.setProperty("--dur", `${Math.max(30, Math.round(list.scrollWidth / 70))}s`);
    };

    toggle.addEventListener("click", () => {
      const paused = !ticker.classList.contains("is-paused");
      ticker.classList.toggle("is-paused", paused);
      toggle.setAttribute("aria-pressed", String(paused));
      toggle.setAttribute("aria-label", paused ? "Nachrichten-Ticker abspielen" : "Nachrichten-Ticker pausieren");
    });

    const load = () =>
      fetch("/api/news", { signal: AbortSignal.timeout(15000) })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then((data) => data.items?.length && render(data.items))
        .catch((err) => console.info("News-Ticker ausgeblendet –", err.message));

    load();
    setInterval(load, 30 * 60 * 1000); // der Server erneuert höchstens stündlich
  }

  /* =========================================================
     Kontaktformular → eigener Server → n8n-Webhook
     ========================================================= */
  function initContactForm() {
    const form = $("#contact-form");
    if (!form) return;
    const status = $(".cform__status", form);
    const submit = $(".cform__submit", form);
    const label = $(".cform__label", form);
    const message = form.elements.message;
    const count = $("#cf-count");

    const RULES = {
      name: (v) => (v.trim().length >= 2 ? "" : "Bitte gib deinen Namen an."),
      email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Bitte gib eine gültige E-Mail-Adresse an."),
      message: (v) =>
        v.trim().length >= 10 ? "" : "Bitte beschreibe dein Anliegen in mindestens 10 Zeichen.",
    };

    const setError = (name, msg) => {
      const input = form.elements[name];
      const field = input.closest(".field");
      field.classList.toggle("is-invalid", Boolean(msg));
      field.classList.toggle("is-valid", !msg && input.value.trim() !== "");
      input.setAttribute("aria-invalid", String(Boolean(msg)));
      $(`#cf-${name}-error`).textContent = msg;
    };
    const check = (name) => {
      const msg = RULES[name](form.elements[name].value);
      setError(name, msg);
      return !msg;
    };

    // Fehler erst nach dem ersten Verlassen eines Feldes zeigen, danach live korrigieren
    Object.keys(RULES).forEach((name) => {
      const input = form.elements[name];
      input.addEventListener("blur", () => {
        if (input.value.trim()) check(name);
      });
      input.addEventListener("input", () => {
        if (input.closest(".field").classList.contains("is-invalid")) check(name);
      });
    });

    message.addEventListener("input", () => {
      count.textContent = `${message.value.length} / ${message.maxLength}`;
    });

    const setSending = (sending) => {
      form.classList.toggle("is-sending", sending);
      submit.disabled = sending;
      label.textContent = sending ? "Wird gesendet …" : "Nachricht senden";
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      status.textContent = "";
      status.classList.remove("is-error");

      const invalid = Object.keys(RULES).filter((name) => !check(name));
      if (invalid.length) {
        form.elements[invalid[0]].focus();
        return;
      }

      const data = Object.fromEntries(new FormData(form));
      setSending(true);
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(15000),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          Object.entries(body.fields || {}).forEach(([name, msg]) => setError(name, msg));
          throw new Error(body.error || "Die Nachricht konnte nicht gesendet werden.");
        }

        $('[data-cf="name"]', form).textContent = data.name.trim().split(/\s+/)[0];
        $('[data-cf="email"]', form).textContent = data.email.trim();
        form.classList.add("is-sent");
        $(".cform__done", form).focus();
      } catch (err) {
        status.classList.add("is-error");
        status.textContent =
          err.name === "TimeoutError" || err.name === "TypeError"
            ? "Keine Verbindung zum Server. Bitte versuche es erneut oder schreib mir per E-Mail."
            : err.message;
      } finally {
        setSending(false);
      }
    });

    $('[data-cf="again"]', form).addEventListener("click", () => {
      form.reset();
      count.textContent = `0 / ${message.maxLength}`;
      $$(".field", form).forEach((f) => f.classList.remove("is-valid", "is-invalid"));
      form.classList.remove("is-sent");
      form.elements.name.focus();
    });
  }

  /* =========================================================
     Motivation des Tages (OpenAI über den eigenen Node-Server)
     ========================================================= */
  function initMotivation() {
    const section = $("#motivation");
    if (!section) return;
    const field = (name) => $(`[data-m="${name}"]`, section);

    field("date").textContent = new Date().toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    // Ersatztexte, falls kein Server/Key verfügbar ist – passend zur Wetterstimmung aus dem Hero
    const FALLBACK = {
      rain: "Regen draußen ist der perfekte Moment, um den Workflow zu bauen, den du schon ewig automatisieren wolltest.",
      storm: "Draußen stürmt es – drinnen sorgt ein sauberer Rollback-Plan dafür, dass dein Deployment ruhig bleibt.",
      snow: "Schneetag? Ideal, um Ordnung in deine Daten zu bringen, bevor du das nächste Modell darauf loslässt.",
      fog: "Nebel draußen, Klarheit im Code: Ein guter Prompt beginnt mit einer klaren Frage.",
      sun: "Die Sonne lädt auf – nutze die Energie, um heute einen Prototyp live zu bringen statt ihn nur zu planen.",
      night: "Ruhige Nacht, klarer Kopf: Der beste Code entsteht, wenn du weißt, welches Problem er löst.",
      default: [
        "Jede Automatisierung beginnt mit einer Aufgabe, die dich heute einmal zu oft genervt hat.",
        "KI ersetzt keine Neugier – sie belohnt sie. Stell heute eine Frage, die noch niemand gestellt hat.",
        "Kleine Commits, große Wirkung: Ein Schritt nach vorn ist besser als der perfekte Plan.",
        "Der beste Prompt ist der, den du nach dem dritten Versuch verstanden hast.",
      ],
    };
    const dayIndex = Math.floor(Date.now() / 86400000);
    let usingFallback = false;

    // Text sicher (ohne innerHTML) setzen; erstes und letztes Wort samt Anführungszeichen umbrechen nie getrennt
    const setQuote = (el, text) => {
      const words = text.trim().replace(/^[„"“]+|[“"”]+$/g, "").split(/\s+/);
      const glued = (before, word, after) => {
        const span = document.createElement("span");
        span.className = "nowrap";
        if (before) span.append(Object.assign(document.createElement("span"), { className: "q", textContent: before }));
        span.append(word);
        if (after) span.append(Object.assign(document.createElement("span"), { className: "q", textContent: after }));
        return span;
      };
      el.replaceChildren();
      if (words.length === 1) {
        el.append(glued("„", words[0], "“"));
        return;
      }
      el.append(glued("„", words[0], ""), " ", words.slice(1, -1).join(" "), " ", glued("", words.at(-1), "“"));
    };

    const show = (text, { weatherRelated = false, source = "KI-generiert" } = {}) => {
      setQuote(field("text"), text);
      field("weather").hidden = !weatherRelated;
      $("span", field("source")).textContent = source;
      section.dataset.state = "ready";
    };

    const showFallback = () => {
      usingFallback = true;
      const mood = $("#top")?.dataset.weather;
      const text = FALLBACK[mood] || FALLBACK.default[dayIndex % FALLBACK.default.length];
      show(text, { weatherRelated: Boolean(FALLBACK[mood]), source: "Offline-Version" });
    };
    document.addEventListener("weather:update", () => {
      if (usingFallback) showFallback();
    });

    fetch("/api/motivation", { signal: AbortSignal.timeout(25000) })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        if (!data.text) throw new Error("Keine Motivation erhalten");
        show(data.text, { weatherRelated: data.weatherRelated });
      })
      .catch((err) => {
        console.info("Motivation: Ersatztext wird genutzt –", err.message);
        showFallback();
      });
  }
})();
