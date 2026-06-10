'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface Vendor {
  id: string
  name: string
}

interface Part {
  id: string
  part_number: string | null
  name: string
  description: string | null
  category: string | null
  unit_of_measure: string
  quantity_on_hand: number
  reorder_point: number | null
  reorder_quantity: number | null
  unit_cost: number | null
  location: string | null
  vendor_id: string | null
  notes: string | null
}

interface PartFormProps {
  vendors: Vendor[]
  part?: Part
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'Select category' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'filter', label: 'Filter' },
  { value: 'lubricant', label: 'Lubricant' },
  { value: 'other', label: 'Other' },
]

const UOM_OPTIONS = [
  { value: 'each', label: 'Each' },
  { value: 'box', label: 'Box' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'liter', label: 'Liter' },
  { value: 'meter', label: 'Meter' },
  { value: 'set', label: 'Set' },
]

export default function PartForm({ vendors, part }: PartFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const vendorOptions = [
    { value: '', label: 'No vendor' },
    ...vendors.map((v) => ({ value: v.id, label: v.name })),
  ]

  const [form, setForm] = useState({
    part_number: part?.part_number ?? '',
    name: part?.name ?? '',
    description: part?.description ?? '',
    category: part?.category ?? '',
    unit_of_measure: part?.unit_of_measure ?? 'each',
    quantity_on_hand: part?.quantity_on_hand?.toString() ?? '0',
    reorder_point: part?.reorder_point?.toString() ?? '',
    reorder_quantity: part?.reorder_quantity?.toString() ?? '',
    unit_cost: part?.unit_cost?.toString() ?? '',
    location: part?.location ?? '',
    vendor_id: part?.vendor_id ?? '',
    notes: part?.notes ?? '',
  })

  const set = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Part name is required.')
      return
    }
    setLoading(true)
    setError('')

    const payload = {
      part_number: form.part_number || null,
      name: form.name,
      description: form.description || null,
      category: form.category || null,
      unit_of_measure: form.unit_of_measure,
      quantity_on_hand: parseFloat(form.quantity_on_hand) || 0,
      reorder_point: form.reorder_point ? parseFloat(form.reorder_point) : null,
      reorder_quantity: form.reorder_quantity ? parseFloat(form.reorder_quantity) : null,
      unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : null,
      location: form.location || null,
      vendor_id: form.vendor_id || null,
      notes: form.notes || null,
    }

    let result
    if (part) {
      result = await supabase.from('parts').update(payload).eq('id', part.id)
    } else {
      result = await supabase.from('parts').insert(payload)
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    router.push('/parts')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Part Number" value={form.part_number} onChange={set('part_number')} placeholder="e.g. BRG-001" />
          <div className="sm:col-span-1" />
          <div className="sm:col-span-2">
            <Input label="Part Name *" value={form.name} onChange={set('name')} placeholder="Descriptive part name" />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Additional details..." rows={2} />
          </div>
          <Select label="Category" value={form.category} onChange={set('category')} options={CATEGORY_OPTIONS} />
          <Select label="Unit of Measure" value={form.unit_of_measure} onChange={set('unit_of_measure')} options={UOM_OPTIONS} />
          <Input
            label="Quantity on Hand"
            type="number"
            value={form.quantity_on_hand}
            onChange={set('quantity_on_hand')}
            step="0.01"
            min="0"
          />
          <Input
            label="Reorder Point"
            type="number"
            value={form.reorder_point}
            onChange={set('reorder_point')}
            placeholder="Trigger reorder when qty falls to..."
            step="0.01"
            min="0"
          />
          <Input
            label="Reorder Quantity"
            type="number"
            value={form.reorder_quantity}
            onChange={set('reorder_quantity')}
            placeholder="Standard order quantity"
            step="0.01"
            min="0"
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
          <Input label="Storage Location" value={form.location} onChange={set('location')} placeholder="e.g. Shelf B3, Room 104" />
          <Select label="Vendor" value={form.vendor_id} onChange={set('vendor_id')} options={vendorOptions} />
          <div className="sm:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Additional notes..." rows={2} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>
            {part ? 'Update Part' : 'Add Part'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
