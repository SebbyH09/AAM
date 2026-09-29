'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { getNextDate } from '@/app/maintenance/LogMaintenanceModal'
import { splitCost } from '@/lib/assetPicker'
import { dueStatusBadge, formatDate } from '@/lib/utils'

export interface GroupPlan {
  id: string
  name: string
  asset_id: string
  asset_name: string
  next_due_date: string
  frequency: string
  frequency_days: number | null
}

interface GroupLogPmModalProps {
  groupName: string
  plans: GroupPlan[]
  onClose: () => void
}

const TYPE_OPTIONS = [
  { value: 'preventive', label: 'Preventive' },
  { value: 'corrective', label: 'Corrective' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'requires_followup', label: 'Requires Follow-up' },
]

/**
 * Logs one PM visit against several of a group's plans at once. Each ticked
 * plan gets its own maintenance record on its own asset and rolls forward to
 * its own next due date, exactly as if it had been logged individually.
 */
export default function GroupLogPmModal({ groupName, plans, onClose }: GroupLogPmModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string[]>(plans.map((p) => p.id))

  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    performed_by: '',
    performed_date: today,
    duration_hours: '',
    type: 'preventive',
    description: '',
    findings: '',
    parts_replaced: '',
    cost: '',
    status: 'completed',
    notes: '',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function toggle(planId: string) {
    setSelected((prev) => (prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.performed_by || !form.performed_date) {
      setError('Performed by and date are required.')
      return
    }
    const chosen = plans.filter((p) => selected.includes(p.id))
    if (chosen.length === 0) {
      setError('Tick at least one plan to log.')
      return
    }
    setLoading(true)
    setError('')

    const costs = splitCost(form.cost ? parseFloat(form.cost) : null, chosen.length)
    const nextDates = chosen.map((p) => (p.frequency === 'one_time' ? null : getNextDate(p.frequency, p.frequency_days)))

    const { error: recordError } = await supabase.from('maintenance_records').insert(
      chosen.map((plan, i) => ({
        asset_id: plan.asset_id,
        maintenance_plan_id: plan.id,
        performed_by: form.performed_by,
        performed_date: form.performed_date,
        duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : null,
        type: form.type as 'preventive',
        description: form.description || `Completed: ${plan.name}`,
        findings: form.findings || null,
        parts_replaced: form.parts_replaced || null,
        cost: costs[i],
        status: form.status as 'completed',
        next_maintenance_date: nextDates[i],
        notes: form.notes || null,
      }))
    )
    if (recordError) { setError(recordError.message); setLoading(false); return }

    // Roll each plan forward on its own schedule; a completed one-time plan is closed out.
    const results = await Promise.all(
      chosen.map((plan, i) =>
        supabase
          .from('maintenance_plans')
          .update({
            last_performed_date: form.performed_date,
            ...(nextDates[i] ? { next_due_date: nextDates[i]! } : {}),
            ...(plan.frequency === 'one_time' && form.status === 'completed' ? { is_active: false } : {}),
          })
          .eq('id', plan.id)
      )
    )
    const failed = results.find((r) => r.error)
    if (failed?.error) { setError(failed.error.message); setLoading(false); return }

    router.refresh()
    onClose()
  }

  return (
    <Modal open={true} onClose={onClose} title={`Log PM: ${groupName}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Plans to log ({selected.length} of {plans.length})</span>
            <button
              type="button"
              onClick={() => setSelected(selected.length === plans.length ? [] : plans.map((p) => p.id))}
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              {selected.length === plans.length ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <div className="max-h-56 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
            {plans.map((plan) => {
              const badge = dueStatusBadge(plan.next_due_date)
              return (
                <label key={plan.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selected.includes(plan.id)}
                    onChange={() => toggle(plan.id)}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{plan.name}</p>
                    <p className="truncate text-xs text-gray-500">{plan.asset_name} • Due {formatDate(plan.next_due_date)}</p>
                  </div>
                  <Badge className={badge.color}>{badge.label}</Badge>
                </label>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Performed By *" value={form.performed_by} onChange={set('performed_by')} placeholder="Technician name" />
          <Input label="Date Performed *" type="date" value={form.performed_date} onChange={set('performed_date')} />
          <Select label="Type" value={form.type} onChange={set('type')} options={TYPE_OPTIONS} />
          <Select label="Status" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
          <Input label="Duration (hours)" type="number" value={form.duration_hours} onChange={set('duration_hours')} placeholder="0.0" step="0.5" min="0" />
          <Input label="Total Cost ($)" type="number" value={form.cost} onChange={set('cost')} placeholder="0.00" step="0.01" min="0" />
          <div className="sm:col-span-2">
            <Textarea
              label="Description"
              value={form.description}
              onChange={set('description')}
              placeholder='Leave blank to use "Completed: <plan name>" on each record'
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Findings" value={form.findings} onChange={set('findings')} placeholder="What was found during maintenance?" />
          </div>
          <Input label="Parts Replaced" value={form.parts_replaced} onChange={set('parts_replaced')} placeholder="e.g. Filter, oil, belt..." />
          <Input label="Notes" value={form.notes} onChange={set('notes')} />
        </div>
        <p className="text-xs text-gray-500">
          Each ticked plan gets its own record on its asset and moves to its next due date. Total cost is split evenly across them.
        </p>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>Log PM on {selected.length} plan{selected.length === 1 ? '' : 's'}</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  )
}
