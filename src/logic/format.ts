const dayFormat = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function toLocalIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatDay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return dayFormat.format(new Date(year, month - 1, day))
}

export function formatClock(totalSec: number): string {
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`
}
