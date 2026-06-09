// Génial Colloc — content script SeLoger.
// Compatible Firefox et Chrome (WebExtensions MV3) : pas de service worker,
// pas de permissions, aucune API spécifique à un navigateur.
(function () {
  "use strict";

  // URL de l'app déployée. Remplacer par http://localhost:5173/ pour tester en local.
  const APP_URL = "https://genial-colloc.vercel.app/";

  function parseNumber(raw) {
    const n = parseInt(String(raw).replace(/[^\d]/g, ""), 10);
    return Number.isNaN(n) ? undefined : n;
  }

  // Extraction depuis les données structurées JSON-LD (le plus fiable).
  function fromJsonLd() {
    const out = {};
    for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
      let data;
      try {
        data = JSON.parse(el.textContent);
      } catch {
        continue;
      }
      const items = Array.isArray(data) ? data : [data];
      for (const it of items) {
        if (!it || typeof it !== "object") continue;
        const offer = it.offers && (Array.isArray(it.offers) ? it.offers[0] : it.offers);
        const price = offer?.price ?? it.price;
        if (price && out.price === undefined) out.price = parseNumber(price);
        if (it.name && !out.title) out.title = String(it.name).trim();
        const size = it.floorSize?.value ?? it.size;
        if (size && out.surface === undefined) out.surface = parseNumber(size);
      }
    }
    return out;
  }

  // Repli : heuristiques sur le texte visible de la page.
  function fromText() {
    const out = {};
    const t = document.body ? document.body.innerText : "";
    const price = t.match(/(\d[\d\s .]{2,6})\s*€/);
    if (price) out.price = parseNumber(price[1]);
    const surface = t.match(/(\d{1,3})\s*m(?:²|2)/i);
    if (surface) out.surface = parseNumber(surface[1]);
    const rooms = t.match(/\bT\s?(\d)\b/i) || t.match(/(\d)\s*pi[eè]ces?/i);
    if (rooms) out.rooms = parseNumber(rooms[1]);
    return out;
  }

  function extract() {
    const text = fromText();
    const ld = fromJsonLd();
    return {
      url: location.href.split("#")[0],
      title: ld.title || (document.querySelector("h1")?.innerText || "").trim() || undefined,
      price: ld.price ?? text.price,
      surface: ld.surface ?? text.surface,
      rooms: text.rooms,
    };
  }

  function openInApp() {
    const payload = encodeURIComponent(JSON.stringify(extract()));
    window.open(APP_URL + "#offer=" + payload, "_blank", "noopener");
  }

  function injectButton() {
    if (document.getElementById("gc-add-btn")) return;
    const btn = document.createElement("button");
    btn.id = "gc-add-btn";
    btn.textContent = "➕ Génial Colloc";
    btn.style.cssText =
      "position:fixed;bottom:20px;right:20px;z-index:2147483647;" +
      "background:#22c55e;color:#fff;border:none;border-radius:999px;" +
      "padding:12px 18px;font:600 14px system-ui,sans-serif;cursor:pointer;" +
      "box-shadow:0 4px 14px rgba(0,0,0,.3)";
    btn.addEventListener("click", openInApp);
    document.body.appendChild(btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectButton);
  } else {
    injectButton();
  }
})();
