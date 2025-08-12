export function toYahooSymbol(nseSymbol) {
  return `${nseSymbol.toUpperCase()}.NS`;
}
export function toAlphaSymbol(nseSymbol) {
  // Alpha Vantage can accept NSE:SYMBOL or plain symbol with "NSE" function param
  return nseSymbol.toUpperCase();
}
