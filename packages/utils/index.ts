export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatOrderNumber(year: number, seq: number): string {
  return `PF-${year}-${String(seq).padStart(6, '0')}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function addBusinessDays(date: Date, days: number, holidays: Date[] = []): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    const isHoliday = holidays.some(
      (h) => h.toDateString() === result.toDateString()
    );
    if (day !== 0 && day !== 6 && !isHoliday) {
      added++;
    }
  }
  return result;
}
