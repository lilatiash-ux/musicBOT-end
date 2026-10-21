// =====================================
// MUSICDROP BOT — ULTRA PRO FINAL SAFE
// + ADMIN PANEL PRO
// + COLOR PALETTE
// =====================================

let lastScrape = Date.now();

function updateScrapeTimestamp() {
  lastScrape = Date.now();
}

// --------- IMPORTY PODSTAWOWE ---------
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");

// --------- DISCORD.JS 14 --------------
const {
  Client,
  GatewayIntentBits,
  Events,
  ActivityType,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  InteractionContextType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

// --------- UTILS -----------------------
const { log, error } = require("./utils/logger");
const { loadJSON, saveJSON } = require("./utils/storage");
const { safeFetch } = require("./utils/fetcher");
const { isSpecial, parsePrice, formatPrice } = require("./utils/helpers");
const { fetchExternalBatch } = require("./utils/external-monitor");

// =====================================
// KONFIGURACJA
// =====================================

const config = require("./config.json");
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || config.DISCORD_TOKEN;

if (!DISCORD_TOKEN) {
  console.error("❌ Brak DISCORD_TOKEN w config.json");
  process.exit(1);
}

const SHOP_BASE_URL = "https://musicdrop.pl";
const CHECK_INTERVAL_MINUTES = 5;
const DISCORD_INVITE = "https://discord.gg/bnTQejcg";
const LOG_CHANNEL_ID = "1489800618515366032";
const ADMIN_ID = "321304868264476673";
const EXTERNAL_CHANNELS = {
  riot: "1562490003945168956",
  douglas: "1562490777438003210",
  sephora: "1562490975266410516"
};
let externalCycle = 0;

// =====================================
// ANTI-CRASH
// =====================================

process.on("uncaughtException", (e) => {
  error("UNCAUGHT EXCEPTION:", e?.stack || e?.message || e);
});

process.on("unhandledRejection", (e) => {
  error("UNHANDLED REJECTION:", e?.stack || e?.message || e);
});

setInterval(() => {
  log("💓 HEARTBEAT — bot żyje");
}, 30000);

// =====================================
// FOLDERY I PLIKI
// =====================================

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const FILE_SEEN = path.join(DATA_DIR, "seen_products.json");
const FILE_PRICES = path.join(DATA_DIR, "prices.json");
const FILE_ACTIVE = path.join(DATA_DIR, "active_products.json");
const FILE_VENDORS = path.join(DATA_DIR, "vendors.json");
const FILE_THEME = path.join(DATA_DIR, "embed_theme.json");
const FILE_SETTINGS = path.join(DATA_DIR, "settings.json");
const FILE_ARTISTS = path.join(DATA_DIR, "artists.json");
const FILE_KEYWORDS = path.join(DATA_DIR, "special_keywords.json");
const FILE_HISTORY = path.join(DATA_DIR, "event_history.json");


// =====================================
// ARTYŚCI
// =====================================

const DEFAULT_ARTISTS = {
  "Ariana Grande": {
    channelId: "1490017376807162086",
    slugs: ["ariana-grande"],
    roleId: null
  },
  "Taylor Swift": {
    channelId: "1490017423951270121",
    slugs: ["taylor-swift"],
    roleId: null
  },
  "Selena Gomez": {
    channelId: "1490017467949650183",
    slugs: ["selena-gomez"],
    roleId: null
  },
  "Sabrina Carpenter": {
    channelId: "1490017665614348558",
    slugs: ["sabrina-carpenter"],
    roleId: null
  },
  "Lady Gaga": {
    channelId: "1490017494147141702",
    slugs: ["lady-gaga"],
    roleId: null
  },
  "Yungblud": {
    channelId: "1490017583100068031",
    slugs: ["yungblud"],
    roleId: null
  },
  "Olivia Rodrigo": {
    channelId: "1490017629270970398",
    slugs: ["olivia-rodrigo"],
    roleId: null
  },
  "Imagine Dragons": {
    channelId: "1491156786781360279",
    slugs: ["imagine-dragons"],
    roleId: null
  },
  "Demi Lovato": {
    channelId: "1512088884153028698",
    slugs: ["demi-lovato"],
    roleId: null
  },
  "Madison Beer": {
    channelId: "1491156834088779797",
    slugs: ["madison-beer"],
    roleId: null
  },
  "Dove Cameron": {
    channelId: "1491156879043203182",
    slugs: ["dove-cameron"],
    roleId: null
  },
  "Faouzia": {
    channelId: "1562491647655157840",
    slugs: ["faouzia"],
    roleId: null
  },
  "Bella Poarch": {
    channelId: "1562491898026000525",
    slugs: ["bella-poarch"],
    roleId: null
  }
};

let ARTISTS = { ...DEFAULT_ARTISTS, ...loadJSON(FILE_ARTISTS, DEFAULT_ARTISTS) };
saveJSON(FILE_ARTISTS, ARTISTS);

// =====================================
// KEYWORDS
// =====================================

const DEFAULT_SPECIAL_KEYWORDS = [
  "signed",
  "podpisana",
  "podpisany",
  "podpisane",
  "autograf",
  "autographed",
  "limited",
  "limitowana",
  "limitowany",
  "limitowane",
  "exclusive",
  "ekskluzywna",
  "ekskluzywny",
  "collector",
  "kolekcjonerska",
  "kolekcjonerski",
  "deluxe",
  "super deluxe",
  "vinyl",
  "winyl",
  "box set",
  "numbered",
  "numerowana",
  "picture disc",
  "coloured",
  "colored",
  "kolorowa",
  "kolorowy",
  "fan edition",
  "fan pack"
];

let SPECIAL_KEYWORDS = loadJSON(FILE_KEYWORDS, DEFAULT_SPECIAL_KEYWORDS);
saveJSON(FILE_KEYWORDS, SPECIAL_KEYWORDS);

// =====================================
// THEME
// =====================================

const DEFAULT_THEME = {
  color: 0xf1c40f,
  labels: {
    price: "PRICE",
    prices: "PRICES",
    discord: "DISCORD",
    checkout: "CHECKOUT",
    newProduct: "🆕 NEW PRODUCT",
    specialEdition: "⭐ SPECIAL EDITION",
    restock: "🔁 RESTOCKED",
    priceChange: "🔄 PRICE CHANGE"
  },
  emoji: {
    newProduct: "🆕",
    specialEdition: "⭐",
    restock: "🔁",
    priceDrop: "📉",
    priceUp: "📈",
    checkout: "🛒",
    viewProduct: "🔗",
    goToLatest: "⬇️"
  }
};

let THEME = loadJSON(FILE_THEME, DEFAULT_THEME);
saveJSON(FILE_THEME, THEME);

// =====================================
// COLOR PALETTE
// =====================================

const COLOR_PRESETS = [
  { id: "hot_pink", label: "🩷 Hot Pink", hex: "#FF1493" },
  { id: "pastel_pink", label: "🌸 Pastel Pink", hex: "#FFB6C1" },
  { id: "rose", label: "🌹 Rose", hex: "#E75480" },
  { id: "lavender", label: "💜 Lavender", hex: "#B57EDC" },
  { id: "purple", label: "🟣 Purple", hex: "#8A2BE2" },
  { id: "royal_blue", label: "💙 Royal Blue", hex: "#4169E1" },
  { id: "cyan", label: "🩵 Cyan", hex: "#00CFFF" },
  { id: "ice_blue", label: "🧊 Ice Blue", hex: "#AEEBFF" },
  { id: "ocean", label: "🌊 Ocean", hex: "#0077BE" },
  { id: "midnight", label: "🌙 Midnight", hex: "#191970" },
  { id: "emerald", label: "🟢 Emerald", hex: "#50C878" },
  { id: "mint", label: "🌿 Mint", hex: "#98FF98" },
  { id: "lime", label: "🍏 Lime", hex: "#32CD32" },
  { id: "red", label: "❤️ Red", hex: "#FF0000" },
  { id: "cherry", label: "🍒 Cherry", hex: "#D2042D" },
  { id: "orange", label: "🧡 Orange", hex: "#FF8C00" },
  { id: "gold", label: "💛 Gold", hex: "#FFD700" },
  { id: "yellow", label: "🟡 Yellow", hex: "#FFD400" },
  { id: "brown", label: "🤎 Brown", hex: "#8B4513" },
  { id: "cream", label: "🥂 Cream", hex: "#FFFDD0" },
  { id: "silver", label: "🩶 Silver", hex: "#C0C0C0" },
  { id: "white", label: "⚪ White", hex: "#FFFFFF" },
  { id: "black", label: "⚫ Black", hex: "#000000" },
  { id: "charcoal", label: "◼️ Charcoal", hex: "#36454F" }
];

function hexToInt(hex) {
  return parseInt(String(hex).replace("#", ""), 16);
}

function intToHex(num) {
  return `#${Number(num || 0).toString(16).padStart(6, "0").toUpperCase()}`;
}

function getColorPresetById(id) {
  return COLOR_PRESETS.find(c => c.id === id);
}

// =====================================
// SETTINGS
// =====================================

let SETTINGS = loadJSON(FILE_SETTINGS, {
  heartbeat: true,
  heartbeatInterval: 5 * 60 * 60 * 1000,
  mode: "normal",
  debugToLogChannel: true
});

saveJSON(FILE_SETTINGS, SETTINGS);

// =====================================

// =====================================
// PAMIĘĆ
// =====================================

let seenProducts = new Set(loadJSON(FILE_SEEN, []));
let trackedPrices = loadJSON(FILE_PRICES, {});
let lastActive = new Set(loadJSON(FILE_ACTIVE, []));
let vendorMap = loadJSON(FILE_VENDORS, {});
let eventHistory = loadJSON(FILE_HISTORY, []);
let lastCheckTime = null;
let checkCount = 0;
let lastMonitorTime = Date.now();

function pushHistory(type, product, extra = {}) {
  eventHistory.push({
    type,
    name: product?.name || "Unknown",
    url: product?.url || null,
    artistName: product?.artistName || extra.artistName || null,
    price: product?.price || null,
    regularPrice: product?.regularPrice || null,
    time: new Date().toISOString(),
    ...extra
  });

  if (eventHistory.length > 300) {
    eventHistory = eventHistory.slice(-300);
  }

  saveJSON(FILE_HISTORY, eventHistory);
}

// =====================================
// KLIENT DISCORD
// =====================================

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  rest: {
    timeout: 20000
  }
});

client.setMaxListeners(30);

log("🔧 MusicDrop ULTRA-PRO FINAL SAFE — start…");

