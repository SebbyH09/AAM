'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { formatDate, statusColor } from '@/lib/utils'
import { Calendar, List, ClipboardList, Wrench, FlaskConical, ChevronLeft, ChevronRight } from 'lucide-react'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, addMonths, subMonths, parseISO } from 'date-fns'

type EventType = 'maintenance' | 'repair' | 'calibration'

interface ScheduleEvent {
  id: string
  type: EventType
  title: string
  date: string
  assetName: string | null
  priority: string | null
  href: string
}

interface ScheduleClientProps {
  events: ScheduleEvent[]
}

const TYPE_COLORS: Record<EventType, string> = {
  maintenance: 'bg-blue-100 text-blue-800',
  repair: 'bg-red-100 text-red-800',
  calibration: 'bg-purple-100 text-purple-800',
}

const TYPE_DOT_COLORS: Record<EventType, string> = {
  maintenance: 'bg-blue-500',
  repair: 'bg-red-500',
  calibration: 'bg-purple-500',
}

const TYPE_ICONS: Record<EventType, React.ReactNode> = {
  maintenance: <ClipboardList className="h-4 w-4 text-blue-600" />,
  repair: <Wrench className="h-4 w-4 text-red-600" />,
  calibration: <FlaskConical className="h-4 w-4 text-purple-600" />,
}

function groupByWeek(events: ScheduleEvent[], today: Date): { label: string; events: ScheduleEvent[] }[] {
  const oneWeek = new Date(today)
  oneWeek.setDate(today.getDate() + 7)
  const twoWeeks = new Date(today)
  twoWeeks.setDate(today.getDate() + 14)

  const thisWeek: ScheduleEvent[] = []
  const nextWeek: ScheduleEvent[] = []
  const later: ScheduleEvent[] = []

  events.forEach((e) => {
    const d = parseISO(e.date)
    if (d < oneWeek) thisWeek.push(e)
    else if (d < twoWeeks) nextWeek.push(e)
    else later.push(e)
  })

  const groups = []
  if (thisWeek.length > 0) groups.push({ label: 'This Week', events: thisWeek })
  if (nextWeek.length > 0) groups.push({ label: 'Next Week', events: nextWeek })
  if (later.length > 0) groups.push({ label: 'Later', events: later })
  return groups
}

export default function ScheduleClient({ events }: ScheduleClientProps) {
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [typeFilter, setTypeFilter] = useState<'all' | EventType>('all')
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return events
    return events.filter((e) => e.type === typeFilter)
  }, [events, typeFilter])

  const today = new Date()
  const groups = useMemo(() => groupByWeek(filtered, today), [filtered])

  // Calendar view
  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth)
    const end = endOfMonth(calendarMonth)
    return eachDayOfInterval({ start, end })
  }, [calendarMonth])

  // Pad days to start on Sunday
  const startPad = useMemo(() => {
    const day = startOfMonth(calendarMonth).getDay()
    return Array.from({ length: day }, (_, i) => i)
  }, [calendarMonth])

  function eventsOnDay(day: Date) {
    return filtered.filter((e) => isSameDay(parseISO(e.date), day))
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              view === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <List className="h-4 w-4" /> List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              view === 'calendar'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="h-4 w-4" /> Calendar
          </button>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'maintenance', 'repair', 'calibration'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-6">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-600">No scheduled items found</p>
              <p className="text-xs text-gray-400 mt-1">Schedule items will appear here</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">{group.label}</h2>
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
                  {group.events.map((event) => (
                    <Link
                      key={event.id}
                      href={event.href}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="shrink-0">{TYPE_ICONS[event.type]}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {event.assetName ?? 'No asset'} • {formatDate(event.date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={TYPE_COLORS[event.type]}>{event.type}</Badge>
                        {event.priority && (
                          <Badge className={statusColor(event.priority)}>{event.priority}</Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Month navigation */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <button
              onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
              className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-semibold text-gray-900">
              {format(calendarMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
              className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2 text-center text-xs font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {startPad.map((i) => (
              <div key={`pad-${i}`} className="min-h-[80px] border-b border-r border-gray-100 bg-gray-50" />
            ))}
            {calendarDays.map((day) => {
              const dayEvents = eventsOnDay(day)
              const isToday = isSameDay(day, today)
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] border-b border-r border-gray-100 p-1.5 ${
                    isToday ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className={`mb-1 text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <Link
                        key={e.id}
                        href={e.href}
                        className={`block truncate rounded px-1 py-0.5 text-xs font-medium ${TYPE_COLORS[e.type]} hover:opacity-80`}
                        title={`${e.title} — ${e.assetName ?? ''}`}
                      >
                        <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${TYPE_DOT_COLORS[e.type]}`} />
                        {e.title}
                      </Link>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-xs text-gray-400 pl-1">+{dayEvents.length - 3} more</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
