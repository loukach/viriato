/**
 * Date formatting utilities for Portuguese locale
 */

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
]

const MONTH_FULL_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

/**
 * Format date string to Portuguese format (dd/mm/yyyy)
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return ''

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString

  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

/**
 * Format date to short format (dd Mon)
 */
export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return ''

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString

  const day = date.getDate()
  const month = MONTH_NAMES[date.getMonth()]

  return `${day} ${month}`
}

/**
 * Format date to long format (dd de Mes de yyyy)
 */
export function formatDateLong(dateString: string | null | undefined): string {
  if (!dateString) return ''

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString

  const day = date.getDate()
  const month = MONTH_FULL_NAMES[date.getMonth()]
  const year = date.getFullYear()

  return `${day} de ${month} de ${year}`
}

/**
 * Format date with weekday (Seg, 15 Jan)
 */
export function formatDateWithWeekday(dateString: string | null | undefined): string {
  if (!dateString) return ''

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString

  const weekday = WEEKDAY_NAMES[date.getDay()]
  const day = date.getDate()
  const month = MONTH_NAMES[date.getMonth()]

  return `${weekday}, ${day} ${month}`
}

/**
 * Get month key from date (YYYY-MM)
 */
export function getMonthKey(dateString: string): string {
  return dateString.substring(0, 7)
}

/**
 * Get month name from month number (1-12)
 */
export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] || ''
}

/**
 * Check if date is weekend
 */
export function isWeekend(dateString: string): boolean {
  const date = new Date(dateString)
  const day = date.getDay()
  return day === 0 || day === 6
}
