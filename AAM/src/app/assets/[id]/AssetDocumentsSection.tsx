'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { FileText, Plus, Trash2, Download, X } from 'lucide-react'

interface AssetDocument {
  id: string
  asset_id: string
  name: string
  document_type: string | null
  file_path: string | null
  file_name: string | null
  file_url: string | null
  version: string | null
  notes: string | null
  uploaded_by: string | null
  created_at: string
}

interface AssetDocumentsSectionProps {
  assetId: string
}

const DOC_TYPE_OPTIONS = [
  { value: '', label: 'Select type' },
  { value: 'manual', label: 'Manual' },
  { value: 'sop', label: 'SOP' },
  { value: 'drawing', label: 'Drawing' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'safety', label: 'Safety' },
  { value: 'other', label: 'Other' },
]

function docTypeColor(type: string | null): string {
  const map: Record<string, string> = {
    manual: 'bg-blue-100 text-blue-800',
    sop: 'bg-green-100 text-green-800',
    drawing: 'bg-purple-100 text-purple-800',
    certificate: 'bg-yellow-100 text-yellow-800',
    safety: 'bg-red-100 text-red-800',
    other: 'bg-gray-100 text-gray-800',
  }
  return map[type ?? ''] ?? 'bg-gray-100 text-gray-800'
}

export default function AssetDocumentsSection({ assetId }: AssetDocumentsSectionProps) {
  const supabase = createClient()
  const [documents, setDocuments] = useState<AssetDocument[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    document_type: '',
    version: '',
    uploaded_by: '',
    notes: '',
  })
  const [file, setFile] = useState<File | null>(null)

  async function loadDocuments() {
    const { data } = await supabase
      .from('asset_documents')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false })
    setDocuments(data ?? [])
  }

  useEffect(() => {
    loadDocuments()
  }, [assetId])

  const set = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Document name is required.')
      return
    }
    setLoading(true)
    setError('')

    let filePath: string | null = null
    let fileName: string | null = null
    let fileUrl: string | null = null

    if (file) {
      setUploading(true)
      const ext = file.name.split('.').pop()
      const storagePath = `${assetId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('asset-documents')
        .upload(storagePath, file)

      if (uploadError) {
        setError(`File upload failed: ${uploadError.message}`)
        setLoading(false)
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('asset-documents').getPublicUrl(storagePath)
      filePath = storagePath
      fileName = file.name
      fileUrl = urlData?.publicUrl ?? null
      setUploading(false)
    }

    const { error: insertError } = await supabase.from('asset_documents').insert({
      asset_id: assetId,
      name: form.name,
      document_type: form.document_type || null,
      file_path: filePath,
      file_name: fileName,
      file_url: fileUrl,
      version: form.version || null,
      notes: form.notes || null,
      uploaded_by: form.uploaded_by || null,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setForm({ name: '', document_type: '', version: '', uploaded_by: '', notes: '' })
    setFile(null)
    setShowForm(false)
    setLoading(false)
    await loadDocuments()
  }

  async function handleDelete(doc: AssetDocument) {
    if (!confirm(`Delete document "${doc.name}"?`)) return

    if (doc.file_path) {
      await supabase.storage.from('asset-documents').remove([doc.file_path])
    }
    await supabase.from('asset_documents').delete().eq('id', doc.id)
    await loadDocuments()
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-600" />
          <h2 className="font-semibold text-gray-900">Documents</h2>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError('') }}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Add'}
        </button>
      </div>

      {showForm && (
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Document Name *" value={form.name} onChange={set('name')} placeholder="e.g. User Manual v2" />
              <Select label="Document Type" value={form.document_type} onChange={set('document_type')} options={DOC_TYPE_OPTIONS} />
              <Input label="Version" value={form.version} onChange={set('version')} placeholder="e.g. 1.0, Rev B" />
              <Input label="Uploaded By" value={form.uploaded_by} onChange={set('uploaded_by')} placeholder="Name" />
              <div className="sm:col-span-2">
                <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Additional notes..." rows={2} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">File (optional)</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="submit" loading={loading || uploading} size="sm">
                {uploading ? 'Uploading...' : 'Save Document'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {documents.length === 0 ? (
          <p className="px-6 py-4 text-sm text-gray-400">No documents attached.</p>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="flex items-start justify-between px-6 py-3 gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                  {doc.document_type && (
                    <Badge className={docTypeColor(doc.document_type)}>{doc.document_type}</Badge>
                  )}
                  {doc.version && (
                    <span className="text-xs text-gray-500">v{doc.version}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {doc.uploaded_by ? `By ${doc.uploaded_by} • ` : ''}
                  {formatDate(doc.created_at)}
                </p>
                {doc.notes && <p className="text-xs text-gray-600 mt-0.5">{doc.notes}</p>}
                {doc.file_name && (
                  <p className="text-xs text-gray-400 mt-0.5">📎 {doc.file_name}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {doc.file_url && (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-600"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                )}
                <button
                  onClick={() => handleDelete(doc)}
                  className="text-gray-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
