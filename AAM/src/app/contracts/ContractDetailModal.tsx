'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate, formatCurrency, statusColor } from '@/lib/utils'
import { X, FileText, Wrench, Plus, ClipboardList, Trash2, XCircle, RefreshCw } from 'lucide-react'
import { addMonths, parseISO, differenceInDays, format } from 'date-fns'
import Link from 'next/link'
import AddServiceReportModal from './AddServiceReportModal'
import LogContractPmModal from './LogContractPmModal'
import ServiceReportDetailModal from './ServiceReportDetailModal'
import RenewContractModal from './RenewContractModal'

interface LinkedAsset {
  asset_id: string
  pm_last_performed_date: string | null
  assets: { id: string; name: string; asset_tag: string | null; serial_number: string | null; model: string | null } | null
}

interface Contract {
  id: string
  vendor_name: string
  contract_type: string
  start_date: string
  end_date: string
  cost: number | null
  status: string
  file_name: string | null
  file_url: string | null
  file_path: string | null
  contract_number: string | null
  pm_last_performed_date: string | null
  pm_interval_months: number
  vendor_contact: string | null
  vendor_email: string | null
  vendor_phone: string | null
  coverage_details: string | null
  notes: string | null
  asset_id: string | null
  assets: { name: string; asset_tag: string | null } | null
  service_contract_assets?: LinkedAsset[]
  renewed_from_contract_id?: string | null
  renewed_at?: string | null
}

const RECENT_RENEWAL_DAYS = 7

function isRecentlyRenewed(contract: Contract): boolean {
  if (!contract.renewed_at) return false
  return differenceInDays(new Date(), parseISO(contract.renewed_at)) < RECENT_RENEWAL_DAYS
}

interface ServiceReport {
  id: string
  report_date: string
  technician: string | null
  type: string
  summary: string | null
  findings: string | null
  recommendations: string | null
  parts_used: string | null
  labor_hours: number | null
  cost: number | null
  status: string
  file_path: string | null
  file_name: string | null
}

// Mirrors the select used by the contracts page so the modal can re-fetch a
// single contract (with its linked assets) after an in-modal update.
const CONTRACT_SELECT =
  '*, assets(name, asset_tag, serial_number, model), service_contract_assets(asset_id, pm_last_performed_date, assets(id, name, asset_tag, serial_number, model))'

interface ContractDetailModalProps {
  contract: Contract
  onClose: () => void
  onDeleted?: () => void
}

function getLinkedAssetNames(contract: Contract): string {
  const linked = contract.service_contract_assets?.filter((la) => la.assets) ?? []
  if (linked.length > 0) {
    return linked.map((la) => la.assets!.name).join(', ')
  }
  return contract.assets?.name ?? 'No assets linked'
}

function getLinkedAssetIds(contract: Contract): string[] {
  const linked = contract.service_contract_assets?.filter((la) => la.assets) ?? []
  if (linked.length > 0) {
    return linked.map((la) => la.asset_id)
  }
  return contract.asset_id ? [contract.asset_id] : []
}

function getPmInfo(contract: Contract) {
  // For multi-asset contracts, use the oldest per-asset PM date so the status reflects
  // the soonest upcoming PM across all covered units. Falls back to the contract-level date.
  const perAssetDates = (contract.service_contract_assets ?? [])
    .filter((la) => la.assets && la.pm_last_performed_date)
    .map((la) => parseISO(la.pm_last_performed_date!))

  const lastDates = perAssetDates.length > 0
    ? perAssetDates
    : contract.pm_last_performed_date
      ? [parseISO(contract.pm_last_performed_date)]
      : []

  if (lastDates.length === 0) return null

  const oldestLast = lastDates.reduce((a, b) => (a < b ? a : b))
  const nextDate = addMonths(oldestLast, contract.pm_interval_months)
  const daysLeft = differenceInDays(nextDate, new Date())
  const nextFormatted = format(nextDate, 'MMM d, yyyy')
  const lastFormatted = format(oldestLast, 'MMM d, yyyy')

  let color = 'bg-green-100 text-green-800'
  let label = `${daysLeft}d left`
  if (daysLeft < 0) { color = 'bg-red-100 text-red-800'; label = `${Math.abs(daysLeft)}d overdue` }
  else if (daysLeft === 0) { color = 'bg-red-100 text-red-800'; label = 'Due today' }
  else if (daysLeft <= 30) { color = 'bg-orange-100 text-orange-800' }
  else if (daysLeft <= 90) { color = 'bg-yellow-100 text-yellow-800' }

  return { label, nextDate: nextFormatted, lastDate: lastFormatted, color, daysLeft }
}

