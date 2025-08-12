export function detectNseContext() {
  const url = location.href;
  if (!url.includes('nseindia.com')) return null;

  // Try to read symbol from known NSE chart pages or index pages
  const h1 = document.querySelector('h1, .page-title, .symbol-name');
  const symbolFromDom = h1?.textContent?.trim()?.split(' ')?.[0];
  const symbol = normalizeSymbol(symbolFromDom);

  // Timeframe selection heuristic
  const intervalBtn = document.querySelector('[data-interval], .time-interval, .interval-btn');
  const interval = mapInterval(intervalBtn?.getAttribute('data-interval')) || '15m';

  return symbol ? { site: 'NSE', symbol, interval } : null;
}

function normalizeSymbol(sym) {
  if (!sym) return null;
  // Remove .NS-like suffix if present in DOM name
  return sym.replace(/\.NS$/i, '').toUpperCase();
}
function mapInterval(val) {
  if (!val) return null;
  const v = val.toLowerCase();
  if (v.includes('1d') || v.includes('day')) return '1d';
  if (v.includes('5m')) return '5m';
  if (v.includes('15m')) return '15m';
  return null;
}
