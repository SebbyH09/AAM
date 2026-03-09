'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ServiceContract } from '@/types/database'
import { Upload, X } from 'lucide-react'

interface Asset {
  id: string
  name: string
  asset_tag: string | null
}

interface ContractFormProps {
  assets: Asset[]
  contract?: ServiceContract
  defaultAssetId?: string
}

const CONTRACT_TYPE_OPTIONS = [
  { value: 'full_service', label: 'Full Service' },
  { value: 'preventive_only', label: 'Preventive Only' },
  { value: 'time_and_material', label: 'Time & Material' },
  { value: 'warranty', label: 'Warranty' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'expired', label: 'Expired' },
]

export default function ContractForm({ assets, contract, defaultAssetId }: ContractFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(false)

  const assetOptions = [
    { value: '', label: 'No asset linked' },
    ...assets.map((a) => ({ value: a.id, label: `${a.name}${a.asset_tag ? ` (${a.asset_tag})` : ''}` })),
  ]

  const [form, setForm] = useState({
    asset_id: contract?.asset_id ?? defaultAssetId ?? '',
    contract_number: contract?.contract_number ?? '',
    vendor_name: contract?.vendor_name ?? '',
    vendor_contact: contract?.vendor_contact ?? '',
    vendor_email: contract?.vendor_email ?? '',
    vendor_phone: contract?.vendor_phone ?? '',
    contract_type: contract?.contract_type ?? 'full_service',
    start_date: contract?.start_date ?? '',
    end_date: contract?.end_date ?? '',
    cost: contract?.cost?.toString() ?? '',
    coverage_details: contract?.coverage_details ?? '',
    status: contract?.status ?? 'active',
    notes: contract?.notes ?? '',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function uploadFile(contractId: string): Promise<{ path: string; name: string; url: string } | null> {
    if (!file) return null
    const ext = file.name.split('.').pop()
    const path = `${contractId}/${Date.now()}.${ext}`

    const { error } = await supabase.storage.from('contracts').upload(path, file)
    if (error) throw new Error(`Upload failed: ${error.message}`)

    const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(path)
    return { path, name: file.name, url: urlData.publicUrl }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vendor_name || !form.start_date || !form.end_date) {
      setError('Vendor name, start date, and end date are required.')
      return
    }
    setLoading(true)
    setError('')

    const payload: any = {
      asset_id: form.asset_id || null,
      contract_number: form.contract_number || null,
      vendor_name: form.vendor_name,
      vendor_contact: form.vendor_contact || null,
      vendor_email: form.vendor_email || null,
      vendor_phone: form.vendor_phone || null,
      contract_type: form.contract_type,
      start_date: form.start_date,
      end_date: form.end_date,
      cost: form.cost ? parseFloat(form.cost) : null,
      coverage_details: form.coverage_details || null,
      status: form.status,
      notes: form.notes || null,
    }

    let contractId = contract?.id

    if (contract) {
      const { error } = await supabase.from('service_contracts').update(payload).eq('id', contract.id)
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { data, error } = await supabase.from('service_contracts').insert(payload).select('id').single()
      if (error || !data) { setError(error?.message ?? 'Failed to create contract'); setLoading(false); return }
      contractId = data.id
    }

    if (file && contractId) {
      setUploadProgress(true)
      try {
        const uploaded = await uploadFile(contractId)
        if (uploaded) {
          await supabase.from('service_contracts').update({
            file_path: uploaded.path,
            file_name: uploaded.name,
            file_url: uploaded.url,
          }).eq('id', contractId)
        }
      } catch (err: any) {
        setError(err.message)
        setLoading(false)
        return
      }
    }

    router.push('/contracts')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Select label="Linked Asset" value={form.asset_id} onChange={set('asset_id')} options={assetOptions} />
          </div>
          <Input label="Vendor Name *" value={form.vendor_name} onChange={set('vendor_name')} placeholder="e.g. Agilent Technologies" />
          <Input label="Contract Number" value={form.contract_number} onChange={set('contract_number')} placeholder="e.g. SVC-2024-001" />
          <Input label="Vendor Contact" value={form.vendor_contact} onChange={set('vendor_contact')} placeholder="Contact name" />
          <Input label="Vendor Email" type="email" value={form.vendor_email} onChange={set('vendor_email')} placeholder="service@vendor.com" />
          <Input label="Vendor Phone" type="tel" value={form.vendor_phone} onChange={set('vendor_phone')} placeholder="+1 (555) 000-0000" />
          <Select label="Contract Type" value={form.contract_type} onChange={set('contract_type')} options={CONTRACT_TYPE_OPTIONS} />
          <Input label="Start Date *" type="date" value={form.start_date} onChange={set('start_date')} />
          <Input label="End Date *" type="date" value={form.end_date} onChange={set('end_date')} />
          <Input label="Annual Cost ($)" type="number" value={form.cost} onChange={set('cost')} placeholder="0.00" step="0.01" min="0" />
          <Select label="Status" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
          <div className="sm:col-span-2">
            <Textarea label="Coverage Details" value={form.coverage_details} onChange={set('coverage_details')} placeholder="What does this contract cover?" rows={3} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Additional notes..." />
          </div>

          {/* File Upload */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Document (PDF)</label>
            {contract?.file_name && !file && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 p-2">
                <span className="text-sm text-blue-700">📎 {contract.file_name}</span>
              </div>
            )}
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="absolute inset-0 cursor-pointer opacity-0 w-full h-full"
              />
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <Upload className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {file ? file.name : 'Click to upload contract document'}
                </span>
                {file && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                    className="ml-auto text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">PDF, DOC, or image files up to 10MB</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading || uploadProgress}>
            {contract ? 'Update Contract' : 'Add Contract'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
