'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ServiceContract } from '@/types/database'
import { Upload, X, Check } from 'lucide-react'

interface Asset {
  id: string
  name: string
  asset_tag: string | null
}

interface ContractFormProps {
  assets: Asset[]
  contract?: ServiceContract
  defaultAssetId?: string
  existingAssetIds?: string[]
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

export default function ContractForm({ assets, contract, defaultAssetId, existingAssetIds }: ContractFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(false)
  const [assetSearch, setAssetSearch] = useState('')

  // Initialize selected assets
  const getInitialAssetIds = (): string[] => {
    if (existingAssetIds && existingAssetIds.length > 0) return existingAssetIds
    if (contract?.asset_id) return [contract.asset_id]
    if (defaultAssetId) return [defaultAssetId]
    return []
  }

  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(getInitialAssetIds)

  const [form, setForm] = useState({
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
    pm_last_performed_date: contract?.pm_last_performed_date ?? '',
    pm_interval_months: contract?.pm_interval_months?.toString() ?? '12',
    notes: contract?.notes ?? '',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const toggleAsset = (assetId: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    )
  }

  const removeAsset = (assetId: string) => {
    setSelectedAssetIds((prev) => prev.filter((id) => id !== assetId))
  }

  const filteredAssets = assets.filter((a) => {
    if (!assetSearch) return true
    const q = assetSearch.toLowerCase()
    return a.name.toLowerCase().includes(q) || (a.asset_tag?.toLowerCase().includes(q) ?? false)
  })

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
      asset_id: selectedAssetIds.length > 0 ? selectedAssetIds[0] : null,
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
      pm_last_performed_date: form.pm_last_performed_date || null,
      pm_interval_months: form.pm_interval_months ? parseInt(form.pm_interval_months) : 12,
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

    // Update junction table: remove old entries, insert new ones
    if (contractId) {
      await supabase.from('service_contract_assets').delete().eq('service_contract_id', contractId)
      if (selectedAssetIds.length > 0) {
        const rows = selectedAssetIds.map((asset_id) => ({
          service_contract_id: contractId!,
          asset_id,
        }))
        const { error: junctionError } = await supabase.from('service_contract_assets').insert(rows)
        if (junctionError) { setError(junctionError.message); setLoading(false); return }
      }
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

  const selectedAssets = assets.filter((a) => selectedAssetIds.includes(a.id))

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Multi-asset selector */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Linked Equipment</label>
            {selectedAssets.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedAssets.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                  >
                    {a.name}{a.asset_tag ? ` (${a.asset_tag})` : ''}
                    <button type="button" onClick={() => removeAsset(a.id)} className="ml-0.5 hover:text-blue-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              placeholder="Search equipment to add..."
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200">
              {filteredAssets.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-400">No equipment found</p>
              ) : (
                filteredAssets.map((a) => {
                  const isSelected = selectedAssetIds.includes(a.id)
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAsset(a.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        isSelected ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className={`flex h-4 w-4 items-center justify-center rounded border ${
                        isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      {a.name}{a.asset_tag ? ` (${a.asset_tag})` : ''}
                    </button>
                  )
                })
              )}
            </div>
            {selectedAssetIds.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">No equipment linked to this contract</p>
            )}
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

          {/* Preventative Maintenance */}
          <div className="sm:col-span-2">
            <p className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1 mb-2">Preventative Maintenance</p>
          </div>
          <Input label="PM Last Performed" type="date" value={form.pm_last_performed_date} onChange={set('pm_last_performed_date')} />
          <Input label="PM Interval (months)" type="number" value={form.pm_interval_months} onChange={set('pm_interval_months')} placeholder="12" min="1" max="60" />
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
