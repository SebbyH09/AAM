'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Repair } from '@/types/database'

interface Asset {
  id: string
  name: string
  asset_tag: string | null
}

interface RepairFormProps {
  assets: Asset[]
  repair?: Repair
  defaultAssetId?: string
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_parts', label: 'Waiting for Parts' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export default function RepairForm({ assets, repair, defaultAssetId }: RepairFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const assetOptions = [
    { value: '', label: 'No asset' },
    ...assets.map((a) => ({ value: a.id, label: `${a.name}${a.asset_tag ? ` (${a.asset_tag})` : ''}` })),
  ]

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    asset_id: repair?.asset_id ?? defaultAssetId ?? '',
    repair_number: repair?.repair_number ?? '',
    reported_by: repair?.reported_by ?? '',
    reported_date: repair?.reported_date ?? today,
    description: repair?.description ?? '',
    priority: repair?.priority ?? 'medium',
    status: repair?.status ?? 'open',
    assigned_to: repair?.assigned_to ?? '',
    vendor: repair?.vendor ?? '',
    started_date: repair?.started_date ?? '',
    completed_date: repair?.completed_date ?? '',
    root_cause: repair?.root_cause ?? '',
    resolution: repair?.resolution ?? '',
    parts_cost: repair?.parts_cost?.toString() ?? '',
    labor_cost: repair?.labor_cost?.toString() ?? '',
    warranty_repair: repair?.warranty_repair ?? false,
    notes: repair?.notes ?? '',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.reported_by || !form.description || !form.reported_date) {
      setError('Reported by, date, and description are required.')
      return
    }
    setLoading(true)
    setError('')

    const partsCost = form.parts_cost ? parseFloat(form.parts_cost) : null
    const laborCost = form.labor_cost ? parseFloat(form.labor_cost) : null

    const payload = {
      asset_id: form.asset_id || null,
      repair_number: form.repair_number || null,
      reported_by: form.reported_by,
      reported_date: form.reported_date,
      description: form.description,
      priority: form.priority as Repair['priority'],
      status: form.status as Repair['status'],
      assigned_to: form.assigned_to || null,
      vendor: form.vendor || null,
      started_date: form.started_date || null,
      completed_date: form.completed_date || null,
      root_cause: form.root_cause || null,
      resolution: form.resolution || null,
      parts_cost: partsCost,
      labor_cost: laborCost,
      total_cost: (partsCost ?? 0) + (laborCost ?? 0) || null,
      warranty_repair: form.warranty_repair,
      notes: form.notes || null,
    }

    let result
    if (repair) {
      result = await supabase.from('repairs').update(payload).eq('id', repair.id)
    } else {
      result = await supabase.from('repairs').insert(payload)
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    router.push('/repairs')
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
          <Input label="Repair Number" value={form.repair_number} onChange={set('repair_number')} placeholder="e.g. REP-2024-001" />
          <Input label="Reported By *" value={form.reported_by} onChange={set('reported_by')} placeholder="Name" />
          <Input label="Reported Date *" type="date" value={form.reported_date} onChange={set('reported_date')} />
          <Select label="Priority" value={form.priority} onChange={set('priority')} options={PRIORITY_OPTIONS} />
          <div className="sm:col-span-2">
            <Textarea label="Description *" value={form.description} onChange={set('description')} placeholder="Describe the issue..." />
          </div>
          <Select label="Status" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
          <Input label="Assigned To" value={form.assigned_to} onChange={set('assigned_to')} placeholder="Technician or vendor" />
          <Input label="Vendor / Service Provider" value={form.vendor} onChange={set('vendor')} placeholder="Company name" />
          <Input label="Started Date" type="date" value={form.started_date} onChange={set('started_date')} />
          <Input label="Completed Date" type="date" value={form.completed_date} onChange={set('completed_date')} />
          <div className="sm:col-span-2">
            <Textarea label="Root Cause" value={form.root_cause} onChange={set('root_cause')} placeholder="Root cause analysis..." />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Resolution" value={form.resolution} onChange={set('resolution')} placeholder="How was the issue resolved?" />
          </div>
          <Input label="Parts Cost ($)" type="number" value={form.parts_cost} onChange={set('parts_cost')} placeholder="0.00" step="0.01" min="0" />
          <Input label="Labor Cost ($)" type="number" value={form.labor_cost} onChange={set('labor_cost')} placeholder="0.00" step="0.01" min="0" />
          <div className="sm:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.warranty_repair}
                onChange={(e) => setForm((prev) => ({ ...prev, warranty_repair: e.target.checked }))}
                className="h-4 w-4 rounded text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">Warranty Repair (no charge)</span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Additional notes..." />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>
            {repair ? 'Update Repair' : 'Log Repair'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
