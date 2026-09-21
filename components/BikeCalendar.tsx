'use client'

import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  isBefore,
  startOfDay,
} from 'date-fns'
import { cs } from 'date-fns/locale'

export type DayState = 'free' | 'reserved' | 'occupied' | 'blocked'

export interface CalendarReservation {
  start_date: string
  end_date: string
  status: 'pending' | 'reserved' | 'occupied'
}

interface BikeCalendarProps {
  reservations: CalendarReservation[]
  selectedStart: string | null
  selectedEnd: string | null
  onSelect: (start: string, end: string) => void
  minDate?: Date
}

const dayStateStyles: Record<DayState, string> = {
  free: 'bg-white text-brand-dark hover:bg-brand-primary/30',
  reserved: 'bg-amber-100 text-amber-800',
  occupied: 'bg-red-100 text-red-700 line-through',
  blocked: 'bg-gray-100 text-gray-400 line-through',
}

export default function BikeCalendar({
  reservations,
  selectedStart,
  selectedEnd,
  onSelect,
  minDate,
}: BikeCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [hoverDate, setHoverDate] = useState<Date | null>(null)

  const dayStates = useMemo(() => {
    const map = new Map<string, DayState>()
    for (const r of reservations) {
      const start = new Date(r.start_date + 'T00:00:00')
      const end = new Date(r.end_date + 'T00:00:00')
      const state: DayState = r.status === 'occupied' ? 'occupied' : 'reserved'
      for (const d of eachDayOfInterval({ start, end })) {
        map.set(format(d, 'yyyy-MM-dd'), state)
      }
    }
    return map
  }, [reservations])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  const today = startOfDay(new Date())
  const min = minDate ? startOfDay(minDate) : today

  function handleDayClick(day: Date) {
    if (isBefore(day, min)) return
    const state = dayStates.get(format(day, 'yyyy-MM-dd'))
    if (state === 'occupied' || state === 'blocked') return

    if (!selectedStart || (selectedStart && selectedEnd)) {
      onSelect(format(day, 'yyyy-MM-dd'), format(day, 'yyyy-MM-dd'))
    } else {
      const start = new Date(selectedStart + 'T00:00:00')
      if (isBefore(day, start)) {
        onSelect(format(day, 'yyyy-MM-dd'), selectedStart)
      } else {
        onSelect(selectedStart, format(day, 'yyyy-MM-dd'))
      }
    }
  }

  function isInRange(day: Date): boolean {
    if (!selectedStart || !selectedEnd) return false
    const start = new Date(selectedStart + 'T00:00:00')
    const end = new Date(selectedEnd + 'T00:00:00')
    return day >= start && day <= end
  }

  function isInHoverRange(day: Date): boolean {
    if (!selectedStart || selectedEnd || !hoverDate) return false
    const start = new Date(selectedStart + 'T00:00:00')
    return (day >= start && day <= hoverDate) || (day <= start && day >= hoverDate)
  }

  const weekdays = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-brand-dark hover:bg-gray-50"
          onClick={() => setMonth((m) => addMonths(m, -1))}
        >
          ← {format(addMonths(month, -1), 'LLLL', { locale: cs })}
        </button>
        <span className="text-lg font-bold capitalize text-brand-dark">
          {format(month, 'LLLL yyyy', { locale: cs })}
        </span>
        <button
          type="button"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-brand-dark hover:bg-gray-50"
          onClick={() => setMonth((m) => addMonths(m, 1))}
        >
          {format(addMonths(month, 1), 'LLLL', { locale: cs })} →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((w) => (
          <div key={w} className="py-1 text-xs font-bold uppercase text-gray-500">
            {w}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const state: DayState = dayStates.get(key) ?? 'free'
          const inMonth = isSameMonth(day, month)
          const past = isBefore(day, min)
          const selected = isInRange(day)
          const hover = isInHoverRange(day)
          const isStart = selectedStart && isSameDay(day, new Date(selectedStart + 'T00:00:00'))
          const isEnd = selectedEnd && isSameDay(day, new Date(selectedEnd + 'T00:00:00'))

          let cls = dayStateStyles[state]
          if (past) cls = 'bg-gray-50 text-gray-300'
          if (selected) cls = 'bg-brand-secondary text-white font-bold'
          if (hover) cls = 'bg-brand-secondary/30 text-brand-dark'
          if (isStart || isEnd) cls = 'bg-brand-secondary-dark text-white font-bold'

          return (
            <button
              key={key}
              type="button"
              disabled={past || state === 'occupied' || state === 'blocked'}
              onMouseEnter={() => setHoverDate(day)}
              onMouseLeave={() => setHoverDate(null)}
              onClick={() => handleDayClick(day)}
              className={`flex h-10 items-center justify-center rounded-md text-sm transition-colors ${
                inMonth ? '' : 'opacity-40'
              } ${cls}`}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-white ring-1 ring-gray-300" /> Volné
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-100 ring-1 ring-amber-300" /> Rezervované
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-100 ring-1 ring-red-300" /> Obsazené
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-brand-secondary" /> Vybrané
        </span>
      </div>
    </div>
  )
}