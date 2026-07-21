'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { X, RefreshCw } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface LinkedAsset {
  asset_id: string
  assets: { id: string; name: string; asset_tag: string | null } | null
}

interface Contract {
  id: string
  vendor_name: string
  vendor_contact: string | null
  vendor_email: string | null
  vendor_phone: string | null
  contract_type: string
  start_date: string
  end_date: string
  cost: number | null
  coverage_details: string | null
  contract_number: string | null
  pm_interval_months: number
  notes: string | null
  asset_id: string | null
  service_contract_assets?: LinkedAsset[]
}

interface RenewContractModalProps {
  contract: Contract
  onClose: () => void
  onRenewed: () => void
}

const CONTRACT_TYPE_OPTIONS = [
  { value: 'full_service', label: 'Full Service' },
  { value: 'preventive_only', label: 'Preventive Only' },
  { value: 'time_and_material', label: 'Time & Material' },
  { value: 'warranty', label: 'Warranty' },
]

export default function RenewContractModal({ contract, onClose, onRenewed }: RenewContractModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const linkedAssetNames = contract.service_contract_assets
    ?.filter((la) => la.assets)
    .map((la) => la.assets!.name)
    .join(', ') ?? ''

  const [form, setForm] = useState({
    contract_number: contract.contract_number ?? '',
    vendor_name: contract.vendor_name,
    vendor_contact: contract.vendor_contact ?? '',
    vendor_email: contract.vendor_email ?? '',
    vendor_phone: contract.vendor_phone ?? '',
    contract_type: contract.contract_type,
    // Default new start to old end date + 1 day
    start_date: (() => {
      const d = new Date(contract.end_date)
      d.setDate(d.getDate() + 1)
      return d.toISOString().split('T')[0]
    })(),
    end_date: (() => {
      // Default new end to 1 year after old end
      const d = new Date(contract.end_date)
      d.setFullYear(d.getFullYear() + 1)
      return d.toISOString().split('T')[0]
    })(),
    cost: contract.cost?.toString() ?? '',
    coverage_details: contract.coverage_details ?? '',
    pm_interval_months: contract.pm_interval_months.toString(),
    notes: contract.notes ?? '',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vendor_name || !form.start_date || !form.end_date) {
      setError('Vendor name, start date, and end date are required.')
      return
    }
    if (form.start_date <= contract.end_date) {
      setError('New contract start date must be after the current contract end date.')
      return
    }

    setLoading(true)
    setError('')

    const today = new Date().toISOString().split('T')[0]
    const newStatus = form.start_date <= today ? 'active' : 'pending'

    // Overwrite the existing contract in place with the new period and terms.
    // The contract id is preserved, so the PM history (pm_last_performed_date and the
    // per-asset dates in service_contract_assets) and all linked service_reports carry
    // over to the renewed contract untouched.
    const { error: updateError } = await supabase
      .from('service_contracts')
      .update({
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
        status: newStatus,
        pm_interval_months: parseInt(form.pm_interval_months) || 12,
        notes: form.notes || null,
      })
      .eq('id', contract.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.refresh()
    onRenewed()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              Renew Contract
            </h2>
            <p className="text-sm text-gray-500">
              Current contract expires {formatDate(contract.end_date)}
              {linkedAssetNames && ` · ${linkedAssetNames}`}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
          <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
            This updates the existing contract in place with the new period and terms, keeping its
            <strong> PM history</strong> and all <strong>service reports</strong>.
            If the new start date is in the future, the contract will be set to <strong>pending</strong> until it begins.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Vendor Name *" value={form.vendor_name} onChange={set('vendor_name')} placeholder="e.g. Agilent Technologies" />
              <Input label="Contract Number" value={form.contract_number} onChange={set('contract_number')} placeholder="e.g. SVC-2025-001" />
              <Input label="Vendor Contact" value={form.vendor_contact} onChange={set('vendor_contact')} placeholder="Contact name" />
              <Input label="Vendor Email" type="email" value={form.vendor_email} onChange={set('vendor_email')} placeholder="service@vendor.com" />
              <Input label="Vendor Phone" type="tel" value={form.vendor_phone} onChange={set('vendor_phone')} placeholder="+1 (555) 000-0000" />
              <Select label="Contract Type" value={form.contract_type} onChange={set('contract_type')} options={CONTRACT_TYPE_OPTIONS} />

              <div className="sm:col-span-2">
                <p className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1 mb-3">New Contract Period</p>
              </div>

              <Input label="New Start Date *" type="date" value={form.start_date} onChange={set('start_date')} />
              <Input label="New End Date *" type="date" value={form.end_date} onChange={set('end_date')} />
              <Input label="Annual Cost ($)" type="number" value={form.cost} onChange={set('cost')} placeholder="0.00" step="0.01" min="0" />
              <Input label="PM Interval (months)" type="number" value={form.pm_interval_months} onChange={set('pm_interval_months')} placeholder="12" min="1" max="60" />

              <div className="sm:col-span-2">
                <Textarea label="Coverage Details" value={form.coverage_details} onChange={set('coverage_details')} placeholder="What does this contract cover?" rows={3} />
              </div>
              <div className="sm:col-span-2">
                <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Additional notes..." />
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <Button type="submit" loading={loading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Create Renewal
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
