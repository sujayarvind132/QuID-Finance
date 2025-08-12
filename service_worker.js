// service_worker.js
const NSE_HEADERS = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'en-IN,en;q=0.9',
  'cache-control': 'no-cache',
  'pragma': 'no-cache',
  'sec-fetch-site': 'same-site',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('refreshSymbolCache', { periodInMinutes: 360 });
  chrome.alarms.create('refreshHolidayCache', { periodInMinutes: 720 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'refreshSymbolCache') {
    chrome.storage.local.get(['exchange'], async ({ exchange = 'NSE' }) => {
      const list = await fetchNseSymbolList();
      if (list) chrome.storage.local.set({ nse_symbols_cache: list, nse_symbols_ts: Date.now() });
    });
  }
  if (alarm.name === 'refreshHolidayCache') {
    const holidays = await fetchNseHolidays();
    if (holidays) chrome.storage.local.set({ nse_holidays: holidays, nse_holidays_ts: Date.now() });
  }
});

async function fetchNseSymbolList() {
  try {
    // Fallback: use local cached file bundled in extension if network fails
    // Unofficial: NSE instruments page or indices list. Prefer broker APIs if authenticated.
    const resp = await fetch('https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050', { headers: NSE_HEADERS, credentials: 'include' });
    if (!resp.ok) throw new Error('NSE indices list failed');
    const json = await resp.json();
    const symbols = (json?.data || []).map(x => x?.symbol).filter(Boolean);
    return symbols;
  } catch (e) {
    const url = chrome.runtime.getURL('data/nse_symbols_cache.json');
    const fallback = await fetch(url).then(r => r.json()).catch(() => null);
    return fallback;
  }
}

async function fetchNseHolidays() {
  try {
    const resp = await fetch('https://www.nseindia.com/api/holiday-master?type=trading', { headers: NSE_HEADERS, credentials: 'include' });
    if (!resp.ok) throw new Error('NSE holiday API failed');
    return await resp.json();
  } catch (e) {
    const url = chrome.runtime.getURL('data/nse_holidays_2025.json');
    const fallback = await fetch(url).then(r => r.json()).catch(() => null);
    return fallback;
  }
}

// Unified fetch proxy for content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === 'fetchOHLC') {
        const res = await fetch(msg.url, { headers: msg.headers || {}, credentials: 'include' });
        const text = await res.text();
        sendResponse({ ok: res.ok, status: res.status, data: text });
      } else if (msg.type === 'getSymbolCache') {
        const store = await chrome.storage.local.get(['nse_symbols_cache']);
        sendResponse({ symbols: store.nse_symbols_cache || [] });
      } else if (msg.type === 'getHolidays') {
        const store = await chrome.storage.local.get(['nse_holidays']);
        sendResponse({ holidays: store.nse_holidays || [] });
      } else {
        sendResponse({ error: 'Unknown message type' });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
  })();
  return true;
});
