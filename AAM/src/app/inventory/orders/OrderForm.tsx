'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { InventoryOrder, InventoryItem } from '@/types/database'
import { Plus, Trash2 } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
]

interface LineItem {
  item_id: string
  quantity: string
  unit_cost: string
}

interface Props {
  order?: InventoryOrder
  existingLineItems?: { item_id: string; quantity: number; unit_cost: number | null }[]
}

export default function OrderForm({ order, existingLineItems }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<InventoryItem[]>([])

  const [form, setForm] = useState({
    order_number: order?.order_number ?? '',
    vendor: order?.vendor ?? '',
    status: order?.status ?? 'draft',
    order_date: order?.order_date ?? new Date().toISOString().split('T')[0],
    expected_date: order?.expected_date ?? '',
    ordered_by: order?.ordered_by ?? '',
    notes: order?.notes ?? '',
  })

  const [lineItems, setLineItems] = useState<LineItem[]>(
    existingLineItems?.map((li) => ({
      item_id: li.item_id,
      quantity: li.quantity.toString(),
      unit_cost: li.unit_cost?.toString() ?? '',
    })) ?? [{ item_id: '', quantity: '', unit_cost: '' }]
  )

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

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string) {
    setLineItems((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      // Auto-fill unit cost from selected item
      if (field === 'item_id') {
        const selectedItem = items.find((i) => i.id === value)
        if (selectedItem?.unit_cost != null) {
          updated[index].unit_cost = selectedItem.unit_cost.toString()
        }
      }
      return updated
    })
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { item_id: '', quantity: '', unit_cost: '' }])
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vendor) {
      setError('Vendor is required.')
      return
    }
    const validLines = lineItems.filter((li) => li.item_id && li.quantity)
    if (validLines.length === 0) {
      setError('At least one line item with an item and quantity is required.')
      return
    }
    setLoading(true)
    setError('')

    // Calculate total cost
    const totalCost = validLines.reduce((sum, li) => {
      const qty = parseFloat(li.quantity) || 0
      const cost = parseFloat(li.unit_cost) || 0
      return sum + (qty * cost)
    }, 0)

    const orderPayload = {
      order_number: form.order_number || null,
      vendor: form.vendor,
      status: form.status as InventoryOrder['status'],
      order_date: form.order_date,
      expected_date: form.expected_date || null,
      ordered_by: form.ordered_by || null,
      total_cost: totalCost || null,
      notes: form.notes || null,
    }

    let orderId = order?.id
    if (order) {
      const { error: err } = await supabase.from('inventory_orders').update(orderPayload).eq('id', order.id)
      if (err) { setError(err.message); setLoading(false); return }
      // Delete existing line items and re-insert
      await supabase.from('inventory_order_items').delete().eq('order_id', order.id)
    } else {
      const { data, error: err } = await supabase.from('inventory_orders').insert(orderPayload).select('id').single()
      if (err || !data) { setError(err?.message ?? 'Failed to create order'); setLoading(false); return }
      orderId = data.id
    }

    // Insert line items
    const lineItemPayloads = validLines.map((li) => ({
      order_id: orderId!,
      item_id: li.item_id,
      quantity: parseInt(li.quantity) || 0,
      unit_cost: li.unit_cost ? parseFloat(li.unit_cost) : null,
      total_cost: li.unit_cost && li.quantity ? parseFloat(li.unit_cost) * parseInt(li.quantity) : null,
    }))

    const { error: liError } = await supabase.from('inventory_order_items').insert(lineItemPayloads)
    if (liError) { setError(liError.message); setLoading(false); return }

    router.push('/inventory/orders')
    router.refresh()
  }

  const itemOptions = [
    { value: '', label: 'Select item...' },
    ...items.map((i) => ({ value: i.id, label: `${i.name}${i.sku ? ` (${i.sku})` : ''}` })),
  ]

  return (
    <div className="max-w-3xl">
      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Order Number" value={form.order_number} onChange={set('order_number')} placeholder="e.g. PO-2026-001" />
          <Input label="Vendor *" value={form.vendor} onChange={set('vendor')} placeholder="e.g. Fisher Scientific" />
          <Select label="Status" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
          <Input label="Order Date" type="date" value={form.order_date} onChange={set('order_date')} />
          <Input label="Expected Delivery Date" type="date" value={form.expected_date} onChange={set('expected_date')} />
          <Input label="Ordered By" value={form.ordered_by} onChange={set('ordered_by')} placeholder="e.g. John Smith" />
          <div className="sm:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Additional notes..." />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>
            <button
              type="button"
              onClick={addLineItem}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <Plus className="h-4 w-4" /> Add Item
            </button>
          </div>
          <div className="space-y-3">
            {lineItems.map((li, i) => (
              <div key={i} className="flex gap-3 items-end rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex-1">
                  <Select
                    label="Item"
                    value={li.item_id}
                    onChange={(e) => updateLineItem(i, 'item_id', e.target.value)}
                    options={itemOptions}
                  />
                </div>
                <div className="w-24">
                  <Input
                    label="Qty"
                    type="number"
                    min="1"
                    value={li.quantity}
                    onChange={(e) => updateLineItem(i, 'quantity', e.target.value)}
                  />
                </div>
                <div className="w-28">
                  <Input
                    label="Unit Cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={li.unit_cost}
                    onChange={(e) => updateLineItem(i, 'unit_cost', e.target.value)}
                  />
                </div>
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLineItem(i)}
                    className="mb-1 p-1.5 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>
            {order ? 'Update Order' : 'Create Order'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