// =====================================
// KOLEJKA WYSYŁKI
// =====================================

const sendQueue = [];
let queueProcessing = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processSendQueue() {
  if (queueProcessing) return;

  queueProcessing = true;

  while (sendQueue.length > 0) {
    const job = sendQueue.shift();

    try {
      await job();
    } catch (err) {
      error("Send queue error:", err?.message || err);
    }

    await sleep(1200);
  }

  queueProcessing = false;
}

function queueSend(job) {
  sendQueue.push(job);
  processSendQueue();
}

async function safeChannelFetch(channelId, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (channel) return channel;
    } catch (err) {
      error(`Channel fetch retry ${attempt}/${retries} (${channelId}):`, err?.message || err);
      await sleep(1000);
    }
  }

  return null;
}

function buildComponents(channel, productUrl) {
  const components = [buildViewButton(productUrl)];
  const guildId = channel?.guildId || channel?.guild?.id || client.guilds.cache.first()?.id;

  if (guildId) {
    components.push(buildJumpToLatestButton(channel.id, guildId));
  }

  return components;
}

client.on("shardDisconnect", () => {
  error("❌ Discord shard disconnected — discord.js spróbuje połączyć ponownie.");
});

client.on("shardReconnecting", () => {
  log("🔄 Discord reconnecting...");
});

client.on("shardError", (err) => {
  error("🔥 Discord shard error:", err?.message || err);
});

client.on("error", (err) => {
  error("Discord client error:", err?.message || err);
});

// =====================================
// LOG CHANNEL
// =====================================

async function logToChannel(msg) {
  try {
    const ch = client.channels.cache.get(LOG_CHANNEL_ID);
    if (ch) ch.send(`\`${new Date().toLocaleString("pl-PL")}\` — ${msg}`);
  } catch (e) {
    error("Log channel error:", e?.message || e);
  }
}

async function debugLog(msg) {
  if (SETTINGS.mode !== "debug") return;
  log("[DEBUG]", msg);

  if (!SETTINGS.debugToLogChannel) return;

  try {
    const ch = await safeChannelFetch(LOG_CHANNEL_ID);
    if (ch) ch.send(`🛠 **DEBUG**\n${msg}`);
  } catch {}
}

// =====================================
// HELPERY
// =====================================

function normalizeText(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function productIsSpecial(name) {
  const lower = normalizeText(name);
  const helperSpecial = typeof isSpecial === "function" ? isSpecial(name || "") : false;
  return helperSpecial || SPECIAL_KEYWORDS.some(k => lower.includes(normalizeText(k)));
}

function getEmbedColor() {
  return typeof THEME.color === "number" ? THEME.color : DEFAULT_THEME.color;
}

function parseTimeText(input) {
  if (!input) return null;

  const normalized = String(input).trim().toLowerCase().replace(/\s+/g, "");
  const match = normalized.match(/^(\d+)(m|h)$/);

  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  if (!value || value < 1) return null;

  if (unit === "m") return value * 60 * 1000;
  if (unit === "h") return value * 60 * 60 * 1000;

  return null;
}

// =====================================
// ROUTING PRODUKTÓW
// =====================================

function routeProduct(product) {
  if (product.artistName && ARTISTS[product.artistName]) {
    return {
      channelId: ARTISTS[product.artistName].channelId,
      artistName: product.artistName,
      roleId: ARTISTS[product.artistName].roleId
    };
  }

  if (product.vendor && ARTISTS[product.vendor]) {
    vendorMap[product.vendor] = product.vendor;
    saveJSON(FILE_VENDORS, vendorMap);

    return {
      channelId: ARTISTS[product.vendor].channelId,
      artistName: product.vendor,
      roleId: ARTISTS[product.vendor].roleId
    };
  }

  if (product.vendor && vendorMap[product.vendor] && ARTISTS[vendorMap[product.vendor]]) {
    const artistName = vendorMap[product.vendor];

    return {
      channelId: ARTISTS[artistName].channelId,
      artistName,
      roleId: ARTISTS[artistName].roleId
    };
  }

  const title = normalizeText(product.name);
  const url = normalizeText(product.url);
  const vendor = normalizeText(product.vendor);

  for (const [artistName, cfg] of Object.entries(ARTISTS)) {
    const artistNorm = normalizeText(artistName);

    if (
      title.includes(artistNorm) ||
      vendor.includes(artistNorm) ||
      cfg.slugs.some(slug => url.includes(normalizeText(slug))) ||
      cfg.slugs.some(slug => title.includes(normalizeText(slug).replace(/-/g, " ")))
    ) {
      if (product.vendor) {
        vendorMap[product.vendor] = artistName;
        saveJSON(FILE_VENDORS, vendorMap);
      }

      return {
        channelId: cfg.channelId,
        artistName,
        roleId: cfg.roleId
      };
    }
  }

  return null;
}

// =====================================
// SCRAPER MUSICDROP
// =====================================

async function fetchCollection(slug) {
  const url = `${SHOP_BASE_URL}/collections/${slug}/products.json?limit=250`;
  const data = await safeFetch(url);

  if (!data || !data.products) return [];
  return data.products;
}

async function fetchPreorders() {
  const slugs = ["preorder", "preordery", "upcoming"];

  for (const slug of slugs) {
    const data = await safeFetch(`${SHOP_BASE_URL}/collections/${slug}/products.json?limit=250`);

    if (data && data.products && data.products.length > 0) {
      log(`📦 Preordery (${slug}): ${data.products.length}`);
      return data.products;
    }
  }

  return [];
}

function convertProduct(p, artistName = null) {
  if (!p || !p.title) return null;

  let thumbnail = "";

  if (Array.isArray(p.images) && p.images.length > 0) {
    const img = p.images.find(i => i?.src) || p.images[0];
    thumbnail = img?.src || "";
    if (thumbnail.startsWith("/")) thumbnail = "https:" + thumbnail;
  }

  let variant = null;

  if (Array.isArray(p.variants) && p.variants.length > 0) {
    variant = p.variants.find(v => v) || p.variants[0];
  }

  const priceNum = parsePrice(variant?.price);
  const compareNum = parsePrice(variant?.compare_at_price);

  const discount =
    compareNum && priceNum && compareNum > priceNum
      ? Math.round(((compareNum - priceNum) / compareNum) * 100)
      : null;

  const available = Array.isArray(p.variants)
    ? p.variants.some(v => v.available)
    : true;

  return {
    id: p.handle || String(p.id),
    handle: p.handle,
    variantId: variant?.id || null,
    updatedAt: p.updated_at || p.published_at || null,
    name: p.title,
    url: `${SHOP_BASE_URL}/products/${p.handle}`,
    price: formatPrice(priceNum),
    regularPrice: compareNum ? formatPrice(compareNum) : null,
    priceNumeric: priceNum,
    compareNumeric: compareNum,
    discountPercent: discount,
    isSoldOut: !available,
    thumbnail,
    vendor: p.vendor || null,
    tags: Array.isArray(p.tags) ? p.tags : [],
    artistName,
    isSpecial: productIsSpecial(p.title || "")
  };
}

// =====================================
// MONITORING SKLEPÓW ZEWNĘTRZNYCH — best effort
// =====================================

function routeExternalProduct(product) {
  const title = normalizeText(product.name);
  const url = normalizeText(product.url);
  const source = String(product.source || "").toLowerCase();
  const combined = `${title} ${url}`;

  // Dedicated shop searches have dedicated Discord channels.
  if (source === "douglas" || /douglas\.pl/.test(url)) {
    if (/ariana|wicked|fragrance|perfume|parfum|eau-de|body mist/.test(combined)) {
      return { channelId: EXTERNAL_CHANNELS.douglas, artistName: "Ariana Grande / Wicked", roleId: null };
    }
  }
  if (source === "sephora" || /sephora\.pl/.test(url)) {
    if (/rem beauty|rare beauty|lipstick|lip gloss|makeup|beauty/.test(combined) || source === "sephora") {
      return { channelId: EXTERNAL_CHANNELS.sephora, artistName: "REM Beauty / Rare Beauty", roleId: null };
    }
  }

  const isLoL = /league of legends|\bk\/?da\b|true damage|heartsteel|pentakill|riot games|summoner|arcane soundtrack/.test(combined);
  const isVinylOrMusic = /vinyl|vinyls|record|lp\b|12-inch|7-inch|soundtrack|ost|album|music|cd|picture disc/.test(combined);
  if (isLoL && isVinylOrMusic) {
    return { channelId: EXTERNAL_CHANNELS.riot, artistName: "Riot Games / League of Legends", roleId: null };
  }

  for (const [artistName, cfg] of Object.entries(ARTISTS)) {
    const artistNorm = normalizeText(artistName);
    const slugMatch = cfg.slugs.some(slug => combined.includes(normalizeText(slug).replace(/-/g, " ")) || url.includes(normalizeText(slug)));
    if (title.includes(artistNorm) || url.includes(artistNorm.replace(/ /g, "-")) || slugMatch) {
      return { channelId: cfg.channelId, artistName, roleId: cfg.roleId };
    }
  }
  return null;
}

function canonicalExternalId(product) {
  try {
    const u = new URL(product.url);
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|currency$|lang$|ref$|variant$)/i.test(key)) u.searchParams.delete(key);
    }
    // Onvinylstore's currency-specific URL must not create duplicate product identities.
    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    return `external:${String(product.source || u.hostname).toLowerCase()}:${path}${u.search}`;
  } catch {
    return `external:${String(product.source || "shop")}:${String(product.url || product.name).toLowerCase()}`;
  }
}

async function runExternalChecks(client, isFirstRun) {
  externalCycle += 1;
  const batch = await fetchExternalBatch(externalCycle - 1);
  let found = 0;
  let routed = 0;
  let errors = 0;

  for (const shopResult of batch.results) {
    if (shopResult.error) {
      errors += 1;
      log(`[External] ${shopResult.shop}: pomijam cykl (${shopResult.error})`);
      continue;
    }
    for (const product of shopResult.products || []) {
      const match = routeExternalProduct(product);
      if (!match) continue;
      if (!product.name || !product.url) continue;
      product.isSpecial = productIsSpecial(product.name);
      product.tags = Array.isArray(product.tags) ? product.tags : [];
      const pid = canonicalExternalId(product);
      found += 1;
      routed += 1;
      try {
        await handleProduct(client, match.channelId, product, pid, match.artistName, match.roleId, isFirstRun);
      } catch (err) {
        errors += 1;
        error(`[External] Produkt ${product.name}:`, err?.message || err);
      }
    }
  }
  log(`[External] Zapytanie: "${batch.term}"; dopasowane produkty: ${routed}; błędy sklepów: ${errors}`);
  return { found, routed, errors, term: batch.term };
}

