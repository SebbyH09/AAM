'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Upload, X, FileText, ChevronDown, ChevronRight } from 'lucide-react'

interface LinkedAssetOption {
  asset_id: string
  name: string
  asset_tag?: string | null
}

interface AddServiceReportModalProps {
  serviceContractId?: string | null
  maintenancePlanId?: string | null
  assetId?: string | null
  assetName?: string
  linkedAssets?: LinkedAssetOption[]
  onClose: () => void
  onSaved?: () => void
}

const TYPE_OPTIONS = [
  { value: 'service_visit', label: 'Service Visit' },
  { value: 'pm_completed', label: 'PM Completed' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'repair', label: 'Repair' },
  { value: 'emergency', label: 'Emergency Call' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'requires_followup', label: 'Requires Follow-up' },
]

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Shared fields carried over between saves so a stack of reports can be filed
// without re-typing the technician/type/status each time.
const INITIAL_SHARED = {
  report_date: new Date().toISOString().split('T')[0],
  technician: '',
  type: 'service_visit',
  status: 'completed',
}

// Per-batch detail fields (optional). Reset after each save.
const INITIAL_DETAILS = {
  summary: '',
  findings: '',
  recommendations: '',
  parts_used: '',
  labor_hours: '',
  cost: '',
  notes: '',
}

// "report.pdf" -> "report"
function stripExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, '')
}

