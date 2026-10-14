'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, CheckCircle2, ExternalLink, Package, Plus, Building2, ClipboardList } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency, statusColor, dueStatusBadge } from '@/lib/utils'
import type { Asset, ServiceContract } from '@/types/database'

interface EquipmentPlan {
  id: string
  name: string
  description: string | null
  frequency: string
  frequency_days: number | null
  next_due_date: string
  last_performed_date: string | null
  priority: string
  assigned_to: string | null
  is_active: boolean
  estimated_duration_hours: number | null
  estimated_cost: number | null
  parts: { name: string; quantity?: number; part_number?: string }[] | null
}

interface EquipmentDetailModalProps<P extends EquipmentPlan> {
  assetId: string
  assetName: string
  plans: P[]
  onClose: () => void
  onOpenPlan: (plan: P) => void
  onLogPlan: (plan: P) => void
}

type VendorContract = Pick<
  ServiceContract,
  'id' | 'vendor_name' | 'vendor_contact' | 'vendor_email' | 'vendor_phone' | 'contract_type' | 'contract_number' | 'start_date' | 'end_date' | 'status'
>

const CONTRACT_FIELDS = 'id, vendor_name, vendor_contact, vendor_email, vendor_phone, contract_type, contract_number, start_date, end_date, status'

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">{label}</h4>
      <p className="text-sm text-gray-700 break-words">{value || '—'}</p>
    </div>
  )
}