// =====================================
// MONITORING MUSICDROP
// =====================================

setInterval(() => {
  if (seenProducts.size > 5000) {
    seenProducts = new Set([...seenProducts].slice(-2500));
    saveJSON(FILE_SEEN, [...seenProducts]);
    log("🧹 Oczyszczono seenProducts.");
  }
}, 10 * 60 * 1000);

async function handleProduct(client, channelId, product, pid, artistName, roleId, isFirstRun = false) {
  if (!product || !product.name || !pid || !channelId) return;

  if (isFirstRun) {
    seenProducts.add(pid);

    trackedPrices[pid] = {
      price: product.price,
      regularPrice: product.regularPrice,
      numeric: product.priceNumeric,
      compareNumeric: product.compareNumeric,
      name: product.name,
      url: product.url,
      soldOut: product.isSoldOut,
      variantId: product.variantId
    };

    return;
  }

  if (!seenProducts.has(pid)) {
    seenProducts.add(pid);
    saveJSON(FILE_SEEN, [...seenProducts]);

    trackedPrices[pid] = {
      price: product.price,
      regularPrice: product.regularPrice,
      numeric: product.priceNumeric,
      compareNumeric: product.compareNumeric,
      name: product.name,
      url: product.url,
      soldOut: product.isSoldOut,
      variantId: product.variantId
    };

    saveJSON(FILE_PRICES, trackedPrices);
    pushHistory("new", product, { artistName });

    await sendNewProduct(client, channelId, product, artistName, roleId);
    return;
  }

  const entry = trackedPrices[pid];

  if (entry && entry.soldOut === true && product.isSoldOut === false) {
    entry.soldOut = false;
    entry.price = product.price;
    entry.regularPrice = product.regularPrice;
    entry.numeric = product.priceNumeric;
    entry.compareNumeric = product.compareNumeric;
    entry.variantId = product.variantId;

    saveJSON(FILE_PRICES, trackedPrices);
    pushHistory("restock", product, { artistName });

    await sendRestock(client, channelId, product, artistName);
    return;
  }

  await checkPriceChange(client, channelId, product, pid, artistName);
}

async function checkPriceChange(client, channelId, product, pid, artistName) {
  const entry = trackedPrices[pid];
  if (!entry) return;

  const oldPrice = entry.price;
  const newPrice = product.price;

  if (oldPrice !== newPrice) {
    entry.price = newPrice;
    entry.regularPrice = product.regularPrice;
    entry.numeric = parsePrice(newPrice);
    entry.compareNumeric = product.compareNumeric;
    entry.soldOut = product.isSoldOut;
    entry.variantId = product.variantId;

    saveJSON(FILE_PRICES, trackedPrices);
    pushHistory("price_change", product, { artistName, oldPrice, newPrice });

    await sendPriceChange(client, channelId, product, oldPrice, newPrice);
  }
}

async function runCheck(client) {
  updateScrapeTimestamp();

  const thisCheckStartedAt = new Date();
  const isFirstRun = lastCheckTime === null;

  log(`[Monitor] Sprawdzam sklep… (${thisCheckStartedAt.toLocaleString("pl-PL")})`);

  checkCount++;

  const currentActive = new Set();
  let foundProducts = 0;
  let collectionErrors = 0;

  for (const [artistName, config] of Object.entries(ARTISTS)) {
    for (const slug of config.slugs) {
      try {
        const raw = await fetchCollection(slug);
        const products = raw.map(p => convertProduct(p, artistName)).filter(Boolean);

        foundProducts += products.length;

        log(`[Scraper] ${artistName} (${slug}): ${products.length} produktów`);

        for (const product of products) {
          const pid = `artist:${artistName}:${product.handle}`;
          currentActive.add(pid);

          await handleProduct(client, config.channelId, product, pid, artistName, config.roleId, isFirstRun);
        }
      } catch (err) {
        collectionErrors++;
        error(`[Monitor] Błąd kolekcji ${artistName}:`, err?.message || err);
      }
    }
  }

  try {
    const raw = await fetchPreorders();
    const products = raw.map(p => convertProduct(p, null)).filter(Boolean);

    foundProducts += products.length;

    for (const product of products) {
      const pid = `preorder:${product.handle}`;
      currentActive.add(pid);

      const match = routeProduct(product);

      if (!match) {
        log(`[Monitor] Pomijam preorder (brak dopasowania): ${product.name}`);
        continue;
      }

      const { channelId, artistName, roleId } = match;
      await handleProduct(client, channelId, product, pid, artistName, roleId, isFirstRun);
    }
  } catch (err) {
    collectionErrors++;
    error("[Monitor] Błąd preorderów:", err?.message || err);
  }

  try {
    await runExternalChecks(client, isFirstRun);
  } catch (err) {
    collectionErrors++;
    error("[External] Błąd cyklu sklepów zewnętrznych:", err?.message || err);
  }

  lastActive = currentActive;

  saveJSON(FILE_ACTIVE, [...currentActive]);
  saveJSON(FILE_SEEN, [...seenProducts]);
  saveJSON(FILE_PRICES, trackedPrices);
  saveJSON(FILE_VENDORS, vendorMap);

  lastCheckTime = thisCheckStartedAt;
  lastMonitorTime = Date.now();
  updateScrapeTimestamp();

  log(`[Monitor] Zakończono. Produkty pobrane: ${foundProducts}. Aktywne: ${currentActive.size}. Sprawdzeń: ${checkCount}`);

  await debugLog(
    `Check #${checkCount}\n` +
    `Produkty pobrane: ${foundProducts}\n` +
    `Aktywne produkty: ${currentActive.size}\n` +
    `Błędy kolekcji: ${collectionErrors}\n` +
    `First run: ${isFirstRun ? "TAK — bez wysyłania starych produktów" : "NIE"}`
  );
}

// =====================================

// =====================================
// EMBEDY
// =====================================

function buildBaseEmbed(product) {
  const embed = new EmbedBuilder()
    .setTitle(product.name)
    .setURL(product.url)
    .setColor(getEmbedColor())
    .setTimestamp();

  if (product.thumbnail) embed.setThumbnail(product.thumbnail);

  return embed;
}

function buildSoldOutLine(product) {
  return product.isSoldOut ? "\n📦 SOLD OUT" : "";
}

function buildPriceLine(product) {
  if (product.regularPrice && product.discountPercent && product.discountPercent > 0) {
    return [
      `💰 Cena standardowa: ${product.regularPrice}`,
      `🏷 Cena promocyjna: ${product.price}`,
      `${THEME.emoji.priceDrop || "📉"} Rabat: ${product.discountPercent}%`
    ].join("\n");
  }

  return `${THEME.labels.price}: ${product.price}`;
}

function buildCheckoutField(product) {
  if (!product.variantId) {
    return {
      name: THEME.labels.checkout || "CHECKOUT",
      value: `[VIEW PRODUCT](${product.url})`,
      inline: false
    };
  }

  const checkoutUrl = (qty) =>
    `${SHOP_BASE_URL}/cart/${product.variantId}:${qty}?checkout`;

  return {
    name: THEME.labels.checkout || "CHECKOUT",
    value:
      `[🛒 1x](${checkoutUrl(1)}) | ` +
      `[🛒 2x](${checkoutUrl(2)}) | ` +
      `[🛒 3x](${checkoutUrl(3)}) | ` +
      `[🛒 4x](${checkoutUrl(4)})`,
    inline: false
  };
}

function buildViewButton(url) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("VIEW PRODUCT")
      .setEmoji(THEME.emoji.viewProduct || "🔗")
      .setStyle(ButtonStyle.Link)
      .setURL(url)
  );
}

