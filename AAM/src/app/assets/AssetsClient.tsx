'use client'

import { useState, useRef } from 'react'
import { Badge } from '@/components/ui/Badge'
import { formatDate, statusColor } from '@/lib/utils'
import { Asset } from '@/types/database'
import Link from 'next/link'
import { Search, Package, ChevronRight, Download, Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['All', 'Analytical', 'Lab Equipment', 'HVAC', 'IT/Network', 'Electrical', 'Mechanical', 'Other']
const STATUSES = ['all', 'active', 'inactive', 'repair', 'decommissioned']

interface AssetsClientProps {
  assets: Asset[]
}

export default function AssetsClient({ assets }: AssetsClientProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[]; total: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const filtered = assets.filter((a) => {
    const matchSearch =
      search === '' ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.asset_tag?.toLowerCase().includes(search.toLowerCase())) ||
      (a.serial_number?.toLowerCase().includes(search.toLowerCase())) ||
      (a.location?.toLowerCase().includes(search.toLowerCase()))
    const matchCategory = selectedCategory === 'All' || a.category === selectedCategory
    const matchStatus = selectedStatus === 'all' || a.status === selectedStatus
    return matchSearch && matchCategory && matchStatus
  })

  async function handleImport() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/assets/import', { method: 'POST', body: formData })
    const data = await res.json()

    setImportResult(data)
    setImporting(false)

    if (data.imported > 0) {
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                selectedStatus === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Import / Export buttons */}
      <div className="flex gap-2">
        <a
          href="/api/assets/export"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
        <button
          onClick={() => { setImportOpen(true); setImportResult(null) }}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </button>
      </div>

      {/* Import Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Import Assets from CSV</h2>
              <button onClick={() => setImportOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Upload a CSV file with columns: <span className="font-medium">name</span> (required),{' '}
                <span className="font-medium">category</span> (required), asset_tag, manufacturer, model,
                serial_number, location, status, purchase_date, purchase_cost, notes.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-600 hover:file:bg-blue-100"
              />
              {importResult && (
                <div className="rounded-lg bg-gray-50 p-3 text-sm">
                  <p className="font-medium text-gray-900">
                    Imported {importResult.imported} of {importResult.total} rows
                  </p>
                  {importResult.errors.length > 0 && (
                    <ul className="mt-2 space-y-1 text-red-600">
                      {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setImportOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Package className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No assets found</p>
          <p className="text-sm text-gray-400 mt-1">
            {assets.length === 0 ? 'Add your first asset to get started' : 'Try adjusting your filters'}
          </p>
          <Link
            href="/assets/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Asset
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Purchase Date</th>
                  <th className="relative px-6 py-3"><span className="sr-only">View</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                        <p className="text-xs text-gray-500">
                          {[asset.asset_tag, asset.manufacturer, asset.model].filter(Boolean).join(' \u2022 ')}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{asset.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{asset.location ?? '\u2014'}</td>
                    <td className="px-6 py-4">
                      <Badge className={statusColor(asset.status)}>{asset.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(asset.purchase_date)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/assets/${asset.id}`}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        View
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {filtered.map((asset) => (
              <Link
                key={asset.id}
                href={`/assets/${asset.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[asset.asset_tag, asset.manufacturer, asset.model].filter(Boolean).join(' \u2022 ')}
                    </p>
                  </div>
                  <Badge className={`ml-2 flex-shrink-0 ${statusColor(asset.status)}`}>{asset.status}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                  <span>{asset.category}</span>
                  {asset.location && <><span>&middot;</span><span>{asset.location}</span></>}
                  {asset.purchase_date && <><span>&middot;</span><span>{formatDate(asset.purchase_date)}</span></>}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
