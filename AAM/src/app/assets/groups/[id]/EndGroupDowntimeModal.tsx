'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { splitCost } from '@/lib/assetPicker'

export interface GroupDowntimeEvent {
  id: string
  asset_id: string
  asset_name: string
  start_time: string
}

interface EndGroupDowntimeModalProps {
  groupName: string
  events: GroupDowntimeEvent[]
  onClose: () => void
}

/** Closes every ongoing downtime event in a group and brings each unit back to active. */
export default function EndGroupDowntimeModal({ groupName, events, onClose }: EndGroupDowntimeModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [endTime, setEndTime] = useState(new Date().toISOString().slice(0, 16))
  const [costImpact, setCostImpact] = useState('')
  const [impact, setImpact] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!endTime) { setError('End time is required.'); return }

    setLoading(true)
    setError('')

    const end = new Date(endTime)
    const costs = splitCost(costImpact ? parseFloat(costImpact) : null, events.length)
    const results = await Promise.all(
      events.map((event, i) =>
        supabase
          .from('downtime_events')
          .update({
            end_time: end.toISOString(),
            duration_hours: parseFloat(((end.getTime() - new Date(event.start_time).getTime()) / (1000 * 60 * 60)).toFixed(2)),
            cost_impact: costs[i],
            impact: impact || null,
          })
          .eq('id', event.id)
      )
    )
    const failed = results.find((r) => r.error)
    if (failed?.error) { setError(failed.error.message); setLoading(false); return }

    const { error: statusError } = await supabase
      .from('assets')
      .update({ status: 'active' })
      .in('id', [...new Set(events.map((e) => e.asset_id))])
    if (statusError) { setError(statusError.message); setLoading(false); return }

    router.refresh()
    onClose()
  }

  return (
    <Modal open={true} onClose={onClose} title={`End Downtime: ${groupName}`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
          <p className="font-medium">Ending {events.length} ongoing event{events.length === 1 ? '' : 's'}:</p>
          <ul className="mt-1 space-y-0.5">
            {events.map((event) => (
              <li key={event.id}>
                {event.asset_name} — since {new Date(event.start_time).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>

        <Input label="End Time *" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        <Input
          label="Total Cost Impact ($)"
          type="number"
          value={costImpact}
          onChange={(e) => setCostImpact(e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
          hint="Split evenly across the events."
        />
        <Textarea
          label="Operational Impact"
          value={impact}
          onChange={(e) => setImpact(e.target.value)}
          placeholder="Describe the impact on operations..."
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>End Downtime</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  )
}
