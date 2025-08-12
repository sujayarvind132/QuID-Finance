export function isNseHoliday(date, holidaysJson) {
  // holidaysJson structure varies; support list of dates or objects containing dates
  try {
    const y = date.getFullYear();
    const m = String(date.getMonth()+1).padStart(2,'0');
    const d = String(date.getDate()).padStart(2,'0');
    const key = `${y}-${m}-${d}`;
    const items = Array.isArray(holidaysJson) ? holidaysJson : (holidaysJson?.CM || holidaysJson?.trading || []);
    return items.some(h => {
      const hd = (h?.tradingDate || h?.date || h)?.slice(0,10);
      return hd === key && (h?.trading === 'Closed' || h?.status === 'Closed' || true);
    });
  } catch {
    return false;
  }
}