function buildJumpToLatestButton(channelId, guildId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("GO TO LATEST")
      .setEmoji(THEME.emoji.goToLatest || "⬇️")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/channels/${guildId}/${channelId}`)
  );
}

// =====================================
// POWIADOMIENIA MUSICDROP
// =====================================

function canSendPublicNotifications() {
  return SETTINGS.mode !== "silent";
}

async function sendNewProduct(client, channelId, product, artistName, roleId) {
  try {
    if (!canSendPublicNotifications()) {
      log(`[Silent] NEW PRODUCT zapisany bez wysyłki: ${product.name}`);
      return;
    }

    const channel = await safeChannelFetch(channelId);
    if (!channel) return;

    const typeLabel = product.isSpecial ? THEME.labels.specialEdition : THEME.labels.newProduct;

    let priceLine = buildPriceLine(product);
    priceLine += buildSoldOutLine(product);

    const embed = buildBaseEmbed(product).addFields(
      { name: typeLabel, value: product.name, inline: false },
      { name: THEME.labels.price, value: priceLine, inline: false },
      { name: THEME.labels.discord, value: DISCORD_INVITE, inline: false },
      buildCheckoutField(product)
    );

    let content = `**${typeLabel} — ${product.name}**`;

    if (product.isSpecial && roleId) {
      content = `<@&${roleId}> 🚨 **${typeLabel} — ${product.name}**`;
    }

    queueSend(() => channel.send({
      content,
      embeds: [embed],
      components: buildComponents(channel, product.url)
    }));

    log(`📢 NEW PRODUCT: ${product.name} → ${channelId}`);
    logToChannel(`NEW PRODUCT: ${product.name}`);
  } catch (err) {
    error("sendNewProduct:", err?.message || err);
  }
}

async function sendPriceChange(client, channelId, product, oldPrice, newPrice) {
  try {
    if (!canSendPublicNotifications()) {
      log(`[Silent] PRICE CHANGE zapisany bez wysyłki: ${product.name}`);
      return;
    }

    const channel = await safeChannelFetch(channelId);
    if (!channel) return;

    const oldNum = parsePrice(oldPrice);
    const newNum = parsePrice(newPrice);

    let label = THEME.labels.priceChange;

    if (oldNum && newNum && oldNum !== newNum) {
      const diff = newNum - oldNum;
      const percent = Math.abs((diff / oldNum) * 100).toFixed(0);

      label =
        diff < 0
          ? `${THEME.emoji.priceDrop} PRICE DROP (-${Math.abs(diff).toFixed(2)} zł, -${percent}%)`
          : `${THEME.emoji.priceUp} PRICE INCREASE (+${diff.toFixed(2)} zł, +${percent}%)`;
    }

    const priceBlock =
      `${THEME.labels.price} (OLD): ${oldPrice}\n` +
      `${THEME.labels.price} (NEW): ${newPrice}` +
      buildSoldOutLine(product);

    const embed = buildBaseEmbed(product).addFields(
      { name: THEME.labels.priceChange, value: product.name, inline: false },
      { name: THEME.labels.prices, value: priceBlock, inline: false },
      { name: THEME.labels.discord, value: DISCORD_INVITE, inline: false },
      buildCheckoutField(product)
    );

    queueSend(() => channel.send({
      content: `**${label} — ${product.name}**`,
      embeds: [embed],
      components: buildComponents(channel, product.url)
    }));

    log(`💰 PRICE CHANGE: ${product.name} ${oldPrice} → ${newPrice}`);
    logToChannel(`PRICE CHANGE: ${product.name} ${oldPrice} → ${newPrice}`);
  } catch (err) {
    error("sendPriceChange:", err?.message || err);
  }
}

async function sendRestock(client, channelId, product, artistName) {
  try {
    if (!canSendPublicNotifications()) {
      log(`[Silent] RESTOCK zapisany bez wysyłki: ${product.name}`);
      return;
    }

    const channel = await safeChannelFetch(channelId);
    if (!channel) return;

    const priceLine = buildPriceLine(product);

    const embed = buildBaseEmbed(product).addFields(
      { name: THEME.labels.restock, value: product.name, inline: false },
      { name: THEME.labels.price, value: priceLine, inline: false },
      { name: THEME.labels.discord, value: DISCORD_INVITE, inline: false },
      buildCheckoutField(product)
    );

    queueSend(() => channel.send({
      content: `**RESTOCK — ${product.name}**`,
      embeds: [embed],
      components: buildComponents(channel, product.url)
    }));

    log(`🔁 RESTOCK: ${product.name} → ${channelId}`);
    logToChannel(`RESTOCK: ${product.name}`);
  } catch (err) {
    error("sendRestock:", err?.message || err);
  }
}

// =====================================
// ADMIN PANEL PRO
// =====================================

function isAdminUser(interaction) {
  return interaction.user.id === ADMIN_ID;
}

function adminOnlyReply(interaction) {
  return interaction.reply({ content: "❌ Brak uprawnień.", ephemeral: true });
}

function buildAdminMainEmbed() {
  return new EmbedBuilder()
    .setTitle("🛠 MusicDrop — ADMIN PANEL PRO")
    .setColor(getEmbedColor())
    .setDescription(
      "Sterowanie botem z poziomu Discorda.\n\n" +
      `Tryb: **${SETTINGS.mode.toUpperCase()}**\n` +
      `Heartbeat: **${SETTINGS.heartbeat ? "ON" : "OFF"}** co **${formatMs(SETTINGS.heartbeatInterval)}**\n` +
      `Kolor embedów: **${intToHex(getEmbedColor())}**\n` +
      `Produkty w pamięci: **${seenProducts.size}**\n` +
      `Ostatni check: **${new Date(lastMonitorTime).toLocaleString("pl-PL")}**`
    )
    .setTimestamp();
}

function buildAdminMainRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("panel_monitor").setLabel("MONITOR").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("panel_heartbeat").setLabel("HEARTBEAT").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("panel_mode").setLabel("MODE").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("panel_status").setLabel("STATUS").setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("panel_embed").setLabel("EMBED").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("panel_keywords").setLabel("KEYWORDS").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("panel_priority").setLabel("PRIORITY ROLE").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("panel_history").setLabel("HISTORY").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("panel_help").setLabel("HELP").setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("panel_config").setLabel("CONFIG").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("panel_clear").setLabel("CLEAR").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("panel_reload").setLabel("RELOAD").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("panel_clearcache").setLabel("CLEAR CACHE").setStyle(ButtonStyle.Danger)
    )
  ];
}

async function sendAdminMain(interaction, edit = false) {
  const payload = {
    embeds: [buildAdminMainEmbed()],
    components: buildAdminMainRows(),
    ephemeral: true
  };

  if (edit) return interaction.update(payload);
  return interaction.reply(payload);
}

function buildBackRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("panel_back").setLabel("⬅ BACK").setStyle(ButtonStyle.Secondary)
  );
}

function makeModal(customId, title, inputId, label, placeholder = "", required = true) {
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title);

  const input = new TextInputBuilder()
    .setCustomId(inputId)
    .setLabel(label)
    .setStyle(TextInputStyle.Short)
    .setRequired(required);

  if (placeholder) input.setPlaceholder(placeholder);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

function makeTwoInputModal(customId, title, aId, aLabel, aPlaceholder, bId, bLabel, bPlaceholder, bRequired = true) {
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title);

  const inputA = new TextInputBuilder()
    .setCustomId(aId)
    .setLabel(aLabel)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder(aPlaceholder);

  const inputB = new TextInputBuilder()
    .setCustomId(bId)
    .setLabel(bLabel)
    .setStyle(TextInputStyle.Short)
    .setRequired(bRequired)
    .setPlaceholder(bPlaceholder);

  modal.addComponents(
    new ActionRowBuilder().addComponents(inputA),
    new ActionRowBuilder().addComponents(inputB)
  );

  return modal;
}


// =====================================
// PANELE
// =====================================

async function showHeartbeatPanel(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("💓 HEARTBEAT PANEL")
    .setColor(getEmbedColor())
    .setDescription(
      `Status: **${SETTINGS.heartbeat ? "ON" : "OFF"}**\n` +
      `Interwał: **${formatMs(SETTINGS.heartbeatInterval)}**\n` +
      `Kanał raportów: <#${LOG_CHANNEL_ID}>`
    );

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("heartbeat_on").setLabel("ON").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("heartbeat_off").setLabel("OFF").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("heartbeat_set").setLabel("SET TIME").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("heartbeat_status").setLabel("STATUS").setStyle(ButtonStyle.Secondary)
    ),
    buildBackRow()
  ];

  return interaction.update({ embeds: [embed], components: rows, ephemeral: true });
}

async function showModePanel(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("⚙️ MODE PANEL")
    .setColor(getEmbedColor())
    .setDescription(
      `Aktualny tryb: **${SETTINGS.mode.toUpperCase()}**\n\n` +
      "**NORMAL** — normalne powiadomienia\n" +
      "**SILENT** — monitoruje i zapisuje, ale nie wysyła dropów\n" +
      "**DEBUG** — normalnie + logi diagnostyczne"
    );

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("mode_normal").setLabel("NORMAL").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("mode_silent").setLabel("SILENT").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("mode_debug").setLabel("DEBUG").setStyle(ButtonStyle.Primary)
    ),
    buildBackRow()
  ];

  return interaction.update({ embeds: [embed], components: rows, ephemeral: true });
}

async function showMonitorPanel(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("🔍 MONITOR PANEL")
    .setColor(getEmbedColor())
    .setDescription(
      `Checki: **${checkCount}**\n` +
      `Aktywne produkty: **${lastActive.size}**\n` +
      `Seen products: **${seenProducts.size}**\n` +
      `Ceny: **${Object.keys(trackedPrices).length}**\n` +
      `Ostatni check: **${new Date(lastMonitorTime).toLocaleString("pl-PL")}**`
    );

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("monitor_run").setLabel("RUN CHECK").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("monitor_status").setLabel("STATUS").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("monitor_prices").setLabel("PRICES").setStyle(ButtonStyle.Secondary)
    ),
    buildBackRow()
  ];

  return interaction.update({ embeds: [embed], components: rows, ephemeral: true });
}


async function showEmbedPanel(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("🎨 EMBED PANEL")
    .setColor(getEmbedColor())
    .setDescription(
      `Aktualny kolor: **${intToHex(getEmbedColor())}**\n` +
      `PRICE label: **${THEME.labels.price}**\n\n` +
      "Wybierz **COLORS**, żeby otworzyć paletę kolorów z podglądem."
    );

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("embed_colors").setLabel("COLORS").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("embed_set_color").setLabel("CUSTOM HEX").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("embed_set_price").setLabel("SET PRICE LABEL").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("embed_preview").setLabel("PREVIEW").setStyle(ButtonStyle.Secondary)
    ),
    buildBackRow()
  ];

  return interaction.update({ embeds: [embed], components: rows, ephemeral: true });
}

async function showColorPanel(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("🎨 COLOR PALETTE")
    .setColor(getEmbedColor())
    .setDescription(
      `Aktualny kolor embedów: **${intToHex(getEmbedColor())}**\n\n` +
      "Kliknij kolor, a bot ustawi go jako kolor embedów i pokaże preview."
    );

  const rows = [];

  for (let i = 0; i < 16; i += 4) {
    const row = new ActionRowBuilder();

    COLOR_PRESETS.slice(i, i + 4).forEach(color => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`color_${color.id}`)
          .setLabel(color.label)
          .setStyle(ButtonStyle.Secondary)
      );
    });

    rows.push(row);
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("embed_colors_more").setLabel("MORE COLORS").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("embed_set_color").setLabel("🎨 CUSTOM HEX").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("panel_embed").setLabel("⬅ BACK").setStyle(ButtonStyle.Secondary)
    )
  );

  return interaction.update({ embeds: [embed], components: rows, ephemeral: true });
}

async function showColorPanelPage2(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("🎨 COLOR PALETTE — MORE COLORS")
    .setColor(getEmbedColor())
    .setDescription(`Aktualny kolor embedów: **${intToHex(getEmbedColor())}**`);

  const rows = [];

  for (let i = 16; i < COLOR_PRESETS.length; i += 4) {
    const row = new ActionRowBuilder();

    COLOR_PRESETS.slice(i, i + 4).forEach(color => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`color_${color.id}`)
          .setLabel(color.label)
          .setStyle(ButtonStyle.Secondary)
      );
    });

    rows.push(row);
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("embed_colors").setLabel("COLORS 1").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("embed_set_color").setLabel("🎨 CUSTOM HEX").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("panel_embed").setLabel("BACK").setStyle(ButtonStyle.Secondary)
    )
  );

  return interaction.update({ embeds: [embed], components: rows, ephemeral: true });
}

async function showColorApplied(interaction, color) {
  THEME.color = hexToInt(color.hex);
  saveJSON(FILE_THEME, THEME);

  const embed = new EmbedBuilder()
    .setTitle(`${color.label} selected`)
    .setColor(THEME.color)
    .setDescription(
      `Ustawiono kolor embedów na: **${color.hex}**\n\n` +
      "Tak będzie wyglądać belka koloru w powiadomieniach."
    )
    .addFields(
      { name: "Preview", value: "To jest testowy podgląd koloru.", inline: false }
    )
    .setTimestamp();

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("embed_colors").setLabel("🎨 COLORS").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("embed_preview").setLabel("PREVIEW EMBED").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("panel_embed").setLabel("BACK").setStyle(ButtonStyle.Secondary)
    )
  ];

  return interaction.update({ embeds: [embed], components: rows, ephemeral: true });
}

