'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { WorkOrder } from '@/types/database'

interface Asset {
  id: string
  name: string
  asset_tag: string | null
}

interface WorkOrderFormProps {
  assets: Asset[]
  workOrder?: WorkOrder
  defaultAssetId?: string
}

const CATEGORY_OPTIONS = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair', label: 'Repair' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'installation', label: 'Installation' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'other', label: 'Other' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function WorkOrderForm({ assets, workOrder, defaultAssetId }: WorkOrderFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const assetOptions = [
    { value: '', label: 'No asset (general work order)' },
    ...assets.map((a) => ({ value: a.id, label: `${a.name}${a.asset_tag ? ` (${a.asset_tag})` : ''}` })),
  ]

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    asset_id: workOrder?.asset_id ?? defaultAssetId ?? '',
    work_order_number: workOrder?.work_order_number ?? '',
    title: workOrder?.title ?? '',
    description: workOrder?.description ?? '',
    category: workOrder?.category ?? 'maintenance',
    priority: workOrder?.priority ?? 'medium',
    status: workOrder?.status ?? 'open',
    requested_by: workOrder?.requested_by ?? '',
    request_date: workOrder?.request_date ?? today,
    assigned_to: workOrder?.assigned_to ?? '',
    vendor: workOrder?.vendor ?? '',
    scheduled_date: workOrder?.scheduled_date ?? '',
    completed_date: workOrder?.completed_date ?? '',
    cost: workOrder?.cost?.toString() ?? '',
    notes: workOrder?.notes ?? '',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.request_date) {
      setError('Title and request date are required.')
      return
    }
    setLoading(true)
    setError('')

    const payload = {
      asset_id: form.asset_id || null,
      work_order_number: form.work_order_number || null,
      title: form.title,
      description: form.description || null,
      category: form.category as WorkOrder['category'],
      priority: form.priority as WorkOrder['priority'],
      status: form.status as WorkOrder['status'],
      requested_by: form.requested_by || null,
      request_date: form.request_date,
      assigned_to: form.assigned_to || null,
      vendor: form.vendor || null,
      scheduled_date: form.scheduled_date || null,
      completed_date: form.completed_date || null,
      cost: form.cost ? parseFloat(form.cost) : null,
      notes: form.notes || null,
    }

    let result
    if (workOrder) {
      result = await supabase.from('work_orders').update(payload).eq('id', workOrder.id)
    } else {
      result = await supabase.from('work_orders').insert(payload)
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    router.push('/work-orders')
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
            <Input label="Title *" value={form.title} onChange={set('title')} placeholder="e.g. Replace HVAC filter in lab" />
          </div>
          <div className="sm:col-span-2">
            <Select label="Asset (optional)" value={form.asset_id} onChange={set('asset_id')} options={assetOptions} />
          </div>
          <Input label="Work Order Number" value={form.work_order_number} onChange={set('work_order_number')} placeholder="e.g. WO-2024-001" />
          <Select label="Category" value={form.category} onChange={set('category')} options={CATEGORY_OPTIONS} />
          <div className="sm:col-span-2">
            <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Describe the work to be done..." />
          </div>
          <Select label="Priority" value={form.priority} onChange={set('priority')} options={PRIORITY_OPTIONS} />
          <Select label="Status" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
          <Input label="Requested By" value={form.requested_by} onChange={set('requested_by')} placeholder="Name" />
          <Input label="Request Date *" type="date" value={form.request_date} onChange={set('request_date')} />
          <Input label="Assigned To" value={form.assigned_to} onChange={set('assigned_to')} placeholder="Technician or team" />
          <Input label="Vendor / Service Provider" value={form.vendor} onChange={set('vendor')} placeholder="Company name" />
          <Input label="Scheduled Date" type="date" value={form.scheduled_date} onChange={set('scheduled_date')} />
          <Input label="Completed Date" type="date" value={form.completed_date} onChange={set('completed_date')} />
          <Input label="Cost ($)" type="number" value={form.cost} onChange={set('cost')} placeholder="0.00" step="0.01" min="0" />
          <div className="sm:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Additional notes..." />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>
            {workOrder ? 'Update Work Order' : 'Create Work Order'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