export default function AddServiceReportModal({
  serviceContractId,
  maintenancePlanId,
  assetId,
  assetName,
  linkedAssets,
  onClose,
  onSaved,
}: AddServiceReportModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [keepOpen, setKeepOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // When multiple assets are linked, let the user pick which one this report is for
  const hasMultipleAssets = linkedAssets && linkedAssets.length > 1
  const [selectedAssetId, setSelectedAssetId] = useState<string>(
    assetId ?? linkedAssets?.[0]?.asset_id ?? ''
  )

  const [shared, setShared] = useState({ ...INITIAL_SHARED })
  const [details, setDetails] = useState({ ...INITIAL_DETAILS })

  const setSharedField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setShared((prev) => ({ ...prev, [field]: e.target.value }))
  }
  const setDetailField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setDetails((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const multiple = files.length > 1

  function validateFile(f: File): string | null {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return `"${f.name}" is an unsupported type. Use PDF, DOC, DOCX, PNG, or JPG.`
    }
    if (f.size > MAX_FILE_SIZE) {
      return `"${f.name}" is too large. Maximum size is 10MB.`
    }
    return null
  }

  function addFiles(incoming: FileList | File[]) {
    const list = Array.from(incoming)
    if (list.length === 0) return
    for (const f of list) {
      const err = validateFile(f)
      if (err) { setError(err); return }
    }
    setError('')
    // De-dupe by name + size so dropping the same file twice is harmless.
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`))
      const next = [...prev]
      for (const f of list) {
        const key = `${f.name}:${f.size}`
        if (!seen.has(key)) { seen.add(key); next.push(f) }
      }
      return next
    })
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation(); setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation(); setDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation(); setDragOver(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  async function uploadFile(reportId: string, file: File): Promise<{ path: string; name: string; url: string }> {
    const ext = file.name.split('.').pop()
    const path = `${reportId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('service-reports').upload(path, file)
    if (error) throw new Error(`Upload failed for "${file.name}": ${error.message}`)
    const { data: urlData } = supabase.storage.from('service-reports').getPublicUrl(path)
    return { path, name: file.name, url: urlData.publicUrl }
  }

  // Create a single report row, optionally attaching a file. When a file is
  // provided and no summary was typed, the file name becomes the summary so the
  // report is still recognizable in lists.
  async function createReport(file: File | null): Promise<string | null> {
    const resolvedAssetId = selectedAssetId || assetId || null
    const summary = details.summary.trim() || (file ? stripExtension(file.name) : '')

    const payload: Record<string, unknown> = {
      service_contract_id: serviceContractId ?? null,
      maintenance_plan_id: maintenancePlanId ?? null,
      asset_id: resolvedAssetId,
      report_date: shared.report_date,
      technician: shared.technician.trim() || null,
      type: shared.type,
      summary: summary || null,
      findings: details.findings || null,
      recommendations: details.recommendations || null,
      parts_used: details.parts_used || null,
      labor_hours: details.labor_hours ? parseFloat(details.labor_hours) : null,
      cost: details.cost ? parseFloat(details.cost) : null,
      status: shared.status,
      notes: details.notes || null,
    }

    const { data, error: insertError } = await supabase
      .from('service_reports')
      .insert(payload)
      .select('id')
      .single()
    if (insertError || !data) {
      return insertError?.message ?? 'Failed to create report'
    }

    if (file) {
      const uploaded = await uploadFile(data.id, file)
      await supabase.from('service_reports').update({
        file_path: uploaded.path,
        file_name: uploaded.name,
        file_url: uploaded.url,
      }).eq('id', data.id)
    }
    return null
  }

  function resetForNext() {
    setFiles([])
    setDetails({ ...INITIAL_DETAILS })
    setShowDetails(false)
    // Shared fields (date/technician/type/status) intentionally preserved.
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Nothing to save: no files dropped and no summary written.
    if (files.length === 0 && !details.summary.trim()) {
      setError('Drop a report document to add it — or open "Add details" to record one manually.')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (files.length === 0) {
        // Manual entry with no attachment.
        const err = await createReport(null)
        if (err) { setError(err); setLoading(false); return }
      } else {
        // One report per dropped file.
        for (const file of files) {
          const err = await createReport(file)
          if (err) { setError(err); setLoading(false); return }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong while saving.')
      setLoading(false)
      return
    }

    onSaved?.()

    if (keepOpen) {
      resetForNext()
      setLoading(false)
    } else {
      router.refresh()
      onClose()
    }
  }

  const assetOptions = linkedAssets
    ? [
        { value: '', label: 'Contract-level (no specific unit)' },
        ...linkedAssets.map((a) => ({
          value: a.asset_id,
          label: a.name + (a.asset_tag ? ` (${a.asset_tag})` : ''),
        })),
      ]
    : []

  const saveLabel =
    files.length > 1 ? `Add ${files.length} Reports` : files.length === 1 ? 'Add Report' : 'Save Report'

  return (
    <Modal open={true} onClose={onClose} title="Add Service Report" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Asset context banner */}
        {assetName && !hasMultipleAssets && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm text-blue-700"><strong>Asset:</strong> {assetName}</p>
          </div>
        )}

        {/* Asset picker — shown when the contract covers multiple units */}
        {hasMultipleAssets && (
          <Select
            label="Unit"
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
            options={assetOptions}
          />
        )}

        {/* Primary action: drop the report document(s). Each file becomes a report. */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 cursor-pointer transition-colors ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          <Upload className={`h-9 w-9 ${dragOver ? 'text-blue-400' : 'text-gray-400'}`} />
          <div className="text-center">
            <p className="text-sm text-gray-700">
              <span className="font-medium text-blue-600">Drop service reports here</span> or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Add several at once — each file becomes its own report. PDF, DOC, DOCX, PNG, or JPG up to 10MB.
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ''
          }}
          className="hidden"
        />

        {/* Staged files */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={`${f.name}:${f.size}:${i}`} className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
                <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                <span className="text-sm text-blue-700 truncate flex-1">{f.name}</span>
                <span className="text-xs text-blue-500 shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-blue-400 hover:text-red-500 shrink-0"
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Optional details — collapsed by default so filing is a quick drop. */}
        <div className="rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-sm font-medium text-gray-700">
              Add details <span className="font-normal text-gray-400">(optional)</span>
            </span>
            {showDetails ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </button>

          {showDetails && (
            <div className="border-t border-gray-100 px-4 py-4 space-y-4">
              {multiple && (
                <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  These details apply to all {files.length} reports. Each report&apos;s summary defaults to its file name unless you set one below.
                </p>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Technician" value={shared.technician} onChange={setSharedField('technician')} placeholder="Technician name" />
                <Input label="Report Date" type="date" value={shared.report_date} onChange={setSharedField('report_date')} />
                <Select label="Type" value={shared.type} onChange={setSharedField('type')} options={TYPE_OPTIONS} />
                <Select label="Status" value={shared.status} onChange={setSharedField('status')} options={STATUS_OPTIONS} />
                <Input label="Labor Hours" type="number" value={details.labor_hours} onChange={setDetailField('labor_hours')} placeholder="0.0" step="0.5" min="0" />
                <Input label="Cost ($)" type="number" value={details.cost} onChange={setDetailField('cost')} placeholder="0.00" step="0.01" min="0" />
                <div className="sm:col-span-2">
                  <Textarea label="Summary" value={details.summary} onChange={setDetailField('summary')} placeholder={multiple ? 'Leave blank to use each file name' : 'Brief summary of the service performed'} />
                </div>
                <div className="sm:col-span-2">
                  <Textarea label="Findings" value={details.findings} onChange={setDetailField('findings')} placeholder="What was found during the service?" />
                </div>
                <div className="sm:col-span-2">
                  <Textarea label="Recommendations" value={details.recommendations} onChange={setDetailField('recommendations')} placeholder="Any follow-up recommendations?" />
                </div>
                <Input label="Parts Used" value={details.parts_used} onChange={setDetailField('parts_used')} placeholder="e.g. Filter, belt, oil..." />
                <div className="sm:col-span-2">
                  <Textarea label="Notes" value={details.notes} onChange={setDetailField('notes')} rows={2} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <Button type="submit" loading={loading}>
            {saveLabel}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <label className="ml-auto flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={keepOpen}
              onChange={(e) => setKeepOpen(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Keep adding
          </label>
        </div>
      </form>
    </Modal>
  )
}
