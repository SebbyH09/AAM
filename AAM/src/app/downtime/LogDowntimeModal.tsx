'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface Asset {
  id: string
  name: string
  asset_tag: string | null
}

interface LogDowntimeModalProps {
  assets: Asset[]
  onClose: () => void
}

const REASON_OPTIONS = [
  { value: 'breakdown', label: 'Breakdown' },
  { value: 'scheduled_maintenance', label: 'Scheduled Maintenance' },
  { value: 'repair', label: 'Repair' },
  { value: 'waiting_parts', label: 'Waiting for Parts' },
  { value: 'operator_error', label: 'Operator Error' },
  { value: 'other', label: 'Other' },
]

export default function LogDowntimeModal({ assets, onClose }: LogDowntimeModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const now = new Date().toISOString().slice(0, 16)

  const assetOptions = [
    { value: '', label: 'Select asset...' },
    ...assets.map((a) => ({ value: a.id, label: `${a.name}${a.asset_tag ? ` (${a.asset_tag})` : ''}` })),
  ]

  const [form, setForm] = useState({
    asset_id: '',
    reason: 'breakdown',
    start_time: now,
    end_time: '',
    description: '',
    impact: '',
    cost_impact: '',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.asset_id || !form.start_time) {
      setError('Asset and start time are required.')
      return
    }
    setLoading(true)
    setError('')

    let durationHours: number | null = null
    if (form.end_time) {
      const start = new Date(form.start_time)
      const end = new Date(form.end_time)
      durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    }

    const payload = {
      asset_id: form.asset_id,
      reason: form.reason as any,
      start_time: new Date(form.start_time).toISOString(),
      end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
      duration_hours: durationHours,
      description: form.description || null,
      impact: form.impact || null,
      cost_impact: form.cost_impact ? parseFloat(form.cost_impact) : null,
    }

    const { error } = await supabase.from('downtime_events').insert(payload)
    if (error) { setError(error.message); setLoading(false); return }

    // Update asset status if still active downtime
    if (!form.end_time) {
      await supabase.from('assets').update({ status: 'repair' }).eq('id', form.asset_id)
    }

    router.refresh()
    onClose()
  }

  return (
    <Modal open={true} onClose={onClose} title="Log Downtime Event" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Select label="Asset *" value={form.asset_id} onChange={set('asset_id')} options={assetOptions} />
          </div>
          <Select label="Reason" value={form.reason} onChange={set('reason')} options={REASON_OPTIONS} />
          <Input label="Cost Impact ($)" type="number" value={form.cost_impact} onChange={set('cost_impact')} placeholder="0.00" step="0.01" min="0" />
          <Input label="Start Time *" type="datetime-local" value={form.start_time} onChange={set('start_time')} />
          <Input label="End Time (if known)" type="datetime-local" value={form.end_time} onChange={set('end_time')} />
          <div className="sm:col-span-2">
            <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="What happened?" />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Impact" value={form.impact} onChange={set('impact')} placeholder="What was the impact on operations?" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>Log Downtime</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  )
}
