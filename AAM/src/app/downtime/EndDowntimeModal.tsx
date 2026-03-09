'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface DowntimeEvent {
  id: string
  start_time: string
  asset_id: string | null
  assets: { name: string; asset_tag: string | null } | null
}

interface EndDowntimeModalProps {
  event: DowntimeEvent
  onClose: () => void
}

export default function EndDowntimeModal({ event, onClose }: EndDowntimeModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const now = new Date().toISOString().slice(0, 16)
  const [endTime, setEndTime] = useState(now)
  const [costImpact, setCostImpact] = useState('')
  const [impact, setImpact] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!endTime) { setError('End time is required.'); return }

    setLoading(true)
    setError('')

    const start = new Date(event.start_time)
    const end = new Date(endTime)
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

    const { error: updateError } = await supabase
      .from('downtime_events')
      .update({
        end_time: end.toISOString(),
        duration_hours: parseFloat(durationHours.toFixed(2)),
        cost_impact: costImpact ? parseFloat(costImpact) : null,
        impact: impact || null,
      })
      .eq('id', event.id)

    if (updateError) { setError(updateError.message); setLoading(false); return }

    // Restore asset status
    if (event.asset_id) {
      await supabase.from('assets').update({ status: 'active' }).eq('id', event.asset_id)
    }

    router.refresh()
    onClose()
  }

  return (
    <Modal open={true} onClose={onClose} title="End Downtime Event" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-sm text-blue-700">
            <strong>Asset:</strong> {event.assets?.name ?? 'N/A'}
          </p>
          <p className="text-sm text-blue-700 mt-1">
            <strong>Started:</strong> {new Date(event.start_time).toLocaleString()}
          </p>
        </div>

        <Input
          label="End Time *"
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
        <Input
          label="Cost Impact ($)"
          type="number"
          value={costImpact}
          onChange={(e) => setCostImpact(e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
        />
        <Textarea
          label="Operational Impact"
          value={impact}
          onChange={(e) => setImpact(e.target.value)}
          placeholder="Describe the impact on operations..."
        />

        {endTime && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            Duration: <strong>
              {((new Date(endTime).getTime() - new Date(event.start_time).getTime()) / (1000 * 60 * 60)).toFixed(1)} hours
            </strong>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>End Downtime</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  )
}