export default function EquipmentDetailModal<P extends EquipmentPlan>({
  assetId,
  assetName,
  plans,
  onClose,
  onOpenPlan,
  onLogPlan,
}: EquipmentDetailModalProps<P>) {
  const [asset, setAsset] = useState<Asset | null>(null)
  const [contracts, setContracts] = useState<VendorContract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      // Contracts can reference the asset directly or through the service_contract_assets link table.
      const [assetRes, directRes, linkedRes] = await Promise.all([
        supabase.from('assets').select('*').eq('id', assetId).single(),
        supabase.from('service_contracts').select(CONTRACT_FIELDS).eq('asset_id', assetId),
        supabase.from('service_contract_assets').select(`service_contracts(${CONTRACT_FIELDS})`).eq('asset_id', assetId),
      ])
      if (cancelled) return

      if (assetRes.error) setError(assetRes.error.message)
      setAsset(assetRes.data ?? null)

      const byId = new Map<string, VendorContract>()
      for (const c of (directRes.data ?? []) as VendorContract[]) byId.set(c.id, c)
      for (const row of (linkedRes.data ?? []) as { service_contracts: VendorContract | VendorContract[] | null }[]) {
        const linked = Array.isArray(row.service_contracts) ? row.service_contracts : row.service_contracts ? [row.service_contracts] : []
        for (const c of linked) byId.set(c.id, c)
      }
      // Active contracts first, then the most recent end date.
      setContracts(
        Array.from(byId.values()).sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1
          if (b.status === 'active' && a.status !== 'active') return 1
          return b.end_date.localeCompare(a.end_date)
        })
      )
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [assetId])

  const primaryVendor = contracts[0]?.vendor_name ?? null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-900">{asset?.name ?? assetName}</h2>
              {asset?.status && <Badge className={statusColor(asset.status)}>{asset.status}</Badge>}
            </div>
            {asset?.category && <p className="text-sm text-gray-500">{asset.category}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/assets/${assetId}`}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 hover:text-blue-800"
            >
              <ExternalLink className="h-4 w-4" />
              Asset page
            </Link>
            <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-5 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          {/* Equipment Details */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Equipment Details</h3>
            {loading && !asset ? (
              <p className="text-sm text-gray-400">Loading equipment details...</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field label="Vendor" value={primaryVendor} />
                <Field label="Manufacturer" value={asset?.manufacturer} />
                <Field label="Model" value={asset?.model} />
                <Field label="Serial Number" value={asset?.serial_number} />
                <Field label="Asset Tag" value={asset?.asset_tag} />
                <Field label="Location" value={asset?.location} />
                <Field label="Date Installed" value={asset?.date_installed ? formatDate(asset.date_installed) : null} />
                <Field label="Purchase Date" value={asset?.purchase_date ? formatDate(asset.purchase_date) : null} />
                <Field label="Purchase Cost" value={asset?.purchase_cost != null ? formatCurrency(asset.purchase_cost) : null} />
              </div>
            )}
            {asset?.notes && (
              <div className="mt-4">
                <Field label="Notes" value={asset.notes} />
              </div>
            )}
          </section>

          {/* Vendors / Service Contracts */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Building2 className="h-4 w-4 text-gray-500" />
              Vendors &amp; Service Contracts ({contracts.length})
            </h3>
            {loading ? (
              <p className="text-sm text-gray-400">Loading contracts...</p>
            ) : contracts.length === 0 ? (
              <p className="text-sm text-gray-500">No service contracts linked to this equipment.</p>
            ) : (
              <div className="rounded-lg border border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Vendor</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Contact</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Ends</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {contracts.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          <p className="font-medium">{c.vendor_name}</p>
                          {c.contract_number && <p className="text-xs text-gray-500">#{c.contract_number}</p>}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {c.vendor_contact && <p>{c.vendor_contact}</p>}
                          {c.vendor_phone && <p className="text-xs text-gray-500">{c.vendor_phone}</p>}
                          {c.vendor_email && (
                            <a href={`mailto:${c.vendor_email}`} className="text-xs text-blue-600 hover:text-blue-800">
                              {c.vendor_email}
                            </a>
                          )}
                          {!c.vendor_contact && !c.vendor_phone && !c.vendor_email && '—'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 capitalize">{c.contract_type.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{formatDate(c.end_date)}</td>
                        <td className="px-4 py-2">
                          <Badge className={statusColor(c.status)}>{c.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Maintenance Plans */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ClipboardList className="h-4 w-4 text-gray-500" />
                Maintenance Plans ({plans.length})
              </h3>
              <Link
                href={`/maintenance/new?asset_id=${assetId}`}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <Plus className="h-4 w-4" />
                Add plan
              </Link>
            </div>
            <div className="space-y-3">
              {plans.map((plan) => {
                const badge = dueStatusBadge(plan.next_due_date)
                return (
                  <div key={plan.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <button
                          onClick={() => onOpenPlan(plan)}
                          className="text-left text-sm font-semibold text-gray-900 hover:text-blue-700"
                        >
                          {plan.name}
                        </button>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <Badge className={statusColor(plan.priority)}>{plan.priority}</Badge>
                          <Badge className={badge.color}>{badge.label}</Badge>
                          <Badge className={plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                          onClick={() => onLogPlan(plan)}
                          className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Log
                        </button>
                        <button onClick={() => onOpenPlan(plan)} className="text-sm text-gray-600 hover:text-gray-900">
                          Details
                        </button>
                        <Link href={`/maintenance/${plan.id}/edit`} className="text-sm text-blue-600 hover:text-blue-800">
                          Edit
                        </Link>
                      </div>
                    </div>

                    {plan.description && <p className="mt-3 text-sm text-gray-600">{plan.description}</p>}

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <Field
                        label="Frequency"
                        value={
                          <span className="capitalize">
                            {plan.frequency.replace('_', ' ')}
                            {plan.frequency === 'custom' && plan.frequency_days && ` (every ${plan.frequency_days} days)`}
                          </span>
                        }
                      />
                      <Field label="Next Due" value={formatDate(plan.next_due_date)} />
                      <Field label="Last Performed" value={formatDate(plan.last_performed_date)} />
                      <Field label="Assigned To" value={plan.assigned_to} />
                      <Field label="Est. Duration" value={plan.estimated_duration_hours ? `${plan.estimated_duration_hours} hours` : null} />
                      <Field label="Est. Cost" value={formatCurrency(plan.estimated_cost)} />
                    </div>

                    {plan.parts && plan.parts.length > 0 && (
                      <div className="mt-3">
                        <h4 className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                          <Package className="h-3.5 w-3.5" />
                          Required Parts
                        </h4>
                        <ul className="space-y-0.5 text-sm text-gray-700">
                          {plan.parts.map((part, i) => (
                            <li key={i}>
                              {part.quantity ?? 1} × {part.name}
                              {part.part_number && <span className="text-gray-500"> ({part.part_number})</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
