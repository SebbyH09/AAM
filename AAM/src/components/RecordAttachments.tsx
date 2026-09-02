'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { Paperclip, Upload, Download, Trash2, FileText } from 'lucide-react'

interface Attachment {
  id: string
  report_date: string
  technician: string | null
  summary: string | null
  notes: string | null
  file_path: string | null
  file_name: string | null
  file_url: string | null
  created_at: string
}

interface RecordAttachmentsProps {
  /** Attach against a repair record. */
  repairId?: string
  /** Attach against a work order. */
  workOrderId?: string
  /** Attach against an individual maintenance history record. */
  maintenanceRecordId?: string
  /** Optional asset the record belongs to, so the file also surfaces at asset level. */
  assetId?: string | null
  /** Section heading. Defaults to "Attachments". */
  title?: string
  /** Render as a plain block (no card border/shadow) — for use inside another panel. */
  bare?: boolean
}

// Generous cap — service reports can be scanned multi-page PDFs.
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

// "report.pdf" -> "report"
function stripExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, '')
}

export default function RecordAttachments({
  repairId,
  workOrderId,
  maintenanceRecordId,
  assetId,
  title = 'Attachments',
  bare = false,
}: RecordAttachmentsProps) {
  const supabase = createClient()
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Which foreign key on service_reports this section writes to.
  const linkColumn = repairId
    ? 'repair_id'
    : workOrderId
      ? 'work_order_id'
      : 'maintenance_record_id'
  const linkValue = repairId ?? workOrderId ?? maintenanceRecordId ?? null

  async function loadAttachments() {
    if (!linkValue) return
    const { data } = await supabase
      .from('service_reports')
      .select('id, report_date, technician, summary, notes, file_path, file_name, file_url, created_at')
      .eq(linkColumn, linkValue)
      .order('created_at', { ascending: false })
    setAttachments(data ?? [])
  }

  useEffect(() => {
    loadAttachments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkValue])

  async function uploadOne(file: File) {
    // Create the row first so the storage path can be namespaced by report id.
    const { data: created, error: insertError } = await supabase
      .from('service_reports')
      .insert({
        [linkColumn]: linkValue,
        asset_id: assetId ?? null,
        summary: stripExtension(file.name),
      })
      .select('id')
      .single()

    if (insertError || !created) {
      throw new Error(insertError?.message ?? 'Could not save the attachment record.')
    }

    const ext = file.name.split('.').pop()
    const path = `${created.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error: uploadError } = await supabase.storage.from('service-reports').upload(path, file)
    if (uploadError) {
      // Roll back the orphaned row so the list stays clean.
      await supabase.from('service_reports').delete().eq('id', created.id)
      throw new Error(`Upload failed for "${file.name}": ${uploadError.message}`)
    }

    const { data: urlData } = supabase.storage.from('service-reports').getPublicUrl(path)
    await supabase
      .from('service_reports')
      .update({ file_path: path, file_name: file.name, file_url: urlData.publicUrl })
      .eq('id', created.id)
  }

  async function addFiles(incoming: FileList | File[]) {
    const list = Array.from(incoming)
    if (list.length === 0) return

    for (const f of list) {
      if (f.size > MAX_FILE_SIZE) {
        setError(`"${f.name}" is too large. Maximum size is 25MB.`)
        return
      }
    }

    setUploading(true)
    setError('')
    try {
      for (const file of list) {
        await uploadOne(file)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong while uploading.')
    } finally {
      setUploading(false)
      await loadAttachments()
    }
  }

  // The service-reports bucket is private, so a stored public URL won't open.
  // Mint a short-lived signed URL on click, matching the service report modals.
  async function openFile(a: Attachment) {
    if (!a.file_path) return
    const { data, error: signError } = await supabase.storage
      .from('service-reports')
      .createSignedUrl(a.file_path, 60)
    if (signError || !data) {
      setError(`Could not open "${a.file_name ?? 'file'}": ${signError?.message ?? 'unknown error'}`)
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function handleDelete(a: Attachment) {
    if (!confirm(`Remove "${a.file_name ?? a.summary ?? 'this attachment'}"?`)) return
    if (a.file_path) {
      await supabase.storage.from('service-reports').remove([a.file_path])
    }
    await supabase.from('service_reports').delete().eq('id', a.id)
    await loadAttachments()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  return (
    <section className={bare ? '' : 'rounded-xl border border-gray-200 bg-white shadow-sm'}>
      <div
        className={
          bare
            ? 'flex items-center gap-2 mb-3'
            : 'flex items-center gap-2 border-b border-gray-200 px-6 py-4'
        }
      >
        <Paperclip className={bare ? 'h-4 w-4 text-indigo-600' : 'h-5 w-5 text-indigo-600'} />
        <h2 className={bare ? 'text-xs font-medium uppercase tracking-wider text-gray-500' : 'font-semibold text-gray-900'}>
          {title}
        </h2>
        {attachments.length > 0 && (
          <span className="text-sm text-gray-400">({attachments.length})</span>
        )}
      </div>

      <div className={bare ? 'space-y-4' : 'px-6 py-4 space-y-4'}>
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Drop zone — the primary way to just drop a file in. */}
        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false) }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-colors ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          <Upload className={`h-8 w-8 ${dragOver ? 'text-blue-400' : 'text-gray-400'}`} />
          <div className="text-center">
            <p className="text-sm text-gray-700">
              <span className="font-medium text-blue-600">
                {uploading ? 'Uploading…' : 'Drop service reports or files here'}
              </span>
              {!uploading && ' or click to browse'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Add several at once. PDF, images, or documents up to 25MB.
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ''
          }}
          className="hidden"
        />

        {/* Existing attachments */}
        {attachments.length > 0 && (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {attachments.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    {a.file_path ? (
                      <button
                        onClick={() => openFile(a)}
                        className="truncate text-left text-sm font-medium text-blue-600 hover:underline"
                        title="Open / view"
                      >
                        {a.file_name ?? a.summary ?? 'Attachment'}
                      </button>
                    ) : (
                      <p className="truncate text-sm font-medium text-gray-900">
                        {a.file_name ?? a.summary ?? 'Attachment'}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-500">
                      {a.technician ? `${a.technician} • ` : ''}
                      {formatDate(a.report_date ?? a.created_at)}
                    </p>
                    {a.notes && <p className="mt-0.5 text-xs text-gray-600">{a.notes}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {a.file_path && (
                    <button
                      onClick={() => openFile(a)}
                      className="text-gray-400 hover:text-blue-600"
                      title="Open / download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(a)}
                    className="text-gray-400 hover:text-red-600"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
