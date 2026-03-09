'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface Plan {
  id: string
  name: string
  assets: { name: string; asset_tag: string | null } | null
  asset_id?: string | null
  frequency: string
  frequency_days?: number | null
}

interface LogMaintenanceModalProps {
  plan: Plan & { asset_id?: string | null }
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

function getNextDate(frequency: string, frequencyDays: number | null | undefined): string {
  const now = new Date()
  const map: Record<string, number> = {
    daily: 1, weekly: 7, monthly: 30, quarterly: 90,
    semi_annual: 182, annual: 365,
  }
  const days = frequency === 'custom' ? (frequencyDays ?? 30) : (map[frequency] ?? 30)
  now.setDate(now.getDate() + days)
  return now.toISOString().split('T')[0]
}

export default function LogMaintenanceModal({ plan, onClose }: LogMaintenanceModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const suggestedNext = getNextDate(plan.frequency, plan.frequency_days)

  const [form, setForm] = useState({
    performed_by: '',
    performed_date: today,
    duration_hours: '',
    type: 'preventive',
    description: `Completed: ${plan.name}`,
    findings: '',
    parts_replaced: '',
    cost: '',
    status: 'completed',
    next_maintenance_date: suggestedNext,
    notes: '',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.performed_by || !form.description) {
      setError('Performed by and description are required.')
      return
    }
    setLoading(true)
    setError('')

    const recordPayload = {
      asset_id: (plan as any).asset_id ?? null,
      maintenance_plan_id: plan.id,
      performed_by: form.performed_by,
      performed_date: form.performed_date,
      duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : null,
      type: form.type as any,
      description: form.description,
      findings: form.findings || null,
      parts_replaced: form.parts_replaced || null,
      cost: form.cost ? parseFloat(form.cost) : null,
      status: form.status as any,
      next_maintenance_date: form.next_maintenance_date || null,
      notes: form.notes || null,
    }

    const { error: recordError } = await supabase.from('maintenance_records').insert(recordPayload)
    if (recordError) { setError(recordError.message); setLoading(false); return }

    // Update plan's last_performed_date and next_due_date
    await supabase.from('maintenance_plans').update({
      last_performed_date: form.performed_date,
      next_due_date: form.next_maintenance_date,
    }).eq('id', plan.id)

    router.refresh()
    onClose()
  }

  return (
    <Modal open={true} onClose={onClose} title={`Log Maintenance: ${plan.name}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-sm text-blue-700">
            <strong>Asset:</strong> {plan.assets?.name ?? 'N/A'} • <strong>Plan:</strong> {plan.name}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Performed By *" value={form.performed_by} onChange={set('performed_by')} placeholder="Technician name" />
          <Input label="Date Performed *" type="date" value={form.performed_date} onChange={set('performed_date')} />
          <Select label="Type" value={form.type} onChange={set('type')} options={TYPE_OPTIONS} />
          <Select label="Status" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
          <Input label="Duration (hours)" type="number" value={form.duration_hours} onChange={set('duration_hours')} placeholder="0.0" step="0.5" min="0" />
          <Input label="Cost ($)" type="number" value={form.cost} onChange={set('cost')} placeholder="0.00" step="0.01" min="0" />
          <div className="sm:col-span-2">
            <Textarea label="Description *" value={form.description} onChange={set('description')} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Findings" value={form.findings} onChange={set('findings')} placeholder="What was found during maintenance?" />
          </div>
          <Input label="Parts Replaced" value={form.parts_replaced} onChange={set('parts_replaced')} placeholder="e.g. Filter, oil, belt..." />
          <Input label="Next Maintenance Date" type="date" value={form.next_maintenance_date} onChange={set('next_maintenance_date')} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>Log Maintenance</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  )
}
