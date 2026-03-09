'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { InventoryItem } from '@/types/database'
import { Search, X, Plus, ArrowLeftRight } from 'lucide-react'

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

interface AlternateEntry {
  id?: string            // alternate_inventory_items row id (for deletes)
  itemId: string         // the referenced inventory item id
  name: string
  sku: string | null
  notes: string
}

interface Props {
  item?: InventoryItem
  existingAlternates?: AlternateEntry[]
  allItems?: InventoryItem[]
}

export default function InventoryItemForm({ item, existingAlternates = [], allItems = [] }: Props) {
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

  // Alternate items state
  const [alternates, setAlternates] = useState<AlternateEntry[]>(existingAlternates)
  const [altSearch, setAltSearch] = useState('')
  const [altSearchResults, setAltSearchResults] = useState<InventoryItem[]>([])
  const [showAltSearch, setShowAltSearch] = useState(false)

  // Filter search results: exclude current item and already-added alternates
  useEffect(() => {
    if (!altSearch.trim()) {
      setAltSearchResults([])
      return
    }
    const q = altSearch.toLowerCase()
    const addedIds = new Set(alternates.map((a) => a.itemId))
    const results = allItems.filter(
      (i) =>
        i.id !== item?.id &&
        !addedIds.has(i.id) &&
        (i.name.toLowerCase().includes(q) ||
          i.sku?.toLowerCase().includes(q) ||
          i.vendor?.toLowerCase().includes(q))
    )
    setAltSearchResults(results.slice(0, 8))
  }, [altSearch, alternates, allItems, item?.id])

  function addAlternate(picked: InventoryItem) {
    setAlternates((prev) => [
      ...prev,
      { itemId: picked.id, name: picked.name, sku: picked.sku, notes: '' },
    ])
    setAltSearch('')
    setAltSearchResults([])
    setShowAltSearch(false)
  }

  function removeAlternate(itemId: string) {
    setAlternates((prev) => prev.filter((a) => a.itemId !== itemId))
  }

  function updateAlternateNotes(itemId: string, notes: string) {
    setAlternates((prev) =>
      prev.map((a) => (a.itemId === itemId ? { ...a, notes } : a))
    )
  }

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

    let savedItemId = item?.id
    let result

    if (item) {
      result = await supabase.from('inventory_items').update(payload).eq('id', item.id)
    } else {
      const insertResult = await supabase.from('inventory_items').insert(payload).select().single()
      result = insertResult
      if (insertResult.data) savedItemId = insertResult.data.id
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    // Sync alternate items (best-effort — requires the migration to be applied)
    if (savedItemId && alternates.length >= 0) {
      try {
        // Delete all existing alternates for this item, then re-insert
        await supabase
          .from('alternate_inventory_items')
          .delete()
          .eq('item_id', savedItemId)

        if (alternates.length > 0) {
          const altPayload = alternates.map((a) => ({
            item_id: savedItemId!,
            alternate_item_id: a.itemId,
            notes: a.notes || null,
          }))
          await supabase.from('alternate_inventory_items').insert(altPayload)
        }
      } catch {
        // Migration may not be applied yet — silently skip
      }
    }

    router.push('/inventory/items')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main item fields */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 space-y-6">
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
        </div>

        {/* Alternate Items section */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <ArrowLeftRight className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Alternate / Substitute Items</h3>
              <p className="text-xs text-gray-500">Link other inventory items that can substitute for this one</p>
            </div>
          </div>

          {/* Current alternates list */}
          {alternates.length > 0 && (
            <div className="mb-4 space-y-2">
              {alternates.map((alt) => (
                <div key={alt.itemId} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{alt.name}</p>
                    {alt.sku && <p className="text-xs text-gray-500">{alt.sku}</p>}
                    <input
                      type="text"
                      value={alt.notes}
                      onChange={(e) => updateAlternateNotes(alt.itemId, e.target.value)}
                      placeholder="Optional note (e.g. 'use when primary is out of stock')"
                      className="mt-2 w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAlternate(alt.itemId)}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add alternate search */}
          {showAltSearch ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  value={altSearch}
                  onChange={(e) => setAltSearch(e.target.value)}
                  placeholder="Search by name, SKU, or vendor..."
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {altSearchResults.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-white shadow-sm divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {altSearchResults.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => addAlternate(i)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-blue-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{i.name}</p>
                        <p className="text-xs text-gray-500">{[i.sku, i.category, i.vendor].filter(Boolean).join(' • ')}</p>
                      </div>
                      <Plus className="h-4 w-4 flex-shrink-0 text-blue-600" />
                    </button>
                  ))}
                </div>
              )}
              {altSearch && altSearchResults.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">No matching items found</p>
              )}
              <button
                type="button"
                onClick={() => { setShowAltSearch(false); setAltSearch(''); setAltSearchResults([]) }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAltSearch(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add alternate item
            </button>
          )}
        </div>

        <div className="flex gap-3">
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
