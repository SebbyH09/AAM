'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CalendarPlus } from 'lucide-react'

interface AddOneTimePmButtonProps {
  assetId: string
  assetName: string
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

function emptyForm() {
  return {
    name: 'One-Time PM',
    description: '',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'medium',
    assigned_to: '',
    estimated_duration_hours: '',
    estimated_cost: '',
    already_completed: false,
    performed_by: '',
    findings: '',
  }
}

export default function AddOneTimePmButton({ assetId, assetName }: AddOneTimePmButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function close() {
    setOpen(false)
    setError('')
    setForm(emptyForm())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.due_date) {
      setError('Name and date are required.')
      return
    }
    if (form.already_completed && !form.performed_by) {
      setError('Performed by is required when logging a completed PM.')
      return
    }
    setLoading(true)
    setError('')

    const { data: plan, error: planError } = await supabase
      .from('maintenance_plans')
      .insert({
        asset_id: assetId,
        name: form.name,
        description: form.description || null,
        frequency: 'one_time',
        frequency_days: null,
        next_due_date: form.due_date,
        last_performed_date: form.already_completed ? form.due_date : null,
        assigned_to: form.assigned_to || null,
        priority: form.priority,
        estimated_duration_hours: form.estimated_duration_hours ? parseFloat(form.estimated_duration_hours) : null,
        estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
        parts: null,
        // A completed one-time PM has nothing left to schedule
        is_active: !form.already_completed,
      })
      .select('id')
      .single()

    if (planError) { setError(planError.message); setLoading(false); return }

    if (form.already_completed) {
      const { error: recordError } = await supabase.from('maintenance_records').insert({
        asset_id: assetId,
        maintenance_plan_id: plan.id,
        performed_by: form.performed_by,
        performed_date: form.due_date,
        duration_hours: form.estimated_duration_hours ? parseFloat(form.estimated_duration_hours) : null,
        type: 'preventive',
        description: form.description || `Completed: ${form.name}`,
        findings: form.findings || null,
        parts_replaced: null,
        cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
        status: 'completed',
        next_maintenance_date: null,
        notes: null,
      })
      if (recordError) { setError(recordError.message); setLoading(false); return }
    }

    setLoading(false)
    close()
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
      >
        <CalendarPlus className="h-4 w-4" /> One-Time PM
      </button>

      <Modal open={open} onClose={close} title="Add One-Time PM" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm text-blue-700">
              <strong>Asset:</strong> {assetName} • This PM will not repeat.
            </p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.already_completed}
              onChange={(e) => setForm((prev) => ({ ...prev, already_completed: e.target.checked }))}
              className="h-4 w-4 rounded text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Already performed — log it as completed now</span>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input label="PM Name *" value={form.name} onChange={set('name')} placeholder="e.g. Post-move verification PM" />
            </div>
            <Input
              label={form.already_completed ? 'Date Performed *' : 'Due Date *'}
              type="date"
              value={form.due_date}
              onChange={set('due_date')}
            />
            {form.already_completed ? (
              <Input label="Performed By *" value={form.performed_by} onChange={set('performed_by')} placeholder="Technician name" />
            ) : (
              <Input label="Assigned To" value={form.assigned_to} onChange={set('assigned_to')} placeholder="Technician or team" />
            )}
            <Select label="Priority" value={form.priority} onChange={set('priority')} options={PRIORITY_OPTIONS} />
            <Input
              label={form.already_completed ? 'Duration (hours)' : 'Est. Duration (hours)'}
              type="number"
              value={form.estimated_duration_hours}
              onChange={set('estimated_duration_hours')}
              placeholder="0.0"
              step="0.5"
              min="0"
            />
            <Input
              label={form.already_completed ? 'Cost ($)' : 'Est. Cost ($)'}
              type="number"
              value={form.estimated_cost}
              onChange={set('estimated_cost')}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            <div className="sm:col-span-2">
              <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="What does this PM involve?" />
            </div>
            {form.already_completed && (
              <div className="sm:col-span-2">
                <Textarea label="Findings" value={form.findings} onChange={set('findings')} placeholder="What was found during maintenance?" />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>{form.already_completed ? 'Log PM' : 'Schedule PM'}</Button>
            <Button type="button" variant="outline" onClick={close}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
