'use client'

import { useState } from 'react'
import { AlternativeItem } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, X, ArrowRightLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  assetId: string
  items: AlternativeItem[]
}

export default function AlternativeItems({ assetId, items }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    name: '',
    manufacturer: '',
    model: '',
    part_number: '',
    supplier: '',
    estimated_cost: '',
    notes: '',
  })

  function resetForm() {
    setForm({ name: '', manufacturer: '', model: '', part_number: '', supplier: '', estimated_cost: '', notes: '' })
    setShowForm(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    await supabase.from('alternative_items').insert({
      asset_id: assetId,
      name: form.name,
      manufacturer: form.manufacturer || null,
      model: form.model || null,
      part_number: form.part_number || null,
      supplier: form.supplier || null,
      estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
      notes: form.notes || null,
    })

    setSaving(false)
    resetForm()
    router.refresh()
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await supabase.from('alternative_items').delete().eq('id', id)
    setDeleting(null)
    router.refresh()
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-orange-600" />
          <h2 className="font-semibold text-gray-900">Alternative Inventory Items</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Add'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="border-b border-gray-200 p-4 sm:p-6 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Item name *"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Manufacturer"
              value={form.manufacturer}
              onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Model"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Part number"
              value={form.part_number}
              onChange={(e) => setForm({ ...form, part_number: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Supplier"
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Estimated cost"
              value={form.estimated_cost}
              onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add Inventory Item'}
          </button>
        </form>
      )}

      <div className="divide-y divide-gray-100">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="px-4 py-3 sm:px-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[item.manufacturer, item.model, item.part_number].filter(Boolean).join(' \u2022 ')}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                    {item.supplier && <span>Supplier: {item.supplier}</span>}
                    {item.estimated_cost != null && <span>Est. {formatCurrency(item.estimated_cost)}</span>}
                  </div>
                  {item.notes && <p className="text-xs text-gray-400 mt-1">{item.notes}</p>}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deleting === item.id}
                  className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  aria-label="Delete inventory item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="px-4 py-4 sm:px-6 text-sm text-gray-400">No alternative inventory items listed.</p>
        )}
      </div>
    </section>
  )
}