export default function ContractDetailModal({ contract: initialContract, onClose, onDeleted }: ContractDetailModalProps) {
  const router = useRouter()
  const supabase = createClient()
  // Keep a local, refreshable copy of the contract so in-modal actions (logging a
  // PM, adding/renewing) update what's shown without closing and reopening. The
  // prop only changes when a different contract is selected.
  const [contract, setContract] = useState<Contract>(initialContract)
  const [reports, setReports] = useState<ServiceReport[]>([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [showAddReport, setShowAddReport] = useState(false)
  const [showLogPm, setShowLogPm] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ServiceReport | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [actionError, setActionError] = useState('')

  const pm = getPmInfo(contract)
  const assetIds = getLinkedAssetIds(contract)
  const hasAssets = assetIds.length > 0

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Re-seed local state when a different contract is opened.
  useEffect(() => {
    setContract(initialContract)
  }, [initialContract])

  const loadReports = useCallback(async () => {
    setLoadingReports(true)
    const { data } = await supabase
      .from('service_reports')
      .select('id, report_date, technician, type, summary, findings, recommendations, parts_used, labor_hours, cost, status, file_path, file_name')
      .eq('service_contract_id', initialContract.id)
      .order('report_date', { ascending: false })
    setReports(data ?? [])
    setLoadingReports(false)
  }, [supabase, initialContract.id])

  // Re-fetch the contract (PM dates, per-asset dates, status, etc.) after an
  // in-modal update so the displayed details stay in sync with the database.
  const refreshContract = useCallback(async () => {
    const { data } = await supabase
      .from('service_contracts')
      .select(CONTRACT_SELECT)
      .eq('id', initialContract.id)
      .single()
    if (data) setContract(data as Contract)
  }, [supabase, initialContract.id])

  // Called whenever something inside the modal changes the contract: refresh both
  // the contract details and the service-report list together.
  const handleUpdated = useCallback(async () => {
    await Promise.all([refreshContract(), loadReports()])
  }, [refreshContract, loadReports])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  async function openFile() {
    if (!contract.file_path) return
    const { data, error } = await supabase.storage
      .from('contracts')
      .createSignedUrl(contract.file_path, 60)
    if (!error && data) window.open(data.signedUrl, '_blank')
  }

  async function openReportFile(filePath: string) {
    const { data, error } = await supabase.storage
      .from('service-reports')
      .createSignedUrl(filePath, 60)
    if (!error && data) window.open(data.signedUrl, '_blank')
  }

  async function handleDelete() {
    setDeleting(true)
    setActionError('')
    const { error } = await supabase.from('service_contracts').delete().eq('id', contract.id)
    if (error) {
      setActionError(error.message)
      setDeleting(false)
      return
    }
    onClose()
    if (onDeleted) onDeleted()
    router.refresh()
  }

  async function handleDeactivate() {
    setDeactivating(true)
    setActionError('')
    const newStatus = contract.status === 'active' ? 'expired' : 'active'
    const { error } = await supabase.from('service_contracts').update({ status: newStatus }).eq('id', contract.id)
    if (error) {
      setActionError(error.message)
      setDeactivating(false)
      return
    }
    onClose()
    if (onDeleted) onDeleted()
    router.refresh()
  }

  const linkedAssets = contract.service_contract_assets?.filter((la) => la.assets) ?? []

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{contract.vendor_name}</h2>
              <p className="text-sm text-gray-500">
                {getLinkedAssetNames(contract)}
                {contract.contract_number && ` • #${contract.contract_number}`}
              </p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[80vh] overflow-y-auto px-6 py-5 space-y-5">
            {/* Status badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={statusColor(contract.status)}>{contract.status}</Badge>
              <Badge className="bg-gray-100 text-gray-700 capitalize">{contract.contract_type.replace(/_/g, ' ')}</Badge>
              {isRecentlyRenewed(contract) && (
                <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Renewed
                </Badge>
              )}
              {contract.file_name && (
                <button onClick={openFile} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                  <FileText className="h-3 w-3" />
                  {contract.file_name}
                </button>
              )}
            </div>

            {/* Linked Assets */}
            {linkedAssets.length > 0 && (
              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">Linked Assets ({linkedAssets.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {linkedAssets.map((la) => (
                    <span key={la.asset_id} className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-sm text-blue-700">
                      {la.assets!.name}
                      {la.assets!.asset_tag && <span className="text-blue-400 ml-1">({la.assets!.asset_tag})</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contract Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Period</h4>
                <p className="text-sm text-gray-700">{formatDate(contract.start_date)} – {formatDate(contract.end_date)}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Cost</h4>
                <p className="text-sm text-gray-700">{formatCurrency(contract.cost)}</p>
              </div>
              {contract.vendor_contact && (
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Contact</h4>
                  <p className="text-sm text-gray-700">{contract.vendor_contact}</p>
                </div>
              )}
              {contract.vendor_email && (
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Email</h4>
                  <p className="text-sm text-gray-700">{contract.vendor_email}</p>
                </div>
              )}
              {contract.vendor_phone && (
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Phone</h4>
                  <p className="text-sm text-gray-700">{contract.vendor_phone}</p>
                </div>
              )}
              {contract.coverage_details && (
                <div className="col-span-2">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Coverage Details</h4>
                  <p className="text-sm text-gray-700">{contract.coverage_details}</p>
                </div>
              )}
              {contract.notes && (
                <div className="col-span-2">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Notes</h4>
                  <p className="text-sm text-gray-700">{contract.notes}</p>
                </div>
              )}
            </div>

            {/* PM Status Section */}
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <Wrench className="h-4 w-4" />
                  Preventive Maintenance
                </h4>
                {hasAssets && (
                  <Button size="sm" onClick={() => setShowLogPm(true)}>
                    Log PM
                  </Button>
                )}
              </div>
              {pm ? (
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-gray-500">Status</span>
                    <div className="mt-0.5"><Badge className={pm.color}>{pm.label}</Badge></div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Next PM</span>
                    <p className="mt-0.5 text-gray-700">{pm.nextDate}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Last Performed</span>
                    <p className="mt-0.5 text-gray-700">{pm.lastDate}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No PM tracking configured. Set a PM date on this contract to enable tracking.</p>
              )}
              <p className="text-xs text-gray-400 mt-2">Interval: every {contract.pm_interval_months} month{contract.pm_interval_months !== 1 ? 's' : ''}</p>
              {/* Per-asset PM dates */}
              {linkedAssets.length > 1 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Last PM per unit</p>
                  <div className="space-y-1">
                    {linkedAssets.filter((la) => la.assets).map((la) => (
                      <div key={la.asset_id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700">
                          {la.assets!.name}
                          {la.assets!.asset_tag && <span className="text-gray-400 ml-1">({la.assets!.asset_tag})</span>}
                        </span>
                        {la.pm_last_performed_date ? (
                          <span className="text-gray-600">{formatDate(la.pm_last_performed_date)}</span>
                        ) : (
                          <span className="text-gray-400 italic">No PM logged</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Service Reports Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <ClipboardList className="h-4 w-4" />
                  Service Reports ({reports.length})
                </h4>
                <button
                  onClick={() => setShowAddReport(true)}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4" />
                  Add Report
                </button>
              </div>

              {loadingReports ? (
                <p className="text-sm text-gray-400">Loading reports...</p>
              ) : reports.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 py-6 text-center">
                  <ClipboardList className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No service reports yet</p>
                  <button
                    onClick={() => setShowAddReport(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Add the first report
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Technician</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Summary</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cost</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">File</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {reports.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedReport(r)}>
                          <td className="px-4 py-2 text-sm text-gray-700">{formatDate(r.report_date)}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{r.technician || '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 capitalize">{r.type.replace(/_/g, ' ')}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 max-w-[200px] truncate">{r.summary || r.file_name || '—'}</td>
                          <td className="px-4 py-2">
                            <Badge className={
                              r.status === 'completed' ? 'bg-green-100 text-green-800' :
                              r.status === 'requires_followup' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-700'
                            }>
                              {r.status.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">{formatCurrency(r.cost)}</td>
                          <td className="px-4 py-2">
                            {r.file_path && r.file_name ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); openReportFile(r.file_path!) }}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              >
                                <FileText className="h-3 w-3" />
                                {r.file_name}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Actions */}
            {actionError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{actionError}</div>
            )}
            <div className="flex gap-3 pt-2 border-t border-gray-100 flex-wrap">
              {hasAssets && (
                <Button onClick={() => setShowLogPm(true)}>
                  <Wrench className="mr-2 h-4 w-4" />
                  Log PM
                </Button>
              )}
              <Button variant="secondary" onClick={() => setShowAddReport(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Service Report
              </Button>
              <Button variant="secondary" onClick={() => setShowRenewModal(true)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Renew Contract
              </Button>
              <Link
                href={`/contracts/${contract.id}/edit`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Edit Contract
              </Link>
              <Button variant="outline" loading={deactivating} onClick={handleDeactivate}>
                <XCircle className="mr-2 h-4 w-4" />
                {contract.status === 'active' ? 'Deactivate' : 'Reactivate'}
              </Button>
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                <p className="text-sm text-red-700">
                  Are you sure you want to delete the contract for <strong>{contract.vendor_name}</strong>? This will also delete all associated service reports. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <Button variant="danger" loading={deleting} onClick={handleDelete}>
                    Delete Contract
                  </Button>
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddReport && (
        <AddServiceReportModal
          serviceContractId={contract.id}
          assetId={assetIds[0] ?? null}
          assetName={linkedAssets.length <= 1 ? getLinkedAssetNames(contract) : undefined}
          linkedAssets={
            linkedAssets.length > 1
              ? linkedAssets.filter((la) => la.assets).map((la) => ({
                  asset_id: la.asset_id,
                  name: la.assets!.name,
                  asset_tag: la.assets!.asset_tag,
                }))
              : undefined
          }
          onClose={() => setShowAddReport(false)}
          onSaved={handleUpdated}
        />
      )}

      {showLogPm && hasAssets && (
        <LogContractPmModal
          contract={{
            ...contract,
            asset_id: assetIds[0],
            asset_ids: assetIds,
            linked_asset_names: getLinkedAssetNames(contract),
            linked_assets: linkedAssets.filter((la) => la.assets).map((la) => ({
              asset_id: la.asset_id,
              pm_last_performed_date: la.pm_last_performed_date,
              name: la.assets!.name,
              asset_tag: la.assets!.asset_tag,
            })),
          }}
          onClose={() => setShowLogPm(false)}
          onLogged={handleUpdated}
        />
      )}

      {selectedReport && (
        <ServiceReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}

      {showRenewModal && (
        <RenewContractModal
          contract={contract}
          onClose={() => setShowRenewModal(false)}
          onRenewed={() => {
            setShowRenewModal(false)
            onClose()
            if (onDeleted) onDeleted()
          }}
        />
      )}
    </>
  )
}
