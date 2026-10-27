import type { Json } from '@/types/database'

/** One step of a multi-step maintenance plan, stored in maintenance_plans.checklist. */
export interface ChecklistStep {
  id: string
  text: string
  done: boolean
}

export function newStepId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** Reads the checklist column, tolerating older shapes (plain strings, missing ids). */
export function parseChecklist(value: Json | null | undefined): ChecklistStep[] {
  if (!Array.isArray(value)) return []
  const steps: ChecklistStep[] = []
  value.forEach((item, i) => {
    if (typeof item === 'string') {
      if (item.trim()) steps.push({ id: `s${i}`, text: item, done: false })
    } else if (item && typeof item === 'object' && !Array.isArray(item)) {
      const text = typeof item.text === 'string' ? item.text : ''
      if (!text.trim()) return
      steps.push({ id: typeof item.id === 'string' ? item.id : `s${i}`, text, done: item.done === true })
    }
  })
  return steps
}

export function checklistProgress(steps: ChecklistStep[]) {
  const done = steps.filter((s) => s.done).length
  return { done, total: steps.length, percent: steps.length ? Math.round((done / steps.length) * 100) : 0 }
}

/** Unchecks every step, ready for the plan's next cycle. Null when there are no steps. */
export function resetChecklist(value: Json | null | undefined): Json | null {
  const steps = parseChecklist(value)
  return steps.length ? toJson(steps.map((s) => ({ ...s, done: false }))) : null
}

export function toJson(steps: ChecklistStep[]): Json {
  return steps.map((s) => ({ id: s.id, text: s.text, done: s.done }))
}

/** Plain-text summary written into the maintenance record when the plan is logged. */
export function checklistSummary(steps: ChecklistStep[]): string {
  const { done, total } = checklistProgress(steps)
  return [`Steps completed: ${done}/${total}`, ...steps.map((s) => `${s.done ? '[x]' : '[ ]'} ${s.text}`)].join('\n')
}
