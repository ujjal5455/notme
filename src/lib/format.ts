// Small helpers that turn raw values into text people can read.

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

/** 100000 → "₹1,00,000" (Indian digit grouping). */
export function formatInr(amount: number): string {
  return inrFormatter.format(amount)
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

/** "2026-10-21T10:05:00.000Z" → "21 Oct, 3:35 pm" (in the viewer's timezone). */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso))
}
