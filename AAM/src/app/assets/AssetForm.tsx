'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Asset } from '@/types/database'

const CATEGORY_OPTIONS = [
  { value: '', label: 'Select category...' },
  { value: 'Analytical', label: 'Analytical' },
  { value: 'Lab Equipment', label: 'Lab Equipment' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'IT/Network', label: 'IT/Network' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Mechanical', label: 'Mechanical' },
  { value: 'Other', label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'repair', label: 'In Repair' },
  { value: 'decommissioned', label: 'Decommissioned' },
]

interface AssetFormProps {
  asset?: Asset
}

export default function AssetForm({ asset }: AssetFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: asset?.name ?? '',
    asset_tag: asset?.asset_tag ?? '',
    category: asset?.category ?? '',
    manufacturer: asset?.manufacturer ?? '',
    model: asset?.model ?? '',
    serial_number: asset?.serial_number ?? '',
    location: asset?.location ?? '',
    status: asset?.status ?? 'active',
    purchase_date: asset?.purchase_date ?? '',
    purchase_cost: asset?.purchase_cost?.toString() ?? '',
    date_installed: asset?.date_installed ?? '',
    notes: asset?.notes ?? '',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.category) {
      setError('Name and category are required.')
      return
    }
    setLoading(true)
    setError('')

    const payload = {
      name: form.name,
      asset_tag: form.asset_tag || null,
      category: form.category,
      manufacturer: form.manufacturer || null,
      model: form.model || null,
      serial_number: form.serial_number || null,
      location: form.location || null,
      status: form.status as Asset['status'],
      purchase_date: form.purchase_date || null,
      purchase_cost: form.purchase_cost ? parseFloat(form.purchase_cost) : null,
      date_installed: form.date_installed || null,
      notes: form.notes || null,
    }

    let result
    if (asset) {
      result = await supabase.from('assets').update(payload).eq('id', asset.id)
    } else {
      result = await supabase.from('assets').insert(payload)
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    router.push('/assets')
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
            <Input label="Asset Name *" value={form.name} onChange={set('name')} placeholder="e.g. HPLC System #1" />
          </div>
          <Input label="Asset Tag / ID" value={form.asset_tag} onChange={set('asset_tag')} placeholder="e.g. ASSET-001" />
          <Select label="Category *" value={form.category} onChange={set('category')} options={CATEGORY_OPTIONS} />
          <Input label="Manufacturer" value={form.manufacturer} onChange={set('manufacturer')} placeholder="e.g. Agilent" />
          <Input label="Model" value={form.model} onChange={set('model')} placeholder="e.g. 1260 Infinity II" />
          <Input label="Serial Number" value={form.serial_number} onChange={set('serial_number')} placeholder="e.g. DE12345678" />
          <Input label="Location" value={form.location} onChange={set('location')} placeholder="e.g. Lab Room 204" />
          <Select label="Status" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
          <Input label="Purchase Date" type="date" value={form.purchase_date} onChange={set('purchase_date')} />
          <Input label="Purchase Cost ($)" type="number" value={form.purchase_cost} onChange={set('purchase_cost')} placeholder="0.00" step="0.01" min="0" />
          <Input label="Date Installed" type="date" value={form.date_installed} onChange={set('date_installed')} />
          <div className="sm:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Additional notes..." />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>
            {asset ? 'Update Asset' : 'Create Asset'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
