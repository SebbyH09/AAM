'use client'

import { useState, useRef } from 'react'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { InventoryItem } from '@/types/database'
import Link from 'next/link'
import { Search, Boxes, ChevronRight, Download, Upload, AlertCircle, CheckCircle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = ['All', 'Reagents', 'Filters', 'PPE', 'Cleaning Supplies', 'Office Supplies', 'Lab Consumables', 'Electrical', 'Mechanical Parts', 'Other']
const STOCK_FILTERS = ['all', 'low', 'out', 'ok']

const CSV_HEADERS = [
  'name', 'sku', 'category', 'unit', 'quantity_on_hand', 'reorder_point',
  'reorder_quantity', 'unit_cost', 'location', 'vendor', 'description', 'notes',
]

const VALID_CATEGORIES = ['Reagents', 'Filters', 'PPE', 'Cleaning Supplies', 'Office Supplies', 'Lab Consumables', 'Electrical', 'Mechanical Parts', 'Other']

interface Props {
  items: InventoryItem[]
}

interface ImportResult {
  success: number
  errors: string[]
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line) => {
    // Handle quoted fields with commas
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    values.push(current.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
}

export default function InventoryItemsClient({ items: initialItems }: Props) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [stockFilter, setStockFilter] = useState('all')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = items.filter((item) => {
    const matchSearch =
      search === '' ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.sku?.toLowerCase().includes(search.toLowerCase())) ||
      (item.location?.toLowerCase().includes(search.toLowerCase())) ||
      (item.vendor?.toLowerCase().includes(search.toLowerCase()))
    const matchCategory = selectedCategory === 'All' || item.category === selectedCategory
    let matchStock = true
    if (stockFilter === 'low') matchStock = item.quantity_on_hand > 0 && item.quantity_on_hand <= item.reorder_point
    if (stockFilter === 'out') matchStock = item.quantity_on_hand === 0
    if (stockFilter === 'ok') matchStock = item.quantity_on_hand > item.reorder_point
    return matchSearch && matchCategory && matchStock
  })

  function stockBadge(item: InventoryItem) {
    if (item.quantity_on_hand === 0) return { label: 'Out of stock', color: 'bg-red-100 text-red-800' }
    if (item.quantity_on_hand <= item.reorder_point) return { label: 'Low stock', color: 'bg-orange-100 text-orange-800' }
    return { label: 'In stock', color: 'bg-green-100 text-green-800' }
  }

  // ── Export CSV ─────────────────────────────────────────────────────
  function handleExport() {
    const rows = [
      CSV_HEADERS.join(','),
      ...filtered.map((item) =>
        CSV_HEADERS.map((h) => {
          const val = (item as any)[h]
          if (val == null) return ''
          const str = String(val)
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str
        }).join(',')
      ),
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-items-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import CSV ─────────────────────────────────────────────────────
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)

    try {
      const text = await file.text()
      const rows = parseCSV(text)
      const errors: string[] = []
      const valid: any[] = []

      rows.forEach((row, idx) => {
        const lineNum = idx + 2
        if (!row.name) { errors.push(`Row ${lineNum}: Missing required field "name"`); return }
        if (!row.category) { errors.push(`Row ${lineNum}: Missing required field "category"`); return }
        if (!row.unit) { errors.push(`Row ${lineNum}: Missing required field "unit"`); return }
        if (!VALID_CATEGORIES.includes(row.category)) {
          errors.push(`Row ${lineNum}: Invalid category "${row.category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`); return
        }
        valid.push({
          name: row.name,
          sku: row.sku || null,
          category: row.category as InventoryItem['category'],
          unit: row.unit,
          quantity_on_hand: parseInt(row.quantity_on_hand) || 0,
          reorder_point: parseInt(row.reorder_point) || 0,
          reorder_quantity: parseInt(row.reorder_quantity) || 0,
          unit_cost: row.unit_cost ? parseFloat(row.unit_cost) : null,
          location: row.location || null,
          vendor: row.vendor || null,
          description: row.description || null,
          notes: row.notes || null,
          is_active: true,
        })
      })

      if (valid.length > 0) {
        const supabase = createClient()
        const { data, error } = await supabase.from('inventory_items').insert(valid).select()
        if (error) {
          errors.push(`Database error: ${error.message}`)
          setImportResult({ success: 0, errors })
        } else {
          setItems((prev) => [...prev, ...(data as InventoryItem[])])
          setImportResult({ success: data.length, errors })
        }
      } else {
        setImportResult({ success: 0, errors: errors.length ? errors : ['No valid rows found in CSV'] })
      }
    } catch {
      setImportResult({ success: 0, errors: ['Failed to parse CSV file. Please check the file format.'] })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function downloadTemplate() {
    const example = [
      CSV_HEADERS.join(','),
      'Nitrile Gloves (Large),GLV-NIT-LG,PPE,box,50,10,20,12.99,Storage Room A,Fisher Scientific,Large nitrile gloves,',
      'Isopropyl Alcohol 70%,IPA-70-1G,Cleaning Supplies,gallon,5,2,5,8.50,Lab Shelf 2,VWR,,',
    ]
    const blob = new Blob([example.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inventory-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Import Result Banner */}
      {importResult && (
        <div className={`rounded-lg border p-4 ${importResult.errors.length > 0 && importResult.success === 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {importResult.success > 0
                ? <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                : <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              }
              <div>
                {importResult.success > 0 && (
                  <p className="text-sm font-semibold text-green-800">
                    Successfully imported {importResult.success} item{importResult.success !== 1 ? 's' : ''}
                  </p>
                )}
                {importResult.errors.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {importResult.errors.map((e, i) => (
                      <li key={i} className="text-xs text-red-700">{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top action bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search items, SKU, vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Import / Export buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="absolute inset-0 cursor-pointer opacity-0"
              disabled={importing}
            />
            <button
              disabled={importing}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              <span>{importing ? 'Importing…' : 'Import CSV'}</span>
            </button>
          </div>
          <button
            onClick={downloadTemplate}
            className="hidden items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors sm:inline-flex"
          >
            Template
          </button>
        </div>
      </div>

      {/* Stock filter pills */}
      <div className="flex gap-2 flex-wrap">
        {STOCK_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStockFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              stockFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'ok' ? 'In Stock' : s === 'out' ? 'Out of Stock' : s === 'low' ? 'Low Stock' : 'All'}
          </button>
        ))}
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Boxes className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No items found</p>
          <p className="text-sm text-gray-400 mt-1">
            {items.length === 0 ? 'Add your first inventory item to get started' : 'Try adjusting your filters'}
          </p>
          <Link
            href="/inventory/items/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Item
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 md:hidden">
            {filtered.map((item) => {
              const badge = stockBadge(item)
              return (
                <Link
                  key={item.id}
                  href={`/inventory/items/${item.id}`}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="truncate text-xs text-gray-500 mt-0.5">
                      {[item.sku, item.vendor].filter(Boolean).join(' • ')}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge className={badge.color}>{badge.label}</Badge>
                      <span className="text-xs text-gray-500">{item.category}</span>
                      {item.location && (
                        <span className="text-xs text-gray-500">{item.location}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      Qty: <span className="font-medium">{item.quantity_on_hand} {item.unit}</span>
                      {item.unit_cost != null && (
                        <> · {formatCurrency(item.unit_cost)}/unit</>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="ml-3 h-5 w-5 flex-shrink-0 text-gray-400" />
                </Link>
              )
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Qty on Hand</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Unit Cost</th>
                  <th className="relative px-6 py-3"><span className="sr-only">View</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => {
                  const badge = stockBadge(item)
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {[item.sku, item.vendor].filter(Boolean).join(' • ')}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.location ?? '—'}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {item.quantity_on_hand} {item.unit}
                        </span>
                        <p className="text-xs text-gray-400">Reorder at {item.reorder_point}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={badge.color}>{badge.label}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.unit_cost)}</td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/inventory/items/${item.id}`}
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          View
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
