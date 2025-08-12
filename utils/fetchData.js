import { toYahooSymbol, toAlphaSymbol } from './symbolMap.js';
import { getSettings } from './storage.js';

function sendWorkerFetch(url, headers) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'fetchOHLC', url, headers }, res => resolve(res));
  });
}

export async function fetchCandles(symbol, interval, settings) {
  const sym = (settings.symbolOverride || symbol).toUpperCase();
  const tf = interval;

  // Priority 1: Zerodha/Upstox backend (if configured)
  if (settings.backendUrl) {
    const data = await fetchBrokerBackend(settings.backendUrl, sym, tf);
    if (data?.length) return data;
  }

  // Priority 2: NSE public intraday/index snapshots when they work (limited)
  const nse = await fetchNSE(sym, tf);
  if (nse?.length) return nse;

  // Priority 3: Yahoo Finance India
  const yh = await fetchYahoo(sym, tf);
  if (yh?.length) return yh;

  // Priority 4: Alpha Vantage (needs API key)
  if (settings.alphaKey) {
    const av = await fetchAlphaVantage(sym, tf, settings.alphaKey);
    if (av?.length) return av;
  }

  throw new Error('All data providers failed');
}

async function fetchBrokerBackend(base, symbol, interval) {
  try {
    const url = `${base.replace(/\/$/,'')}/hist?exchange=NSE&symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(mapInterval(interval))}&limit=1000`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Backend failed');
    const json = await res.json();
    return normalize(json);
  } catch { return null; }
}

function mapInterval(tf) {
  if (tf === '1d') return 'day';
  if (tf === '15m') return '15minute';
  if (tf === '5m') return '5minute';
  return 'day';
}

// Limited NSE endpoints; this may not always provide historical candles.
async function fetchNSE(symbol, interval) {
  try {
    // Example intraday index endpoint; for equities intraday/historical, NSE protects via Akamai. Handle failures gracefully.
    if (interval !== '1d') return null;
    const url = `https://www.nseindia.com/api/chart-databyindex?index=${encodeURIComponent(symbol)}`;
    const res = await sendWorkerFetch(url);
    if (!res?.ok) return null;
    const json = JSON.parse(res.data);
    // Transform json to candles if format matches
    const series = json?.grapthData || json?.data || [];
    const candles = series.map(x => ({ t: new Date(x[0]), o:null, h:null, l:null, c:x[1], v:null }));
    return fillOHLCFromClose(candles);
  } catch { return null; }
}

async function fetchYahoo(symbol, interval) {
  try {
    const yahooSym = toYahooSymbol(symbol);
    const range = interval === '1d' ? '2y' : '5d';
    const yfInterval = interval === '1d' ? '1d' : (interval === '15m' ? '15m' : '5m');
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=${range}&interval=${yfInterval}&events=div,splits`;
    const res = await sendWorkerFetch(url);
    if (!res?.ok) return null;
    const json = JSON.parse(res.data);
    const r = json?.chart?.result?.[0];
    const ts = r?.timestamp || [];
    const o = r?.indicators?.quote?.[0]?.open || [];
    const h = r?.indicators?.quote?.[0]?.high || [];
    const l = r?.indicators?.quote?.[0]?.low || [];
    const c = r?.indicators?.quote?.[0]?.close || [];
    const v = r?.indicators?.quote?.[0]?.volume || [];
    const candles = ts.map((t, i) => ({
      t: new Date((t*1000)),
      o: o[i], h: h[i], l: l[i], c: c[i], v: v[i]
    })).filter(x => Number.isFinite(x.c));
    return candles;
  } catch { return null; }
}

async function fetchAlphaVantage(symbol, interval, key) {
  try {
    if (interval === '1d') {
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(toAlphaSymbol(symbol))}&outputsize=full&apikey=${key}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      const series = json['Time Series (Daily)'];
      if (!series) return null;
      const candles = Object.entries(series).map(([date, row]) => ({
        t: new Date(date+'T15:30:00+05:30'),
        o: +row['1. open'], h: +row['2. high'], l: +row['3. low'], c: +row['5. adjusted close'] || +row['4. close'], v: +row['6. volume']
      })).sort((a,b)=>a.t-b.t);
      return candles;
    } else {
      const iv = interval === '15m' ? '15min' : '5min';
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${encodeURIComponent(toAlphaSymbol(symbol))}&interval=${iv}&outputsize=full&apikey=${key}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      const series = json[`Time Series (${iv})`];
      if (!series) return null;
      const candles = Object.entries(series).map(([dt, row]) => ({
        t: new Date(dt.replace(' ', 'T') + '+05:30'),
        o: +row['1. open'], h: +row['2. high'], l: +row['3. low'], c: +row['4. close'], v: +row['5. volume']
      })).sort((a,b)=>a.t-b.t);
      return candles;
    }
  } catch { return null; }
}

// If only close is available, approximate small OHLC ranges (not ideal; try to avoid by using Yahoo/Alpha). Use tight ranges to avoid misleading indicators.
function fillOHLCFromClose(c) {
  return c.map(x => ({ ...x, o: x.c, h: x.c, l: x.c, v: 0 }));
}

function normalize(arr) {
  // Expected backend output [{t,o,h,l,c,v}] or any broker schema
  return arr
    .map(x => ({
      t: new Date(x.t || x.timestamp),
      o: +x.o || +x.open,
      h: +x.h || +x.high,
      l: +x.l || +x.low,
      c: +x.c || +x.close,
      v: +x.v || +x.volume || 0
    }))
    .filter(x => Number.isFinite(x.c));
}
