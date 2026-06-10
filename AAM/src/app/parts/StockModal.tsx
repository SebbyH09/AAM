'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Part {
  id: string
  name: string
  quantity_on_hand: number
  unit_of_measure: string
}

interface StockModalProps {
  part: Part
  mode: 'add' | 'use'
  onClose: () => void
}

const TYPE_OPTIONS_ADD = [
  { value: 'received', label: 'Received' },
  { value: 'returned', label: 'Returned' },
  { value: 'adjusted', label: 'Adjusted' },
]

const TYPE_OPTIONS_USE = [
  { value: 'consumed', label: 'Consumed' },
  { value: 'adjusted', label: 'Adjusted' },
]

export default function StockModal({ part, mode, onClose }: StockModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    type: mode === 'add' ? 'received' : 'consumed',
    quantity: '',
    unit_cost: '',
    performed_by: '',
    notes: '',
    transaction_date: today,
  })

  const set = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const qty = parseFloat(form.quantity)
    if (!qty || qty <= 0) {
      setError('Quantity must be a positive number.')
      return
    }
    setLoading(true)
    setError('')

    const isDeduction = form.type === 'consumed'
    const delta = isDeduction ? -qty : qty
    const newQty = part.quantity_on_hand + delta

    // Insert transaction
    const { error: txError } = await supabase.from('parts_transactions').insert({
      part_id: part.id,
      type: form.type,
      quantity: qty,
      unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : null,
      performed_by: form.performed_by || null,
      notes: form.notes || null,
      transaction_date: form.transaction_date,
    })

    if (txError) {
      setError(txError.message)
      setLoading(false)
      return
    }

    // Update quantity on hand
    const { error: updateError } = await supabase
      .from('parts')
      .update({ quantity_on_hand: newQty })
      .eq('id', part.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.refresh()
    onClose()
  }

  const typeOptions = mode === 'add' ? TYPE_OPTIONS_ADD : TYPE_OPTIONS_USE
  const title = mode === 'add' ? 'Add Stock' : 'Use Stock'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{part.name} — Current: {part.quantity_on_hand} {part.unit_of_measure}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          <Select
            label="Transaction Type"
            value={form.type}
            onChange={set('type')}
            options={typeOptions}
          />
          <Input
            label="Quantity *"
            type="number"
            value={form.quantity}
            onChange={set('quantity')}
            placeholder="0"
            step="0.01"
            min="0.01"
          />
          <Input
            label="Unit Cost ($)"
            type="number"
            value={form.unit_cost}
            onChange={set('unit_cost')}
            placeholder="0.00"
            step="0.01"
            min="0"
          />
          <Input
            label="Performed By"
            value={form.performed_by}
            onChange={set('performed_by')}
            placeholder="Name"
          />
          <Input
            label="Transaction Date"
            type="date"
            value={form.transaction_date}
            onChange={set('transaction_date')}
          />
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={set('notes')}
            placeholder="Reason or reference..."
            rows={2}
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>{title}</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
