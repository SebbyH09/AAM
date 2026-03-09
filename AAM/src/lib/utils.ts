import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  try {
    return format(parseISO(date), 'MMM d, yyyy')
  } catch {
    return '—'
  }
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  try {
    return format(parseISO(date), 'MMM d, yyyy h:mm a')
  } catch {
    return '—'
  }
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null
  try {
    return differenceInDays(parseISO(date), new Date())
  } catch {
    return null
  }
}

export function getDueStatus(date: string | null | undefined): 'overdue' | 'urgent' | 'upcoming' | 'ok' | 'none' {
  const days = daysUntil(date)
  if (days === null) return 'none'
  if (days < 0) return 'overdue'
  if (days <= 7) return 'urgent'
  if (days <= 30) return 'upcoming'
  return 'ok'
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    decommissioned: 'bg-red-100 text-red-800',
    repair: 'bg-yellow-100 text-yellow-800',
    expired: 'bg-red-100 text-red-800',
    pending: 'bg-blue-100 text-blue-800',
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    waiting_parts: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
    overdue: 'bg-red-100 text-red-800',
    urgent: 'bg-orange-100 text-orange-800',
    upcoming: 'bg-yellow-100 text-yellow-800',
    ok: 'bg-green-100 text-green-800',
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
    // Inventory order statuses
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    approved: 'bg-indigo-100 text-indigo-800',
    ordered: 'bg-purple-100 text-purple-800',
    shipped: 'bg-yellow-100 text-yellow-800',
    received: 'bg-green-100 text-green-800',
    reviewed: 'bg-green-100 text-green-800',
  }
  return map[status] ?? 'bg-gray-100 text-gray-800'
}

export function priorityColor(priority: string): string {
  return statusColor(priority)
}

export function dueStatusBadge(date: string | null | undefined): { label: string; color: string } {
  const days = daysUntil(date)
  if (days === null) return { label: 'No date', color: 'bg-gray-100 text-gray-600' }
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: 'bg-red-100 text-red-800' }
  if (days === 0) return { label: 'Due today', color: 'bg-red-100 text-red-800' }
  if (days <= 7) return { label: `${days}d left`, color: 'bg-orange-100 text-orange-800' }
  if (days <= 30) return { label: `${days}d left`, color: 'bg-yellow-100 text-yellow-800' }
  return { label: `${days}d left`, color: 'bg-green-100 text-green-800' }
}

export function calculateDowntimeHours(startTime: string, endTime: string | null): number {
  if (!endTime) return 0
  const start = new Date(startTime)
  const end = new Date(endTime)
  return Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60)
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}
