'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChecklistStep, checklistProgress, toJson } from '@/lib/checklist'
import { cn } from '@/lib/utils'
import { ListChecks } from 'lucide-react'

/** Compact "3/5 steps" bar for list rows. Renders nothing for plans without steps. */
export function ChecklistProgress({ steps, className }: { steps: ChecklistStep[]; className?: string }) {
  if (steps.length === 0) return null
  const { done, total, percent } = checklistProgress(steps)
  return (
    <div className={cn('flex items-center gap-2', className)} title={`${done} of ${total} steps done`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn('h-full rounded-full', done === total ? 'bg-green-500' : 'bg-blue-500')}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">{done}/{total} steps</span>
    </div>
  )
}

interface PlanChecklistProps {
  planId: string
  steps: ChecklistStep[]
  onChange: (steps: ChecklistStep[]) => void
}

/** Tick-off list of a plan's steps. Each tick is saved straight away so progress survives between visits. */
export function PlanChecklist({ planId, steps, onChange }: PlanChecklistProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { done, total, percent } = checklistProgress(steps)

  async function save(next: ChecklistStep[]) {
    const previous = steps
    onChange(next)
    setSaving(true)
    setError('')
    const { error } = await createClient().from('maintenance_plans').update({ checklist: toJson(next) }).eq('id', planId)
    setSaving(false)
    if (error) {
      onChange(previous)
      setError(error.message)
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
          <ListChecks className="h-4 w-4" />
          Steps ({done}/{total})
        </h4>
        {done > 0 && (
          <button
            type="button"
            onClick={() => save(steps.map((s) => ({ ...s, done: false })))}
            disabled={saving}
            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Uncheck all
          </button>
        )}
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn('h-full rounded-full transition-all', done === total ? 'bg-green-500' : 'bg-blue-500')}
          style={{ width: `${percent}%` }}
        />
      </div>
      <ol className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {steps.map((step, i) => (
          <li key={step.id}>
            <label className="flex cursor-pointer items-start gap-3 px-4 py-2.5 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={step.done}
                disabled={saving}
                onChange={() => save(steps.map((s) => (s.id === step.id ? { ...s, done: !s.done } : s)))}
                className="mt-0.5 h-4 w-4 rounded text-blue-600"
              />
              <span className="text-xs font-medium text-gray-400 mt-0.5">{i + 1}.</span>
              <span className={cn('text-sm', step.done ? 'text-gray-400 line-through' : 'text-gray-700')}>{step.text}</span>
            </label>
          </li>
        ))}
      </ol>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
