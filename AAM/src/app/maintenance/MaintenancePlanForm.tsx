'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MaintenancePlan } from '@/types/database'

interface Asset {
  id: string
  name: string
  asset_tag: string | null
}

interface MaintenancePlanFormProps {
  assets: Asset[]
  plan?: MaintenancePlan
  defaultAssetId?: string
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
  { value: 'custom', label: 'Custom (specify days)' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export default function MaintenancePlanForm({ assets, plan, defaultAssetId }: MaintenancePlanFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const assetOptions = [
    { value: '', label: 'No asset' },
    ...assets.map((a) => ({ value: a.id, label: `${a.name}${a.asset_tag ? ` (${a.asset_tag})` : ''}` })),
  ]

  const [form, setForm] = useState({
    asset_id: plan?.asset_id ?? defaultAssetId ?? '',
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    frequency: plan?.frequency ?? 'monthly',
    frequency_days: plan?.frequency_days?.toString() ?? '',
    next_due_date: plan?.next_due_date ?? '',
    assigned_to: plan?.assigned_to ?? '',
    priority: plan?.priority ?? 'medium',
    estimated_duration_hours: plan?.estimated_duration_hours?.toString() ?? '',
    is_active: plan?.is_active ?? true,
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.next_due_date) {
      setError('Name and next due date are required.')
      return
    }
    setLoading(true)
    setError('')

    const payload = {
      asset_id: form.asset_id || null,
      name: form.name,
      description: form.description || null,
      frequency: form.frequency as MaintenancePlan['frequency'],
      frequency_days: form.frequency === 'custom' && form.frequency_days ? parseInt(form.frequency_days) : null,
      next_due_date: form.next_due_date,
      assigned_to: form.assigned_to || null,
      priority: form.priority as MaintenancePlan['priority'],
      estimated_duration_hours: form.estimated_duration_hours ? parseFloat(form.estimated_duration_hours) : null,
      is_active: form.is_active,
    }

    let result
    if (plan) {
      result = await supabase.from('maintenance_plans').update(payload).eq('id', plan.id)
    } else {
      result = await supabase.from('maintenance_plans').insert(payload)
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    router.push('/maintenance')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Select label="Asset" value={form.asset_id} onChange={set('asset_id')} options={assetOptions} />
          </div>
          <div className="sm:col-span-2">
            <Input label="Plan Name *" value={form.name} onChange={set('name')} placeholder="e.g. Monthly Filter Replacement" />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Describe what this maintenance involves..." />
          </div>
          <Select label="Frequency" value={form.frequency} onChange={set('frequency')} options={FREQUENCY_OPTIONS} />
          {form.frequency === 'custom' && (
            <Input label="Every N Days" type="number" value={form.frequency_days} onChange={set('frequency_days')} placeholder="e.g. 45" min="1" />
          )}
          <Input label="Next Due Date *" type="date" value={form.next_due_date} onChange={set('next_due_date')} />
          <Select label="Priority" value={form.priority} onChange={set('priority')} options={PRIORITY_OPTIONS} />
          <Input label="Assigned To" value={form.assigned_to} onChange={set('assigned_to')} placeholder="Technician or team" />
          <Input label="Est. Duration (hours)" type="number" value={form.estimated_duration_hours} onChange={set('estimated_duration_hours')} placeholder="0.0" step="0.5" min="0" />
          <div className="sm:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 rounded text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">Plan is active</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>
            {plan ? 'Update Plan' : 'Create Plan'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
