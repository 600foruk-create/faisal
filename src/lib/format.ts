export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(amount: number, symbol = 'Rs.'): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const absFormatted = Math.abs(safe).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return safe < 0 ? `-${symbol} ${absFormatted}` : `${symbol} ${absFormatted}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return isoDate;
  const [, year, monthStr, day] = match;
  const monthIndex = Number(monthStr) - 1;
  const monthLabel = MONTHS[monthIndex] ?? monthStr;
  return `${day}-${monthLabel}-${year}`;
}

export function getLocalIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalIsoDateTime(date = new Date()): string {
  const d = getLocalIsoDate(date);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${d} ${h}:${m}:${s}`;
}

export function getDateRangeForPreset(
  preset: 'today' | 'yesterday' | 'week' | 'month' | 'custom',
  now = new Date()
): { from: string; to: string } {
  const today = getLocalIsoDate(now);
  if (preset === 'today') {
    return { from: today, to: today };
  }
  if (preset === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yStr = getLocalIsoDate(y);
    return { from: yStr, to: yStr };
  }
  if (preset === 'week') {
    const start = new Date(now);
    const dayOfWeek = start.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start.setDate(start.getDate() - diffToMonday);
    return { from: getLocalIsoDate(start), to: today };
  }
  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: getLocalIsoDate(start), to: today };
  }
  return { from: today, to: today };
}

