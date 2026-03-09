'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { InventoryItem } from '@/types/database'

const CATEGORY_OPTIONS = [
  { value: '', label: 'Select category...' },
  { value: 'Reagents', label: 'Reagents' },
  { value: 'Filters', label: 'Filters' },
  { value: 'PPE', label: 'PPE' },
  { value: 'Cleaning Supplies', label: 'Cleaning Supplies' },
  { value: 'Office Supplies', label: 'Office Supplies' },
  { value: 'Lab Consumables', label: 'Lab Consumables' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Mechanical Parts', label: 'Mechanical Parts' },
  { value: 'Other', label: 'Other' },
]

const UNIT_OPTIONS = [
  { value: '', label: 'Select unit...' },
  { value: 'each', label: 'Each' },
  { value: 'box', label: 'Box' },
  { value: 'case', label: 'Case' },
  { value: 'pack', label: 'Pack' },
  { value: 'roll', label: 'Roll' },
  { value: 'gallon', label: 'Gallon' },
  { value: 'liter', label: 'Liter' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'lb', label: 'Pound' },
  { value: 'pair', label: 'Pair' },
  { value: 'set', label: 'Set' },
]

interface Props {
  item?: InventoryItem
}

export default function InventoryItemForm({ item }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: item?.name ?? '',
    sku: item?.sku ?? '',
    category: item?.category ?? '',
    description: item?.description ?? '',
    unit: item?.unit ?? '',
    quantity_on_hand: item?.quantity_on_hand?.toString() ?? '0',
    reorder_point: item?.reorder_point?.toString() ?? '0',
    reorder_quantity: item?.reorder_quantity?.toString() ?? '0',
    unit_cost: item?.unit_cost?.toString() ?? '',
    location: item?.location ?? '',
    vendor: item?.vendor ?? '',
    next_count_date: item?.next_count_date ?? '',
    is_active: item?.is_active ?? true,
    notes: item?.notes ?? '',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.category || !form.unit) {
      setError('Name, category, and unit are required.')
      return
    }
    setLoading(true)
    setError('')

    const payload = {
      name: form.name,
      sku: form.sku || null,
      category: form.category as InventoryItem['category'],
      description: form.description || null,
      unit: form.unit,
      quantity_on_hand: parseInt(form.quantity_on_hand) || 0,
      reorder_point: parseInt(form.reorder_point) || 0,
      reorder_quantity: parseInt(form.reorder_quantity) || 0,
      unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : null,
      location: form.location || null,
      vendor: form.vendor || null,
      next_count_date: form.next_count_date || null,
      is_active: form.is_active,
      notes: form.notes || null,
    }

    let result
    if (item) {
      result = await supabase.from('inventory_items').update(payload).eq('id', item.id)
    } else {
      result = await supabase.from('inventory_items').insert(payload)
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    router.push('/inventory/items')
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
            <Input label="Item Name *" value={form.name} onChange={set('name')} placeholder="e.g. Nitrile Gloves (Large)" />
          </div>
          <Input label="SKU / Part Number" value={form.sku} onChange={set('sku')} placeholder="e.g. GLV-NIT-LG" />
          <Select label="Category *" value={form.category} onChange={set('category')} options={CATEGORY_OPTIONS} />
          <Select label="Unit of Measure *" value={form.unit} onChange={set('unit')} options={UNIT_OPTIONS} />
          <Input label="Unit Cost ($)" type="number" value={form.unit_cost} onChange={set('unit_cost')} placeholder="0.00" step="0.01" min="0" />
          <Input label="Quantity on Hand" type="number" value={form.quantity_on_hand} onChange={set('quantity_on_hand')} min="0" />
          <Input label="Reorder Point" type="number" value={form.reorder_point} onChange={set('reorder_point')} min="0" hint="Alert when stock drops to this level" />
          <Input label="Reorder Quantity" type="number" value={form.reorder_quantity} onChange={set('reorder_quantity')} min="0" hint="Default quantity to order" />
          <Input label="Location" value={form.location} onChange={set('location')} placeholder="e.g. Storage Room B, Shelf 3" />
          <Input label="Vendor" value={form.vendor} onChange={set('vendor')} placeholder="e.g. Fisher Scientific" />
          <Input label="Next Cycle Count Date" type="date" value={form.next_count_date} onChange={set('next_count_date')} />
          <div className="sm:col-span-2">
            <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Brief description of the item..." />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Additional notes..." />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>
            {item ? 'Update Item' : 'Create Item'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
