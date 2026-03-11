'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Upload, CheckCircle2, XCircle, Download, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'

const VALID_CATEGORIES = ['Analytical', 'Lab Equipment', 'HVAC', 'IT/Network', 'Electrical', 'Mechanical', 'Other']
const VALID_STATUSES = ['active', 'inactive', 'repair', 'decommissioned']

const REQUIRED_COLUMNS = ['name', 'category']
const OPTIONAL_COLUMNS = ['asset_tag', 'manufacturer', 'model', 'serial_number', 'location', 'status', 'purchase_date', 'purchase_cost', 'notes']

interface ParsedRow {
  name: string
  category: string
  asset_tag?: string
  manufacturer?: string
  model?: string
  serial_number?: string
  location?: string
  status?: string
  purchase_date?: string
  purchase_cost?: number
  notes?: string
}

interface RowResult {
  row: number
  name: string
  success: boolean
  error?: string
}

interface AssetImportProps {
  onSuccess?: () => void
}

export default function AssetImport({ onSuccess }: AssetImportProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<ParsedRow[]>([])
  const [results, setResults] = useState<RowResult[]>([])
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  function downloadExample() {
    const exampleData = [
      {
        name: 'HPLC System #1',
        asset_tag: 'ASSET-001',
        category: 'Analytical',
        manufacturer: 'Agilent',
        model: '1260 Infinity II',
        serial_number: 'DE12345678',
        location: 'Lab Room 204',
        status: 'active',
        purchase_date: '2024-01-15',
        purchase_cost: 45000,
        notes: 'Primary HPLC system',
      },
      {
        name: 'Fume Hood A',
        asset_tag: 'ASSET-002',
        category: 'Lab Equipment',
        manufacturer: 'Labconco',
        model: 'Protector XStream',
        serial_number: 'LC-98765',
        location: 'Lab Room 101',
        status: 'active',
        purchase_date: '2023-06-20',
        purchase_cost: 8500,
        notes: '',
      },
      {
        name: 'UPS Battery Backup',
        asset_tag: 'ASSET-003',
        category: 'Electrical',
        manufacturer: 'APC',
        model: 'Smart-UPS 3000',
        serial_number: 'APC-55443',
        location: 'Server Room B',
        status: 'active',
        purchase_date: '2024-03-01',
        purchase_cost: 2200,
        notes: 'Backup for server rack 2',
      },
    ]

    const ws = XLSX.utils.json_to_sheet(exampleData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Assets')

    // Set column widths for readability
    ws['!cols'] = [
      { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 20 },
      { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 24 },
    ]

    XLSX.writeFile(wb, 'asset_import_example.xlsx')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setResults([])
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

        if (json.length === 0) {
          setError('The spreadsheet is empty. Please add asset data and try again.')
          setPreview([])
          return
        }

        // Normalize column headers (lowercase, trim)
        const normalized: ParsedRow[] = json.map((row) => {
          const normalizedRow: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(row)) {
            normalizedRow[key.toLowerCase().trim().replace(/\s+/g, '_')] = value
          }
          return {
            name: String(normalizedRow.name ?? '').trim(),
            category: String(normalizedRow.category ?? '').trim(),
            asset_tag: normalizedRow.asset_tag ? String(normalizedRow.asset_tag).trim() : undefined,
            manufacturer: normalizedRow.manufacturer ? String(normalizedRow.manufacturer).trim() : undefined,
            model: normalizedRow.model ? String(normalizedRow.model).trim() : undefined,
            serial_number: normalizedRow.serial_number ? String(normalizedRow.serial_number).trim() : undefined,
            location: normalizedRow.location ? String(normalizedRow.location).trim() : undefined,
            status: normalizedRow.status ? String(normalizedRow.status).trim().toLowerCase() : undefined,
            purchase_date: normalizedRow.purchase_date ? String(normalizedRow.purchase_date).trim() : undefined,
            purchase_cost: normalizedRow.purchase_cost ? Number(normalizedRow.purchase_cost) : undefined,
            notes: normalizedRow.notes ? String(normalizedRow.notes).trim() : undefined,
          }
        })

        // Validate required columns exist
        const firstRow = Object.keys(json[0]).map((k) => k.toLowerCase().trim().replace(/\s+/g, '_'))
        const missingCols = REQUIRED_COLUMNS.filter((c) => !firstRow.includes(c))
        if (missingCols.length > 0) {
          setError(`Missing required columns: ${missingCols.join(', ')}. Required columns are: name, category.`)
          setPreview([])
          return
        }

        setPreview(normalized)
      } catch {
        setError('Could not parse the file. Please ensure it is a valid .xlsx or .xls file.')
        setPreview([])
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function validateRow(row: ParsedRow, index: number): string | null {
    if (!row.name) return `Row ${index + 2}: Name is required`
    if (!row.category) return `Row ${index + 2}: Category is required`
    if (!VALID_CATEGORIES.includes(row.category)) {
      return `Row ${index + 2}: Invalid category "${row.category}". Valid: ${VALID_CATEGORIES.join(', ')}`
    }
    if (row.status && !VALID_STATUSES.includes(row.status)) {
      return `Row ${index + 2}: Invalid status "${row.status}". Valid: ${VALID_STATUSES.join(', ')}`
    }
    if (row.purchase_cost !== undefined && isNaN(row.purchase_cost)) {
      return `Row ${index + 2}: Purchase cost must be a number`
    }
    return null
  }

  async function handleImport() {
    if (preview.length === 0) return

    // Validate all rows first
    const validationErrors: string[] = []
    for (let i = 0; i < preview.length; i++) {
      const err = validateRow(preview[i], i)
      if (err) validationErrors.push(err)
    }
    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'))
      return
    }

    setImporting(true)
    setError('')
    const importResults: RowResult[] = []

    for (let i = 0; i < preview.length; i++) {
      const row = preview[i]
      const payload = {
        name: row.name,
        category: row.category,
        asset_tag: row.asset_tag || null,
        manufacturer: row.manufacturer || null,
        model: row.model || null,
        serial_number: row.serial_number || null,
        location: row.location || null,
        status: (row.status as 'active' | 'inactive' | 'repair' | 'decommissioned') || 'active',
        purchase_date: row.purchase_date || null,
        purchase_cost: row.purchase_cost ?? null,
        notes: row.notes || null,
      }

      const { error: insertError } = await supabase.from('assets').insert(payload)
      importResults.push({
        row: i + 2,
        name: row.name,
        success: !insertError,
        error: insertError?.message,
      })
    }

    setResults(importResults)
    setPreview([])
    setImporting(false)

    const successCount = importResults.filter((r) => r.success).length
    if (successCount > 0) {
      router.refresh()
      if (importResults.every((r) => r.success)) {
        onSuccess?.()
      }
    }
  }

  function reset() {
    setPreview([])
    setResults([])
    setError('')
    setFileName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const successCount = results.filter((r) => r.success).length
  const failCount = results.filter((r) => !r.success).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Upload an .xlsx or .xls file to bulk import assets.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={downloadExample}>
          <Download className="h-4 w-4" />
          Download Example
        </Button>
      </div>

      {/* Example table */}
      <div className="rounded-lg border border-gray-200 overflow-x-auto">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Format (Example)</p>
        </div>
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left font-medium text-gray-700">name *</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">asset_tag</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">category *</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">manufacturer</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">model</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">serial_number</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">location</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">status</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">purchase_date</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">purchase_cost</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-3 py-1.5 text-gray-600">HPLC System #1</td>
              <td className="px-3 py-1.5 text-gray-600">ASSET-001</td>
              <td className="px-3 py-1.5 text-gray-600">Analytical</td>
              <td className="px-3 py-1.5 text-gray-600">Agilent</td>
              <td className="px-3 py-1.5 text-gray-600">1260 Infinity II</td>
              <td className="px-3 py-1.5 text-gray-600">DE12345678</td>
              <td className="px-3 py-1.5 text-gray-600">Lab Room 204</td>
              <td className="px-3 py-1.5 text-gray-600">active</td>
              <td className="px-3 py-1.5 text-gray-600">2024-01-15</td>
              <td className="px-3 py-1.5 text-gray-600">45000</td>
              <td className="px-3 py-1.5 text-gray-600">Primary HPLC</td>
            </tr>
            <tr>
              <td className="px-3 py-1.5 text-gray-600">Fume Hood A</td>
              <td className="px-3 py-1.5 text-gray-600">ASSET-002</td>
              <td className="px-3 py-1.5 text-gray-600">Lab Equipment</td>
              <td className="px-3 py-1.5 text-gray-600">Labconco</td>
              <td className="px-3 py-1.5 text-gray-600">Protector XStream</td>
              <td className="px-3 py-1.5 text-gray-600">LC-98765</td>
              <td className="px-3 py-1.5 text-gray-600">Lab Room 101</td>
              <td className="px-3 py-1.5 text-gray-600">active</td>
              <td className="px-3 py-1.5 text-gray-600">2023-06-20</td>
              <td className="px-3 py-1.5 text-gray-600">8500</td>
              <td className="px-3 py-1.5 text-gray-600"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p><strong>Required columns:</strong> name, category</p>
        <p><strong>Valid categories:</strong> {VALID_CATEGORIES.join(', ')}</p>
        <p><strong>Valid statuses:</strong> {VALID_STATUSES.join(', ')} (defaults to &quot;active&quot;)</p>
        <p><strong>Date format:</strong> YYYY-MM-DD</p>
      </div>

      {/* File upload */}
      <div className="flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <Upload className="h-4 w-4" />
          {fileName || 'Choose File'}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        {preview.length > 0 && (
          <>
            <span className="text-sm text-gray-600">{preview.length} row(s) ready to import</span>
            <Button type="button" onClick={handleImport} loading={importing} size="sm">
              Import {preview.length} Asset{preview.length !== 1 ? 's' : ''}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={reset}>Cancel</Button>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 whitespace-pre-line flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview table */}
      {preview.length > 0 && (
        <div className="rounded-lg border border-blue-200 overflow-x-auto">
          <div className="px-3 py-2 bg-blue-50 border-b border-blue-200">
            <p className="text-xs font-medium text-blue-700">Preview — Review before importing</p>
          </div>
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-blue-50/50">
                <th className="px-3 py-2 text-left font-medium text-gray-700">#</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Category</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Asset Tag</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Manufacturer</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Location</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.map((row, i) => {
                const rowError = validateRow(row, i)
                return (
                  <tr key={i} className={rowError ? 'bg-red-50' : ''}>
                    <td className="px-3 py-1.5 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-1.5 text-gray-900 font-medium">{row.name || <span className="text-red-500">Missing</span>}</td>
                    <td className="px-3 py-1.5 text-gray-600">{row.category || <span className="text-red-500">Missing</span>}</td>
                    <td className="px-3 py-1.5 text-gray-600">{row.asset_tag ?? '—'}</td>
                    <td className="px-3 py-1.5 text-gray-600">{row.manufacturer ?? '—'}</td>
                    <td className="px-3 py-1.5 text-gray-600">{row.location ?? '—'}</td>
                    <td className="px-3 py-1.5 text-gray-600">{row.status || 'active'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            {successCount > 0 && (
              <span className="flex items-center gap-1 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                {successCount} imported successfully
              </span>
            )}
            {failCount > 0 && (
              <span className="flex items-center gap-1 text-sm text-red-700">
                <XCircle className="h-4 w-4" />
                {failCount} failed
              </span>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={reset}>Import More</Button>
          </div>
          {failCount > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
              {results.filter((r) => !r.success).map((r) => (
                <p key={r.row} className="text-xs text-red-700">
                  Row {r.row} ({r.name}): {r.error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