async function showKeywordsPanel(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("⭐ KEYWORDS PANEL")
    .setColor(getEmbedColor())
    .setDescription(
      "Special keywords decydują, czy produkt jest oznaczany jako SPECIAL EDITION.\n\n" +
      SPECIAL_KEYWORDS.slice(0, 40).map(k => `\`${k}\``).join(", ")
    );

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("keywords_list").setLabel("LIST").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("keywords_add").setLabel("ADD").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("keywords_remove").setLabel("REMOVE").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("keywords_reset").setLabel("RESET").setStyle(ButtonStyle.Secondary)
    ),
    buildBackRow()
  ];

  return interaction.update({ embeds: [embed], components: rows, ephemeral: true });
}

async function showPriorityPanel(interaction) {
  const list = Object.entries(ARTISTS)
    .map(([name, cfg]) => `• **${name}**: ${cfg.roleId ? `<@&${cfg.roleId}>` : "brak"}`)
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle("🚨 PRIORITY ROLE PANEL")
    .setColor(getEmbedColor())
    .setDescription("Rola jest pingowana tylko przy special dropach danego artysty.\n\n" + list);

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("priority_set").setLabel("SET ROLE").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("priority_clear").setLabel("CLEAR ROLE").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("priority_list").setLabel("LIST").setStyle(ButtonStyle.Secondary)
    ),
    buildBackRow()
  ];

  return interaction.update({ embeds: [embed], components: rows, ephemeral: true });
}

async function showHistoryPanel(interaction) {
  const list = eventHistory
    .slice(-15)
    .reverse()
    .map(e => {
      const date = new Date(e.time).toLocaleString("pl-PL");
      return `• [${date}] **${e.type.toUpperCase()}** — ${e.name}`;
    })
    .join("\n") || "Brak historii.";

  const embed = new EmbedBuilder()
    .setTitle("📜 HISTORY PANEL")
    .setColor(getEmbedColor())
    .setDescription(list);

  return interaction.update({
    embeds: [embed],
    components: [buildBackRow()],
    ephemeral: true
  });
}

async function showConfigPanel(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("🧩 CONFIG PANEL")
    .setColor(getEmbedColor())
    .setDescription(
      `Shop: **${SHOP_BASE_URL}**\n` +
      `Check interval: **${CHECK_INTERVAL_MINUTES} min**\n` +
      `Mode: **${SETTINGS.mode}**\n` +
      `Heartbeat: **${SETTINGS.heartbeat ? "ON" : "OFF"} / ${formatMs(SETTINGS.heartbeatInterval)}**\n` +
      `Embed color: **${intToHex(getEmbedColor())}**\n` +
      `Artists: **${Object.keys(ARTISTS).length}**\n` +
      `Keywords: **${SPECIAL_KEYWORDS.length}**`
    );

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("panel_reload").setLabel("RELOAD").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("panel_clearcache").setLabel("CLEAR CACHE").setStyle(ButtonStyle.Danger)
    ),
    buildBackRow()
  ];

  return interaction.update({ embeds: [embed], components: rows, ephemeral: true });
}

async function showClearPanel(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("🧹 CLEAR PANEL")
    .setColor(getEmbedColor())
    .setDescription("Czyszczenie jest ograniczone do 1–100 wiadomości, żeby bot nie wisiał.\n\nKliknij przycisk i wpisz liczbę.");

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("clear_modal").setLabel("CLEAR CURRENT CHANNEL").setStyle(ButtonStyle.Danger)
    ),
    buildBackRow()
  ];

  return interaction.update({ embeds: [embed], components: rows, ephemeral: true });
}

// =====================================
// KOMENDY
// =====================================

const startTime = new Date();

