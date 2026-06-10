'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface Vendor {
  id: string
  name: string
  category: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  rating: number | null
  notes: string | null
  is_preferred: boolean
}

interface VendorFormProps {
  vendor?: Vendor
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'Select category' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'parts_supplier', label: 'Parts Supplier' },
  { value: 'service', label: 'Service' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'software', label: 'Software' },
  { value: 'other', label: 'Other' },
]

const RATING_OPTIONS = [
  { value: '', label: 'No rating' },
  { value: '1', label: '★ (1)' },
  { value: '2', label: '★★ (2)' },
  { value: '3', label: '★★★ (3)' },
  { value: '4', label: '★★★★ (4)' },
  { value: '5', label: '★★★★★ (5)' },
]

export default function VendorForm({ vendor }: VendorFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: vendor?.name ?? '',
    category: vendor?.category ?? '',
    contact_name: vendor?.contact_name ?? '',
    email: vendor?.email ?? '',
    phone: vendor?.phone ?? '',
    website: vendor?.website ?? '',
    address: vendor?.address ?? '',
    rating: vendor?.rating?.toString() ?? '',
    notes: vendor?.notes ?? '',
    is_preferred: vendor?.is_preferred ?? false,
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Vendor name is required.')
      return
    }
    setLoading(true)
    setError('')

    const payload = {
      name: form.name,
      category: form.category || null,
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      address: form.address || null,
      rating: form.rating ? parseInt(form.rating) : null,
      notes: form.notes || null,
      is_preferred: form.is_preferred,
    }

    let result
    if (vendor) {
      result = await supabase.from('vendors').update(payload).eq('id', vendor.id)
    } else {
      result = await supabase.from('vendors').insert(payload)
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    router.push('/vendors')
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
            <Input label="Vendor Name *" value={form.name} onChange={set('name')} placeholder="Company name" />
          </div>
          <Select label="Category" value={form.category} onChange={set('category')} options={CATEGORY_OPTIONS} />
          <Select label="Rating" value={form.rating} onChange={set('rating')} options={RATING_OPTIONS} />
          <Input label="Contact Name" value={form.contact_name} onChange={set('contact_name')} placeholder="Primary contact" />
          <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="email@company.com" />
          <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="+1 (555) 000-0000" />
          <Input label="Website" value={form.website} onChange={set('website')} placeholder="https://..." />
          <div className="sm:col-span-2">
            <Input label="Address" value={form.address} onChange={set('address')} placeholder="Full address" />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Additional notes..." />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_preferred}
                onChange={(e) => setForm((prev) => ({ ...prev, is_preferred: e.target.checked }))}
                className="h-4 w-4 rounded text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">Mark as Preferred Vendor</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>
            {vendor ? 'Update Vendor' : 'Add Vendor'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
