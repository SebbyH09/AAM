'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MaintenancePlan } from '@/types/database'
import { MapPin, Plus, Trash2 } from 'lucide-react'

interface Asset {
  id: string
  name: string
  asset_tag: string | null
  location: string | null
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
    estimated_cost: plan?.estimated_cost?.toString() ?? '',
    is_active: plan?.is_active ?? true,
  })

  const [parts, setParts] = useState<{ name: string; quantity: string; part_number: string }[]>(
    plan?.parts?.map((p: any) => ({ name: p.name ?? '', quantity: p.quantity?.toString() ?? '1', part_number: p.part_number ?? '' })) ?? []
  )

  const addPart = () => setParts((prev) => [...prev, { name: '', quantity: '1', part_number: '' }])
  const removePart = (index: number) => setParts((prev) => prev.filter((_, i) => i !== index))
  const updatePart = (index: number, field: string, value: string) => {
    setParts((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  const selectedAsset = useMemo(() => assets.find((a) => a.id === form.asset_id), [assets, form.asset_id])

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

    const validParts = parts.filter((p) => p.name.trim())
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
      estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
      parts: validParts.length > 0 ? validParts.map((p) => ({ name: p.name, quantity: p.quantity ? parseInt(p.quantity) : 1, part_number: p.part_number || undefined })) : null,
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
          {selectedAsset && (
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-500">Location:</span>
                <span className="text-sm font-medium text-gray-700">{selectedAsset.location || 'Not specified'}</span>
              </div>
            </div>
          )}
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
          <Input label="Est. Cost ($)" type="number" value={form.estimated_cost} onChange={set('estimated_cost')} placeholder="0.00" step="0.01" min="0" />

          {/* Parts Section */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Required Parts</label>
              <button type="button" onClick={addPart} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                <Plus className="h-3 w-3" />
                Add Part
              </button>
            </div>
            {parts.length === 0 ? (
              <p className="text-xs text-gray-400">No parts added yet.</p>
            ) : (
              <div className="space-y-2">
                {parts.map((part, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Part name"
                      value={part.name}
                      onChange={(e) => updatePart(i, 'name', e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={part.quantity}
                      onChange={(e) => updatePart(i, 'quantity', e.target.value)}
                      min="1"
                      className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Part # (optional)"
                      value={part.part_number}
                      onChange={(e) => updatePart(i, 'part_number', e.target.value)}
                      className="w-36 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button type="button" onClick={() => removePart(i)} className="p-1 text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
