export function istNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}
export function isMarketOpenIST(now) {
  const day = now.getDay(); // 0 Sun ... 6 Sat
  if (day === 0 || day === 6) return false;
  const h = now.getHours();
  const m = now.getMinutes();
  const minutes = h*60 + m;
  // 09:15–15:30 IST
  return minutes >= (9*60+15) && minutes <= (15*60+30);
}
export function nextOpenInfo(now, holidays) {
  // Simple message; full calc can iterate forward skipping holidays/weekends
  return '09:15 IST next trading day';
}
