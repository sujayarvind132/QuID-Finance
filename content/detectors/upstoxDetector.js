export function detectUpstoxContext() {
  if (!location.hostname.includes('upstox')) return null;
  const m = location.href.match(/symbol=([A-Z0-9.-]+)/i) || location.href.match(/NSE:([A-Z0-9.-]+)/i);
  const raw = m?.[1] || null;
  if (!raw) return null;

  const symbol = raw.replace(/^NSE:/, '').toUpperCase();
  const interval = detectInterval() || '15m';
  return { site: 'UPSTOX', symbol, interval };
}

function detectInterval() {
  const el = document.querySelector('.interval, .timeframe, [data-interval].active');
  const t = el?.textContent?.toLowerCase() || el?.getAttribute('data-interval')?.toLowerCase();
  if (!t) return null;
  if (t.includes('day')) return '1d';
  if (t.includes('15')) return '15m';
  if (t.includes('5')) return '5m';
  return null;
}