const commands = [
  new SlashCommandBuilder()
    .setName("admin")
    .setDescription("Panel administracyjny")
    .addStringOption(opt =>
      opt.setName("action")
        .setDescription("Co chcesz zrobić?")
        .setRequired(true)
        .addChoices(
          { name: "reload", value: "reload" },
          { name: "run", value: "run" },
          { name: "stats", value: "stats" },
          { name: "vendors", value: "vendors" },
          { name: "clearcache", value: "clearcache" }
        )
    )
    .setContexts(InteractionContextType.Guild),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Lista wszystkich komend MusicDrop Bot")
    .setContexts(InteractionContextType.Guild),

  new SlashCommandBuilder()
    .setName("adminpanel")
    .setDescription("Interaktywny panel admina PRO z przyciskami")
    .setContexts(InteractionContextType.Guild),

  new SlashCommandBuilder()
    .setName("mode")
    .setDescription("Ustaw tryb pracy bota")
    .addStringOption(opt =>
      opt.setName("tryb")
        .setDescription("normal / silent / debug")
        .setRequired(true)
        .addChoices(
          { name: "NORMAL", value: "normal" },
          { name: "SILENT", value: "silent" },
          { name: "DEBUG", value: "debug" }
        )
    )
    .setContexts(InteractionContextType.Guild),

  new SlashCommandBuilder()
    .setName("priorityrole")
    .setDescription("Ustaw rolę pingowaną dla specjalnych dropów artysty")
    .addStringOption(opt =>
      opt.setName("artist")
        .setDescription("Nazwa artysty dokładnie jak w bocie, np. Taylor Swift")
        .setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName("role")
        .setDescription("Rola do pingowania")
        .setRequired(false)
    )
    .setContexts(InteractionContextType.Guild),

  new SlashCommandBuilder()
    .setName("keywords")
    .setDescription("Zarządzanie słowami specjalnymi")
    .addStringOption(opt =>
      opt.setName("action")
        .setDescription("Akcja")
        .setRequired(true)
        .addChoices(
          { name: "LIST", value: "list" },
          { name: "ADD", value: "add" },
          { name: "REMOVE", value: "remove" },
          { name: "RESET", value: "reset" }
        )
    )
    .addStringOption(opt =>
      opt.setName("word")
        .setDescription("Słowo do dodania/usunięcia")
        .setRequired(false)
    )
    .setContexts(InteractionContextType.Guild),

  new SlashCommandBuilder()
    .setName("history")
    .setDescription("Ostatnie zdarzenia bota")
    .setContexts(InteractionContextType.Guild),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Sprawdź czy bot działa")
    .setContexts(InteractionContextType.Guild),

  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Pełny status bota MusicDrop")
    .setContexts(InteractionContextType.Guild),

  new SlashCommandBuilder()
    .setName("uptime")
    .setDescription("Czas działania bota")
    .setContexts(InteractionContextType.Guild),

  new SlashCommandBuilder()
    .setName("test")
    .setDescription("Wyślij testowe powiadomienie")
    .setContexts(InteractionContextType.Guild),

  new SlashCommandBuilder()
    .setName("check")
    .setDescription("Natychmiastowe sprawdzenie sklepu")
    .setContexts(InteractionContextType.Guild),

  new SlashCommandBuilder()
    .setName("prices")
    .setDescription("Pokaż śledzone ceny produktów")
    .setContexts(InteractionContextType.Guild),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Wyczyść wiadomości na kanale")
    .addStringOption(opt =>
      opt.setName("amount")
        .setDescription("Liczba wiadomości 1-100 lub all")
        .setRequired(true)
    )
    .setContexts(InteractionContextType.Guild),

  new SlashCommandBuilder()
    .setName("clearallchannels")
    .setDescription("Wyczyść wszystkie kanały oprócz logów, admina i botów")
    .setContexts(InteractionContextType.Guild),

  new SlashCommandBuilder()
    .setName("heartbeat")
    .setDescription("Ustawienia automatycznych raportów działania bota")
    .addStringOption(opt =>
      opt.setName("mode")
        .setDescription("Co zrobić?")
        .setRequired(true)
        .addChoices(
          { name: "ON", value: "on" },
          { name: "OFF", value: "off" },
          { name: "SET TIME", value: "set" },
          { name: "STATUS", value: "status" }
        )
    )
    .addStringOption(opt =>
      opt.setName("czas")
        .setDescription("Np. 30m, 1h, 5h")
        .setRequired(false)
    )
    .setContexts(InteractionContextType.Guild),

  new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Edycja wyglądu powiadomień")
    .addSubcommand(sub =>
      sub.setName("kolor")
        .setDescription("Ustaw kolor embedów")
        .addStringOption(o =>
          o.setName("wartosc")
            .setDescription("Kolor HEX, np. #F1C40F")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("price")
        .setDescription("Ustaw etykietę PRICE")
        .addStringOption(o =>
          o.setName("wartosc")
            .setDescription("Nowa etykieta, np. PRICE / CENA / KOSZT")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("emoji")
        .setDescription("Ustaw emoji dla typu powiadomienia")
        .addStringOption(o =>
          o.setName("pole")
            .setDescription("Które emoji zmienić?")
            .setRequired(true)
            .addChoices(
              { name: "newProduct", value: "newProduct" },
              { name: "specialEdition", value: "specialEdition" },
              { name: "restock", value: "restock" },
              { name: "priceDrop", value: "priceDrop" },
              { name: "priceUp", value: "priceUp" },
              { name: "checkout", value: "checkout" },
              { name: "viewProduct", value: "viewProduct" },
              { name: "goToLatest", value: "goToLatest" }
            )
        )
        .addStringOption(o =>
          o.setName("wartosc")
            .setDescription("Nowe emoji")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("style")
        .setDescription("Ustaw styl embedów")
        .addStringOption(o =>
          o.setName("wartosc")
            .setDescription("compact | full | premium")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("preview")
        .setDescription("Podgląd aktualnego stylu embedów")
    )
    .setContexts(InteractionContextType.Guild)
];

// =====================================
// FUNKCJE CZASU
// =====================================

function getUptime() {
  const s = Math.floor((Date.now() - startTime.getTime()) / 1000);
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
}

function parseHeartbeatTime(input) {
  return parseTimeText(input);
}

function formatMs(ms) {
  const minutes = Math.round(ms / 60000);

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  if (restMinutes === 0) return `${hours}h`;

  return `${hours}h ${restMinutes}m`;
}

// =====================================
// HEARTBEAT DISCORD
// =====================================

let heartbeatLoopStarted = false;

async function sendHeartbeatReport() {
  if (!SETTINGS.heartbeat) return;

  try {
    const channel = await safeChannelFetch(LOG_CHANNEL_ID);
    if (!channel) return;

    await channel.send(
      "🟢 **MusicDrop Monitor ONLINE**\n\n" +
      `⏱ Uptime: ${getUptime()}\n` +
      `⚙️ Tryb: ${SETTINGS.mode.toUpperCase()}\n` +
      `🔍 Checki: ${checkCount}\n` +
      `📦 Produkty w pamięci: ${seenProducts.size}\n` +
      `📦 Aktywne produkty: ${lastActive.size}\n` +
      `💰 Ceny: ${Object.keys(trackedPrices).length}\n` +
      `🎨 Embed color: ${intToHex(getEmbedColor())}\n` +
      `🕒 Ostatni check: ${new Date(lastMonitorTime).toLocaleString("pl-PL")}\n` +
      `⏳ Interwał raportu: ${formatMs(SETTINGS.heartbeatInterval)}`
    );
  } catch (err) {
    error("Heartbeat send error:", err?.message || err);
  }
}

function startHeartbeatLoop() {
  if (heartbeatLoopStarted) return;
  heartbeatLoopStarted = true;

  const loop = async () => {
    await sendHeartbeatReport();

    const delay =
      typeof SETTINGS.heartbeatInterval === "number" && SETTINGS.heartbeatInterval >= 60000
        ? SETTINGS.heartbeatInterval
        : 5 * 60 * 60 * 1000;

    setTimeout(loop, delay);
  };

  setTimeout(loop, 15000);
}

// =====================================
// READY
// =====================================

client.once(Events.ClientReady, async (ready) => {
  log(`[Bot] Zalogowano jako: ${ready.user.tag}`);
  logToChannel(`Bot zalogowany jako: ${ready.user.tag}`);

  setTimeout(() => {
    try {
      ready.user.setActivity("MusicDrop.pl — Music Monitor", {
        type: ActivityType.Watching
      });
    } catch (err) {
      error("[Bot] Nie udało się ustawić statusu:", err?.message || err);
    }
  }, 5000);

  try {
    const rest = new REST().setToken(DISCORD_TOKEN);
    await rest.put(
      Routes.applicationCommands(ready.user.id),
      { body: commands.map(c => c.toJSON()) }
    );
    log("[Bot] Slash commands zarejestrowane!");
    logToChannel("Slash commands zarejestrowane.");
  } catch (err) {
    error("[Bot] Błąd rejestracji komend:", err?.message || err);
  }

  startHeartbeatLoop();
});

// =====================================
// INTERAKCJE
// =====================================

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isModalSubmit()) {
      if (!isAdminUser(interaction)) return adminOnlyReply(interaction);


      if (interaction.customId === "modal_heartbeat_time") {
        const value = interaction.fields.getTextInputValue("czas");
        const ms = parseHeartbeatTime(value);

        if (!ms) {
          return interaction.reply({
            content: "❌ Podaj poprawny czas, np. `30m`, `1h`, `5h`.",
            ephemeral: true
          });
        }

        SETTINGS.heartbeatInterval = ms;
        SETTINGS.heartbeat = true;
        saveJSON(FILE_SETTINGS, SETTINGS);

        return interaction.reply({
          content: `✅ Heartbeat ustawiony na **${value}** i włączony.`,
          ephemeral: true
        });
      }

      if (interaction.customId === "modal_keyword_add") {
        const word = interaction.fields.getTextInputValue("word").trim();

        if (!word) {
          return interaction.reply({ content: "❌ Puste słowo.", ephemeral: true });
        }

        if (!SPECIAL_KEYWORDS.includes(word)) {
          SPECIAL_KEYWORDS.push(word);
          saveJSON(FILE_KEYWORDS, SPECIAL_KEYWORDS);
        }

        return interaction.reply({ content: `✅ Dodano keyword: **${word}**`, ephemeral: true });
      }

      if (interaction.customId === "modal_keyword_remove") {
        const word = interaction.fields.getTextInputValue("word").trim();

        SPECIAL_KEYWORDS = SPECIAL_KEYWORDS.filter(k => k !== word);
        saveJSON(FILE_KEYWORDS, SPECIAL_KEYWORDS);

        return interaction.reply({ content: `🗑 Usunięto keyword: **${word}**`, ephemeral: true });
      }

      if (interaction.customId === "modal_priority_set") {
        const artist = interaction.fields.getTextInputValue("artist").trim();
        const roleId = interaction.fields.getTextInputValue("roleid").trim();

        if (!ARTISTS[artist]) {
          return interaction.reply({
            content: `❌ Nie znam artysty **${artist}**. Użyj dokładnej nazwy, np. Taylor Swift.`,
            ephemeral: true
          });
        }

        ARTISTS[artist].roleId = roleId || null;
        saveJSON(FILE_ARTISTS, ARTISTS);

        return interaction.reply({
          content: roleId
            ? `✅ Ustawiono rolę dla **${artist}**: <@&${roleId}>`
            : `✅ Usunięto rolę dla **${artist}**.`,
          ephemeral: true
        });
      }

      if (interaction.customId === "modal_priority_clear") {
        const artist = interaction.fields.getTextInputValue("artist").trim();

        if (!ARTISTS[artist]) {
          return interaction.reply({
            content: `❌ Nie znam artysty **${artist}**. Użyj dokładnej nazwy, np. Taylor Swift.`,
            ephemeral: true
          });
        }

        ARTISTS[artist].roleId = null;
        saveJSON(FILE_ARTISTS, ARTISTS);

        return interaction.reply({
          content: `✅ Usunięto rolę priority dla **${artist}**.`,
          ephemeral: true
        });
      }

      if (interaction.customId === "modal_embed_color") {
        const value = interaction.fields.getTextInputValue("color").trim();
        const parsed = parseInt(value.replace("#", ""), 16);

        if (Number.isNaN(parsed)) {
          return interaction.reply({ content: "❌ Niepoprawny kolor. Przykład: `#F1C40F`.", ephemeral: true });
        }

        THEME.color = parsed;
        saveJSON(FILE_THEME, THEME);

        const embed = new EmbedBuilder()
          .setTitle("🎨 Custom HEX selected")
          .setColor(THEME.color)
          .setDescription(`Ustawiono kolor embedów na **${value}**.`);

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (interaction.customId === "modal_embed_price") {
        const value = interaction.fields.getTextInputValue("price").trim();

        THEME.labels.price = value || "PRICE";
        saveJSON(FILE_THEME, THEME);

        return interaction.reply({ content: `🏷 Etykieta ceny ustawiona na **${THEME.labels.price}**.`, ephemeral: true });
      }

      if (interaction.customId === "modal_clear") {
        const amount = interaction.fields.getTextInputValue("amount").trim();
        const num = parseInt(amount, 10);

        if (Number.isNaN(num) || num < 1 || num > 100) {
          return interaction.reply({
            content: "❌ Podaj liczbę 1–100.",
            ephemeral: true
          });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
          const deleted = await interaction.channel.bulkDelete(num, true);
          return interaction.editReply(`🧹 Usunięto **${deleted.size}** wiadomości.`);
        } catch (err) {
          error("CLEAR MODAL ERROR:", err?.message || err);
          return interaction.editReply("❌ Nie udało się usunąć wiadomości. Sprawdź uprawnienia Manage Messages.");
        }
      }

      return;
    }

    if (interaction.isButton()) {
      if (!isAdminUser(interaction)) return adminOnlyReply(interaction);

      const id = interaction.customId;

      if (id === "panel_back") return sendAdminMain(interaction, true);

      if (id === "panel_monitor") return showMonitorPanel(interaction);
      if (id === "panel_heartbeat") return showHeartbeatPanel(interaction);
      if (id === "panel_mode") return showModePanel(interaction);
      if (id === "panel_embed") return showEmbedPanel(interaction);
      if (id === "embed_colors") return showColorPanel(interaction);
      if (id === "embed_colors_more") return showColorPanelPage2(interaction);
      if (id === "panel_keywords") return showKeywordsPanel(interaction);
      if (id === "panel_priority") return showPriorityPanel(interaction);
      if (id === "panel_history") return showHistoryPanel(interaction);
      if (id === "panel_config") return showConfigPanel(interaction);
      if (id === "panel_clear") return showClearPanel(interaction);


      if (id.startsWith("color_")) {
        const colorId = id.replace("color_", "");
        const color = getColorPresetById(colorId);

        if (!color) {
          return interaction.reply({ content: "❌ Nie znaleziono koloru.", ephemeral: true });
        }

        return showColorApplied(interaction, color);
      }

      if (id === "panel_status" || id === "monitor_status") {
        return interaction.reply({
          content:
            `📊 **Status bota:**\n` +
            `• Uptime: ${getUptime()}\n` +
            `• Tryb: ${SETTINGS.mode.toUpperCase()}\n` +
            `• Seen: ${seenProducts.size}\n` +
            `• Active: ${lastActive.size}\n` +
            `• Prices: ${Object.keys(trackedPrices).length}\n` +
            `• Heartbeat: ${SETTINGS.heartbeat ? "ON" : "OFF"} (${formatMs(SETTINGS.heartbeatInterval)})\n` +
            `• Embed color: ${intToHex(getEmbedColor())}\n` +
            `• Last monitor: ${new Date(lastMonitorTime).toLocaleString("pl-PL")}\n` +
            `• Queue: ${sendQueue.length}`,
          ephemeral: true
        });
      }

      if (id === "panel_help") {
        return interaction.reply({
          content: "📖 Użyj `/help`, żeby zobaczyć pełną listę komend.",
          ephemeral: true
        });
      }

      if (id === "panel_reload") {
        seenProducts = new Set(loadJSON(FILE_SEEN, []));
        trackedPrices = loadJSON(FILE_PRICES, {});
        lastActive = new Set(loadJSON(FILE_ACTIVE, []));
        vendorMap = loadJSON(FILE_VENDORS, {});
        SETTINGS = loadJSON(FILE_SETTINGS, SETTINGS);
        ARTISTS = loadJSON(FILE_ARTISTS, ARTISTS);
        SPECIAL_KEYWORDS = loadJSON(FILE_KEYWORDS, SPECIAL_KEYWORDS);

        return interaction.reply({ content: "🔄 Przeładowano konfigurację.", ephemeral: true });
      }

      if (id === "panel_clearcache") {
        seenProducts = new Set();
        trackedPrices = {};
        lastActive = new Set();

        saveJSON(FILE_SEEN, []);
        saveJSON(FILE_PRICES, {});
        saveJSON(FILE_ACTIVE, []);

        return interaction.reply({ content: "🧹 Cache MusicDrop wyczyszczony.", ephemeral: true });
      }

      if (id === "monitor_run") {
        await interaction.deferReply({ ephemeral: true });
        await runCheck(client);
        return interaction.editReply("🟣 Monitoring uruchomiony ręcznie.");
      }

      if (id === "monitor_prices") {
        const list = Object.values(trackedPrices)
          .slice(0, 20)
          .map(p => {
            if (p.regularPrice && p.regularPrice !== p.price) {
              return `• ${p.name} — ${p.regularPrice} → ${p.price}`;
            }
            return `• ${p.name} — ${p.price}`;
          })
          .join("\n") || "Brak śledzonych produktów.";

        return interaction.reply({ content: "💰 Śledzone ceny:\n" + list, ephemeral: true });
      }

      if (id === "heartbeat_on") {
        SETTINGS.heartbeat = true;
        saveJSON(FILE_SETTINGS, SETTINGS);
        return showHeartbeatPanel(interaction);
      }

      if (id === "heartbeat_off") {
        SETTINGS.heartbeat = false;
        saveJSON(FILE_SETTINGS, SETTINGS);
        return showHeartbeatPanel(interaction);
      }

      if (id === "heartbeat_status") {
        return interaction.reply({
          content:
            `📡 Heartbeat: **${SETTINGS.heartbeat ? "ON" : "OFF"}**\n` +
            `⏳ Interwał: **${formatMs(SETTINGS.heartbeatInterval)}**\n` +
            `📍 Kanał: <#${LOG_CHANNEL_ID}>`,
          ephemeral: true
        });
      }

      if (id === "heartbeat_set") {
        return interaction.showModal(makeModal("modal_heartbeat_time", "Ustaw heartbeat", "czas", "Czas, np. 30m, 1h, 5h", "5h"));
      }

      if (id === "mode_normal" || id === "mode_silent" || id === "mode_debug") {
        SETTINGS.mode = id.replace("mode_", "");
        saveJSON(FILE_SETTINGS, SETTINGS);
        return showModePanel(interaction);
      }

      if (id === "embed_set_color") {
        return interaction.showModal(makeModal("modal_embed_color", "Ustaw kolor embedów", "color", "Kolor HEX", "#F1C40F"));
      }

      if (id === "embed_set_price") {
        return interaction.showModal(makeModal("modal_embed_price", "Ustaw etykietę ceny", "price", "Nazwa pola ceny", "PRICE"));
      }

      if (id === "embed_preview") {
        const dummy = {
          name: "PREVIEW PRODUCT",
          url: "https://musicdrop.pl",
          variantId: "123456789",
          price: "99,99 zł",
          regularPrice: "149,99 zł",
          discountPercent: 34,
          isSoldOut: false,
          thumbnail: ""
        };

        const embed = buildBaseEmbed(dummy).addFields(
          { name: THEME.labels.newProduct, value: dummy.name, inline: false },
          { name: THEME.labels.price, value: buildPriceLine(dummy), inline: false },
          { name: THEME.labels.discord, value: DISCORD_INVITE, inline: false },
          buildCheckoutField(dummy)
        );

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (id === "keywords_list") {
        return interaction.reply({
          content: "⭐ Special keywords:\n```txt\n" + SPECIAL_KEYWORDS.join(", ") + "\n```",
          ephemeral: true
        });
      }

      if (id === "keywords_add") {
        return interaction.showModal(makeModal("modal_keyword_add", "Dodaj keyword", "word", "Słowo", "signed"));
      }

      if (id === "keywords_remove") {
        return interaction.showModal(makeModal("modal_keyword_remove", "Usuń keyword", "word", "Słowo", "signed"));
      }

      if (id === "keywords_reset") {
        SPECIAL_KEYWORDS = DEFAULT_SPECIAL_KEYWORDS;
        saveJSON(FILE_KEYWORDS, SPECIAL_KEYWORDS);
        return showKeywordsPanel(interaction);
      }

      if (id === "priority_list") return showPriorityPanel(interaction);

      if (id === "priority_set") {
        return interaction.showModal(makeTwoInputModal(
          "modal_priority_set",
          "Ustaw priority role",
          "artist",
          "Artysta",
          "Taylor Swift",
          "roleid",
          "ID roli",
          "123456789012345678",
          true
        ));
      }

      if (id === "priority_clear") {
        return interaction.showModal(makeModal("modal_priority_clear", "Usuń priority role", "artist", "Artysta", "Taylor Swift"));
      }

      if (id === "clear_modal") {
        return interaction.showModal(makeModal("modal_clear", "Wyczyść kanał", "amount", "Liczba wiadomości 1-100", "50"));
      }

      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === "help") {
      const embed = new EmbedBuilder()
        .setTitle("🎧 MusicDrop Monitor — HELP")
        .setColor(getEmbedColor())
        .setDescription("Pełna lista dostępnych komend bota.")
        .addFields(
          {
            name: "🟢 Status bota",
            value:
              "`/ping` — sprawdza czy bot odpowiada\n" +
              "`/status` — pełny status bota\n" +
              "`/uptime` — czas działania bota"
          },
          {
            name: "🔍 Monitoring MusicDrop",
            value:
              "`/check` — ręczne sprawdzenie MusicDrop\n" +
              "`/prices` — lista zapisanych cen\n" +
              "`/history` — ostatnie zdarzenia\n" +
              "`/test` — testowe powiadomienie"
          },
          {
            name: "⚙️ Tryby",
            value:
              "`/mode tryb:normal` — zwykła praca\n" +
              "`/mode tryb:silent` — monitoruje, ale nie wysyła dropów\n" +
              "`/mode tryb:debug` — więcej logów diagnostycznych"
          },
          {
            name: "💓 Heartbeat",
            value:
              "`/heartbeat mode:on` — włącza raport\n" +
              "`/heartbeat mode:off` — wyłącza raport\n" +
              "`/heartbeat mode:set czas:30m` — raport co 30 minut\n" +
              "`/heartbeat mode:set czas:5h` — raport co 5 godzin\n" +
              "`/heartbeat mode:status` — status heartbeat"
          },
          {
            name: "🎨 Kolory embedów",
            value:
              "`/adminpanel` → EMBED → COLORS\n" +
              "Dostępna jest duża paleta kolorów z podglądem oraz CUSTOM HEX."
          },
          {
            name: "⭐ Special drops",
            value:
              "`/priorityrole artist:Taylor Swift role:@rola` — ustawia ping roli\n" +
              "`/priorityrole artist:Taylor Swift` — usuwa ping roli\n" +
              "`/keywords action:list` — lista słów specjalnych\n" +
              "`/keywords action:add word:signed` — dodaj słowo\n" +
              "`/keywords action:remove word:signed` — usuń słowo\n" +
              "`/keywords action:reset` — reset słów"
          },
          {
            name: "🛒 Checkout",
            value:
              "Powiadomienia MusicDrop zawierają linki:\n" +
              "`🛒 1x` `🛒 2x` `🛒 3x` `🛒 4x`"
          }
        )
        .setFooter({ text: "MusicDrop ULTRA PRO" })
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    if (commandName === "adminpanel") {
      if (!isAdminUser(interaction)) return adminOnlyReply(interaction);
      return sendAdminMain(interaction, false);
    }


    if (commandName === "mode") {
      if (!isAdminUser(interaction)) return adminOnlyReply(interaction);

      const mode = interaction.options.getString("tryb");
      SETTINGS.mode = mode;
      saveJSON(FILE_SETTINGS, SETTINGS);

      return interaction.reply(
        `⚙️ Tryb bota ustawiony na: **${mode.toUpperCase()}**`
      );
    }

    if (commandName === "priorityrole") {
      if (!isAdminUser(interaction)) return adminOnlyReply(interaction);

      const artist = interaction.options.getString("artist");
      const role = interaction.options.getRole("role");

      if (!ARTISTS[artist]) {
        return interaction.reply({
          content:
            `❌ Nie znam artysty: **${artist}**\n\n` +
            `Dostępni artyści:\n${Object.keys(ARTISTS).map(a => `• ${a}`).join("\n")}`,
          ephemeral: true
        });
      }

      ARTISTS[artist].roleId = role ? role.id : null;
      saveJSON(FILE_ARTISTS, ARTISTS);

      return interaction.reply(
        role
          ? `🚨 Rola specjalnych dropów dla **${artist}** ustawiona na ${role}.`
          : `🚨 Usunięto rolę pingowania dla **${artist}**.`
      );
    }

    if (commandName === "keywords") {
      if (!isAdminUser(interaction)) return adminOnlyReply(interaction);

      const action = interaction.options.getString("action");
      const word = interaction.options.getString("word");

      if (action === "list") {
        return interaction.reply({
          content: "⭐ Special keywords:\n```txt\n" + SPECIAL_KEYWORDS.join(", ") + "\n```",
          ephemeral: true
        });
      }

      if (action === "add") {
        if (!word) return interaction.reply({ content: "❌ Podaj słowo.", ephemeral: true });

        if (!SPECIAL_KEYWORDS.includes(word)) {
          SPECIAL_KEYWORDS.push(word);
          saveJSON(FILE_KEYWORDS, SPECIAL_KEYWORDS);
        }

        return interaction.reply(`✅ Dodano special keyword: **${word}**`);
      }

      if (action === "remove") {
        if (!word) return interaction.reply({ content: "❌ Podaj słowo.", ephemeral: true });

        SPECIAL_KEYWORDS = SPECIAL_KEYWORDS.filter(k => k !== word);
        saveJSON(FILE_KEYWORDS, SPECIAL_KEYWORDS);

        return interaction.reply(`🗑 Usunięto special keyword: **${word}**`);
      }

      if (action === "reset") {
        SPECIAL_KEYWORDS = DEFAULT_SPECIAL_KEYWORDS;
        saveJSON(FILE_KEYWORDS, SPECIAL_KEYWORDS);

        return interaction.reply("♻️ Przywrócono domyślne special keywords.");
      }
    }

    if (commandName === "history") {
      const list = eventHistory
        .slice(-15)
        .reverse()
        .map(e => {
          const date = new Date(e.time).toLocaleString("pl-PL");
          return `• [${date}] ${e.type.toUpperCase()} — ${e.name}`;
        })
        .join("\n") || "Brak historii.";

      return interaction.reply({
        content: "📜 Ostatnie zdarzenia:\n" + list,
        ephemeral: true
      });
    }

    if (commandName === "admin") {
      if (!isAdminUser(interaction)) return adminOnlyReply(interaction);

      const action = interaction.options.getString("action");

      if (action === "reload") {
        seenProducts = new Set(loadJSON(FILE_SEEN, []));
        trackedPrices = loadJSON(FILE_PRICES, {});
        lastActive = new Set(loadJSON(FILE_ACTIVE, []));
        vendorMap = loadJSON(FILE_VENDORS, {});
        SETTINGS = loadJSON(FILE_SETTINGS, SETTINGS);
        ARTISTS = loadJSON(FILE_ARTISTS, ARTISTS);
        SPECIAL_KEYWORDS = loadJSON(FILE_KEYWORDS, SPECIAL_KEYWORDS);
        return interaction.reply("🔄 Przeładowano konfigurację.");
      }

      if (action === "run") {
        await interaction.deferReply();
        await runCheck(client);
        return interaction.editReply("🟣 Monitoring uruchomiony ręcznie.");
      }

      if (action === "stats") {
        return interaction.reply(
          `📊 Statystyki:\n` +
          `• Mode: ${SETTINGS.mode}\n` +
          `• Seen: ${seenProducts.size}\n` +
          `• Active: ${lastActive.size}\n` +
          `• Prices: ${Object.keys(trackedPrices).length}\n` +
          `• Embed color: ${intToHex(getEmbedColor())}\n` +
          `• Heartbeat: ${SETTINGS.heartbeat ? "ON" : "OFF"} (${formatMs(SETTINGS.heartbeatInterval)})`
        );
      }

      if (action === "vendors") {
        return interaction.reply("📦 Vendor map:\n```json\n" + JSON.stringify(vendorMap, null, 2) + "\n```");
      }

      if (action === "clearcache") {
        seenProducts = new Set();
        trackedPrices = {};
        lastActive = new Set();
        saveJSON(FILE_SEEN, []);
        saveJSON(FILE_PRICES, {});
        saveJSON(FILE_ACTIVE, []);
        return interaction.reply("🧹 Cache wyczyszczony.");
      }

      return;
    }

    if (commandName === "heartbeat") {
      if (!isAdminUser(interaction)) return adminOnlyReply(interaction);

      const mode = interaction.options.getString("mode");
      const czas = interaction.options.getString("czas");

      if (mode === "on") {
        SETTINGS.heartbeat = true;
        saveJSON(FILE_SETTINGS, SETTINGS);

        return interaction.reply(
          `🟢 Heartbeat **WŁĄCZONY**.\nInterwał: **${formatMs(SETTINGS.heartbeatInterval)}**`
        );
      }

      if (mode === "off") {
        SETTINGS.heartbeat = false;
        saveJSON(FILE_SETTINGS, SETTINGS);

        return interaction.reply("🔴 Heartbeat **WYŁĄCZONY**.");
      }

      if (mode === "set") {
        const ms = parseHeartbeatTime(czas);

        if (!ms) {
          return interaction.reply({
            content: "❌ Podaj poprawny czas, np. `30m`, `1h`, `5h`.",
            ephemeral: true
          });
        }

        SETTINGS.heartbeatInterval = ms;
        SETTINGS.heartbeat = true;
        saveJSON(FILE_SETTINGS, SETTINGS);

        return interaction.reply(
          `⏱ Heartbeat ustawiony na: **${czas}**.\n🟢 Heartbeat został też **WŁĄCZONY**.`
        );
      }

      if (mode === "status") {
        return interaction.reply(
          `📡 **Heartbeat status**\n\n` +
          `Status: ${SETTINGS.heartbeat ? "🟢 ON" : "🔴 OFF"}\n` +
          `Interwał: **${formatMs(SETTINGS.heartbeatInterval)}**\n` +
          `Kanał: <#${LOG_CHANNEL_ID}>`
        );
      }

      return;
    }

    if (commandName === "clear") {
      const amount = interaction.options.getString("amount");

      if (!isAdminUser(interaction)) return adminOnlyReply(interaction);

      const channel = interaction.channel;

      if (amount === "all") {
        return interaction.reply({
          content: "⚠️ `all` może trwać bardzo długo. Użyj np. `/clear amount:100`.",
          ephemeral: true
        });
      }

      const num = parseInt(amount, 10);

      if (isNaN(num) || num < 1 || num > 100) {
        return interaction.reply({
          content: "❌ Podaj liczbę 1–100.",
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        const deleted = await channel.bulkDelete(num, true);

        return interaction.editReply(
          `🧹 Usunięto **${deleted.size}** wiadomości.`
        );
      } catch (err) {
        error("CLEAR ERROR:", err?.message || err);

        return interaction.editReply(
          "❌ Nie udało się usunąć wiadomości. Sprawdź, czy bot ma **Manage Messages**."
        );
      }
    }

    if (commandName === "clearallchannels") {
      if (!isAdminUser(interaction)) return adminOnlyReply(interaction);

      return interaction.reply({
        content: "⚠️ Ta funkcja jest celowo zablokowana, żeby bot nie wisiał zbyt długo. Czyść kanały pojedynczo przez `/clear amount:100`.",
        ephemeral: true
      });
    }

    if (commandName === "embed") {
      if (!isAdminUser(interaction)) return adminOnlyReply(interaction);

      const sub = interaction.options.getSubcommand();

      if (sub === "kolor") {
        const value = interaction.options.getString("wartosc");
        THEME.color = parseInt(value.replace("#", ""), 16) || DEFAULT_THEME.color;
        saveJSON(FILE_THEME, THEME);
        return interaction.reply("🎨 Zmieniono kolor embedów.");
      }

      if (sub === "price") {
        const value = interaction.options.getString("wartosc");
        THEME.labels.price = value;
        saveJSON(FILE_THEME, THEME);
        return interaction.reply("🏷 Zmieniono etykietę PRICE.");
      }

      if (sub === "emoji") {
        const field = interaction.options.getString("pole");
        const value = interaction.options.getString("wartosc");
        THEME.emoji[field] = value;
        saveJSON(FILE_THEME, THEME);
        return interaction.reply(`😎 Zmieniono emoji dla: ${field}.`);
      }

      if (sub === "style") {
        const value = interaction.options.getString("wartosc");
        THEME.style = value;
        saveJSON(FILE_THEME, THEME);
        return interaction.reply(`✨ Zmieniono styl embedów na: ${value}.`);
      }

      if (sub === "preview") {
        const dummy = {
          name: "PREVIEW PRODUCT",
          url: "https://musicdrop.pl",
          variantId: "123456789",
          price: "99,99 zł",
          regularPrice: "149,99 zł",
          discountPercent: 34,
          isSoldOut: false,
          thumbnail: ""
        };

        const embed = buildBaseEmbed(dummy).addFields(
          { name: THEME.labels.newProduct, value: dummy.name, inline: false },
          { name: THEME.labels.price, value: buildPriceLine(dummy), inline: false },
          { name: THEME.labels.discord, value: DISCORD_INVITE, inline: false },
          buildCheckoutField(dummy)
        );

        return interaction.reply({ embeds: [embed] });
      }

      return;
    }

    if (commandName === "ping") {
      return interaction.reply("🏓 Pong!");
    }

    if (commandName === "status") {
      return interaction.reply(
        `📊 **Status bota:**\n` +
        `• Uptime: ${getUptime()}\n` +
        `• Tryb: ${SETTINGS.mode.toUpperCase()}\n` +
        `• Seen: ${seenProducts.size}\n` +
        `• Active: ${lastActive.size}\n` +
        `• Prices: ${Object.keys(trackedPrices).length}\n` +
        `• Embed color: ${intToHex(getEmbedColor())}\n` +
        `• Heartbeat: ${SETTINGS.heartbeat ? "ON" : "OFF"} (${formatMs(SETTINGS.heartbeatInterval)})\n` +
        `• Last monitor: ${new Date(lastMonitorTime).toLocaleString("pl-PL")}\n` +
        `• Queue: ${sendQueue.length}`
      );
    }

    if (commandName === "uptime") {
      return interaction.reply(`⏱ Uptime: ${getUptime()}`);
    }

    if (commandName === "check") {
      await interaction.deferReply();
      await runCheck(client);
      return interaction.editReply("🟣 Monitoring uruchomiony ręcznie.");
    }

    if (commandName === "prices") {
      const list = Object.values(trackedPrices)
        .slice(0, 20)
        .map(p => {
          if (p.regularPrice && p.regularPrice !== p.price) {
            return `• ${p.name} — ${p.regularPrice} → ${p.price}`;
          }
          return `• ${p.name} — ${p.price}`;
        })
        .join("\n") || "Brak śledzonych produktów.";

      return interaction.reply("💰 Śledzone ceny:\n" + list);
    }

    if (commandName === "test") {
      if (!isAdminUser(interaction)) return adminOnlyReply(interaction);

      const channel = interaction.channel;
      const dummy = {
        name: "TEST PRODUCT",
        url: "https://musicdrop.pl",
        variantId: "123456789",
        price: "99,99 zł",
        regularPrice: "149,99 zł",
        discountPercent: 34,
        isSoldOut: false,
        thumbnail: "",
        isSpecial: true
      };

      await sendNewProduct(client, channel.id, dummy, "TEST", null);
      return interaction.reply({ content: "✅ Wysłano testowe powiadomienie.", ephemeral: true });
    }

  } catch (err) {
    error("Interaction error:", err?.message || err);
  }
});

// =====================================
// CRON MUSICDROP
// =====================================

let monitorRunning = false;

cron.schedule(`*/${CHECK_INTERVAL_MINUTES} * * * *`, async () => {
  if (monitorRunning) {
    log("[Cron] Pomijam — poprzedni monitoring nadal trwa.");
    return;
  }

  monitorRunning = true;

  try {
    log("[Cron] Automatyczne sprawdzenie sklepu…");
    await runCheck(client);
  } catch (err) {
    error("[Cron] Błąd monitoringu:", err?.message || err);
  } finally {
    monitorRunning = false;
  }
});

// =====================================
// START
// =====================================

async function startBot() {
  try {
    await client.login(DISCORD_TOKEN);
  } catch (err) {
    error("[Bot] Błąd logowania, ponawiam za 5s:", err?.message || err);
    setTimeout(startBot, 5000);
  }
}

startBot();

process.stdin.resume();

setInterval(() => {
  const diff = Date.now() - lastScrape;

  if (diff > CHECK_INTERVAL_MINUTES * 3 * 60 * 1000) {
    error("[Watchdog] Brak świeżego scrape — uruchamiam kontrolny check.");
    runCheck(client).catch(err => error("[Watchdog] Check error:", err?.message || err));
  }
}, 60000);

