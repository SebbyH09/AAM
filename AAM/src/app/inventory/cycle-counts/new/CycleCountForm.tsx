'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { InventoryItem } from '@/types/database'

interface Props {
  preselectedItemId?: string
}

export default function CycleCountForm({ preselectedItemId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<InventoryItem[]>([])

  const [form, setForm] = useState({
    item_id: preselectedItemId ?? '',
    counted_by: '',
    count_date: new Date().toISOString().split('T')[0],
    actual_quantity: '',
    notes: '',
  })

  useEffect(() => {
    async function loadItems() {
      const { data } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('is_active', true)
        .order('name')
      setItems(data ?? [])
    }
    loadItems()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedItem = items.find((i) => i.id === form.item_id)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.item_id || !form.counted_by || !form.actual_quantity) {
      setError('Item, counted by, and actual quantity are required.')
      return
    }
    setLoading(true)
    setError('')

    const expectedQty = selectedItem?.quantity_on_hand ?? 0
    const actualQty = parseInt(form.actual_quantity)
    const variance = actualQty - expectedQty

    const { error: insertError } = await supabase.from('cycle_counts').insert({
      item_id: form.item_id,
      counted_by: form.counted_by,
      count_date: form.count_date,
      expected_quantity: expectedQty,
      actual_quantity: actualQty,
      variance,
      notes: form.notes || null,
      status: 'completed' as const,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // Update the inventory item with actual quantity and last counted date
    await supabase.from('inventory_items').update({
      quantity_on_hand: actualQty,
      last_counted_date: form.count_date,
    }).eq('id', form.item_id)

    router.push('/inventory/cycle-counts')
    router.refresh()
  }

  const itemOptions = [
    { value: '', label: 'Select item...' },
    ...items.map((i) => ({ value: i.id, label: `${i.name}${i.sku ? ` (${i.sku})` : ''}` })),
  ]

  return (
    <div className="max-w-xl">
      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <Select label="Item *" value={form.item_id} onChange={set('item_id')} options={itemOptions} />

        {selectedItem && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm font-medium text-blue-800">Current System Quantity</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">
              {selectedItem.quantity_on_hand} {selectedItem.unit}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Location: {selectedItem.location ?? '—'} • Last counted: {selectedItem.last_counted_date ?? 'Never'}
            </p>
          </div>
        )}

        <Input label="Counted By *" value={form.counted_by} onChange={set('counted_by')} placeholder="e.g. Jane Smith" />
        <Input label="Count Date" type="date" value={form.count_date} onChange={set('count_date')} />
        <Input
          label="Actual Quantity *"
          type="number"
          min="0"
          value={form.actual_quantity}
          onChange={set('actual_quantity')}
          placeholder="Enter the physical count"
          hint={selectedItem ? `System shows ${selectedItem.quantity_on_hand} ${selectedItem.unit}` : undefined}
        />

        {form.actual_quantity && selectedItem && (
          <div className={`rounded-lg p-3 border ${
            parseInt(form.actual_quantity) === selectedItem.quantity_on_hand
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <p className="text-sm font-medium">
              {parseInt(form.actual_quantity) === selectedItem.quantity_on_hand ? (
                <span className="text-green-800">No variance - counts match</span>
              ) : (
                <span className="text-yellow-800">
                  Variance: {parseInt(form.actual_quantity) - selectedItem.quantity_on_hand > 0 ? '+' : ''}
                  {parseInt(form.actual_quantity) - selectedItem.quantity_on_hand} {selectedItem.unit}
                </span>
              )}
            </p>
          </div>
        )}

        <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Any observations or discrepancies..." />

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>
            Submit Count
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
