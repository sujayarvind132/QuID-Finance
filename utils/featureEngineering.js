export function buildFeatureFrame(candlesWithInd) {
  // Build a single latest feature vector and recent window for model
  const rows = candlesWithInd;
  const last = rows[rows.length-1];
  const feats = {
    close: last.c,
    sma10: last.sma10, sma50: last.sma50,
    ema12: last.ema12, ema26: last.ema26,
    rsi14: last.rsi14,
    macd: last.macd, macds: last.macds, macdh: last.macdh,
    atr14: last.atr14,
    bbU: last.bbU, bbM: last.bbM, bbL: last.bbL,
    obv: last.obv
  };
  // NaN/inf cleanup
  for (const k of Object.keys(feats)) {
    const v = feats[k];
    feats[k] = Number.isFinite(v) ? v : null;
  }
  return feats;
}
