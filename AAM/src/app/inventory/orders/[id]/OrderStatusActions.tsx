'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

const STATUS_FLOW: Record<string, { label: string; next: string }[]> = {
  draft: [{ label: 'Submit Order', next: 'submitted' }],
  submitted: [
    { label: 'Approve', next: 'approved' },
    { label: 'Cancel', next: 'cancelled' },
  ],
  approved: [{ label: 'Mark Ordered', next: 'ordered' }],
  ordered: [{ label: 'Mark Shipped', next: 'shipped' }],
  shipped: [{ label: 'Mark Received', next: 'received' }],
}

interface Props {
  orderId: string
  currentStatus: string
}

export default function OrderStatusActions({ orderId, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const actions = STATUS_FLOW[currentStatus] ?? []
  if (actions.length === 0) return null

  async function updateStatus(nextStatus: string) {
    setLoading(true)
    const supabase = createClient()
    const payload: Record<string, string> = { status: nextStatus }
    if (nextStatus === 'received') {
      payload.received_date = new Date().toISOString().split('T')[0]
    }
    const { error } = await supabase.from('inventory_orders').update(payload).eq('id', orderId)
    if (error) {
      alert('Failed to update status: ' + error.message)
      setLoading(false)
      return
    }
    router.refresh()
    setLoading(false)
  }

  return (
    <>
      {actions.map((action) => (
        <Button
          key={action.next}
          variant={action.next === 'cancelled' ? 'danger' : 'primary'}
          size="sm"
          loading={loading}
          onClick={() => updateStatus(action.next)}
        >
          {action.label}
        </Button>
      ))}
    </>
  )
}
