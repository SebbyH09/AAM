'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Upload, X, FileText } from 'lucide-react'

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

const INITIAL_FORM = {
  report_date: new Date().toISOString().split('T')[0],
  technician: '',
  type: 'service_visit',
  summary: '',
  findings: '',
  recommendations: '',
  parts_used: '',
  labor_hours: '',
  cost: '',
  status: 'completed',
  notes: '',
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
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [addAnother, setAddAnother] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // When multiple assets are linked, let the user pick which one this report is for
  const hasMultipleAssets = linkedAssets && linkedAssets.length > 1
  const [selectedAssetId, setSelectedAssetId] = useState<string>(
    assetId ?? linkedAssets?.[0]?.asset_id ?? ''
  )

  const [form, setForm] = useState({ ...INITIAL_FORM })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function validateFile(f: File): string | null {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return 'Invalid file type. Please upload a PDF, DOC, DOCX, PNG, or JPG file.'
    }
    if (f.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 10MB.'
    }
    return null
  }

  function handleFileSelect(f: File) {
    const err = validateFile(f)
    if (err) { setError(err); return }
    setError('')
    setFile(f)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFileSelect(droppedFile)
  }, [])

  async function uploadFile(reportId: string): Promise<{ path: string; name: string; url: string } | null> {
    if (!file) return null
    const ext = file.name.split('.').pop()
    const path = `${reportId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('service-reports').upload(path, file)
    if (error) throw new Error(`Upload failed: ${error.message}`)
    const { data: urlData } = supabase.storage.from('service-reports').getPublicUrl(path)
    return { path, name: file.name, url: urlData.publicUrl }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.technician || !form.summary) {
      setError('Technician and summary are required.')
      return
    }
    setLoading(true)
    setError('')

    const resolvedAssetId = selectedAssetId || assetId || null

    const payload: Record<string, unknown> = {
      service_contract_id: serviceContractId ?? null,
      maintenance_plan_id: maintenancePlanId ?? null,
      asset_id: resolvedAssetId,
      report_date: form.report_date,
      technician: form.technician,
      type: form.type,
      summary: form.summary,
      findings: form.findings || null,
      recommendations: form.recommendations || null,
      parts_used: form.parts_used || null,
      labor_hours: form.labor_hours ? parseFloat(form.labor_hours) : null,
      cost: form.cost ? parseFloat(form.cost) : null,
      status: form.status,
      notes: form.notes || null,
    }

    const { data, error: insertError } = await supabase.from('service_reports').insert(payload).select('id').single()
    if (insertError || !data) {
      setError(insertError?.message ?? 'Failed to create report')
      setLoading(false)
      return
    }

    if (file) {
      try {
        const uploaded = await uploadFile(data.id)
        if (uploaded) {
          await supabase.from('service_reports').update({
            file_path: uploaded.path,
            file_name: uploaded.name,
            file_url: uploaded.url,
          }).eq('id', data.id)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'File upload failed')
        setLoading(false)
        return
      }
    }

    onSaved?.()

    if (addAnother) {
      // Reset form but keep modal open
      setForm({ ...INITIAL_FORM })
      setFile(null)
      setAddAnother(false)
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Asset picker — shown when the contract covers multiple units */}
          {hasMultipleAssets && (
            <div className="sm:col-span-2">
              <Select
                label="Unit"
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                options={assetOptions}
              />
            </div>
          )}

          <Input label="Technician *" value={form.technician} onChange={set('technician')} placeholder="Technician name" />
          <Input label="Report Date *" type="date" value={form.report_date} onChange={set('report_date')} />
          <Select label="Type" value={form.type} onChange={set('type')} options={TYPE_OPTIONS} />
          <Select label="Status" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
          <Input label="Labor Hours" type="number" value={form.labor_hours} onChange={set('labor_hours')} placeholder="0.0" step="0.5" min="0" />
          <Input label="Cost ($)" type="number" value={form.cost} onChange={set('cost')} placeholder="0.00" step="0.01" min="0" />
          <div className="sm:col-span-2">
            <Textarea label="Summary *" value={form.summary} onChange={set('summary')} placeholder="Brief summary of the service performed" />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Findings" value={form.findings} onChange={set('findings')} placeholder="What was found during the service?" />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Recommendations" value={form.recommendations} onChange={set('recommendations')} placeholder="Any follow-up recommendations?" />
          </div>
          <Input label="Parts Used" value={form.parts_used} onChange={set('parts_used')} placeholder="e.g. Filter, belt, oil..." />
          <div className="sm:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={set('notes')} rows={2} />
          </div>

          {/* File Upload / Drop Zone */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Report Document</label>
            {file ? (
              <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                <span className="text-sm text-blue-700 truncate flex-1">{file.name}</span>
                <span className="text-xs text-blue-500 shrink-0">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-blue-400 hover:text-red-500 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <Upload className={`h-8 w-8 ${dragOver ? 'text-blue-400' : 'text-gray-400'}`} />
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="mt-1 text-xs text-gray-500">PDF, DOC, DOCX, PNG, or JPG up to 10MB</p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFileSelect(f)
                e.target.value = ''
              }}
              className="hidden"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2 flex-wrap">
          <Button type="submit" loading={loading} onClick={() => setAddAnother(false)}>
            Save Report
          </Button>
          <Button
            type="submit"
            variant="secondary"
            loading={loading}
            onClick={() => setAddAnother(true)}
          >
            Save & Add Another
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  )
}
