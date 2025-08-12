export function detectZerodhaContext() {
  if (!location.hostname.includes('kite.zerodha.com')) return null;
  // Zerodha chart URLs contain instrument ids or tradingsymbol in query/hash
  const m = location.href.match(/symbol=([A-Z0-9.-]+)/i) || location.href.match(/NSE:([A-Z0-9.-]+)/i);
  const raw = m?.[1] || null;
  if (!raw) return null;

  const symbol = raw.replace(/^NSE:/, '').toUpperCase();
  const interval = detectIntervalFromDom() || '15m';
  return { site: 'ZERODHA', symbol, interval };
}

function detectIntervalFromDom() {
  const btn = document.querySelector('[data-interval], .interval-selector .active');
  const txt = btn?.textContent?.toLowerCase() || btn?.getAttribute('data-interval')?.toLowerCase();
  if (!txt) return null;
  if (txt.includes('day')) return '1d';
  if (txt.includes('15')) return '15m';
  if (txt.includes('5')) return '5m';
  return null;
}
