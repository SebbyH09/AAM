'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate, formatCurrency, statusColor } from '@/lib/utils'
import { X, FileText, Wrench, Plus, ClipboardList } from 'lucide-react'
import { addMonths, parseISO, differenceInDays, format } from 'date-fns'
import Link from 'next/link'
import AddServiceReportModal from './AddServiceReportModal'
import LogContractPmModal from './LogContractPmModal'

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
}

interface ContractItem {
  id: string
  description: string
  quantity: number
  unit_cost: number | null
  total_cost: number | null
  notes: string | null
}

interface ServiceReport {
  id: string
  report_date: string
  technician: string
  type: string
  summary: string
  findings: string | null
  recommendations: string | null
  parts_used: string | null
  labor_hours: number | null
  cost: number | null
  status: string
  file_path: string | null
  file_name: string | null
}

interface ContractDetailModalProps {
  contract: Contract
  onClose: () => void
}

function getPmInfo(contract: Contract) {
  if (!contract.pm_last_performed_date) return null
  const lastDate = parseISO(contract.pm_last_performed_date)
  const nextDate = addMonths(lastDate, contract.pm_interval_months)
  const daysLeft = differenceInDays(nextDate, new Date())
  const nextFormatted = format(nextDate, 'MMM d, yyyy')

  let color = 'bg-green-100 text-green-800'
  let label = `${daysLeft}d left`
  if (daysLeft < 0) { color = 'bg-red-100 text-red-800'; label = `${Math.abs(daysLeft)}d overdue` }
  else if (daysLeft === 0) { color = 'bg-red-100 text-red-800'; label = 'Due today' }
  else if (daysLeft <= 30) { color = 'bg-orange-100 text-orange-800' }
  else if (daysLeft <= 90) { color = 'bg-yellow-100 text-yellow-800' }

  return { label, nextDate: nextFormatted, color, daysLeft }
}

export default function ContractDetailModal({ contract, onClose }: ContractDetailModalProps) {
  const supabase = createClient()
  const [contractItems, setContractItems] = useState<ContractItem[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [reports, setReports] = useState<ServiceReport[]>([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [showAddReport, setShowAddReport] = useState(false)
  const [showLogPm, setShowLogPm] = useState(false)

  const pm = getPmInfo(contract)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    loadReports()
    loadItems()
  }, [contract.id])

  async function loadItems() {
    setLoadingItems(true)
    const { data } = await supabase
      .from('contract_items')
      .select('id, description, quantity, unit_cost, total_cost, notes')
      .eq('service_contract_id', contract.id)
      .order('created_at')
    setContractItems(data ?? [])
    setLoadingItems(false)
  }

  async function loadReports() {
    setLoadingReports(true)
    const { data } = await supabase
      .from('service_reports')
      .select('id, report_date, technician, type, summary, findings, recommendations, parts_used, labor_hours, cost, status, file_path, file_name')
      .eq('service_contract_id', contract.id)
      .order('report_date', { ascending: false })
    setReports(data ?? [])
    setLoadingReports(false)
  }

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

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{contract.vendor_name}</h2>
              <p className="text-sm text-gray-500">
                {contract.assets?.name ?? 'No asset linked'}
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
              {contract.file_name && (
                <button onClick={openFile} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                  <FileText className="h-3 w-3" />
                  {contract.file_name}
                </button>
              )}
            </div>

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

            {/* Contract Items */}
            {loadingItems ? (
              <p className="text-sm text-gray-400">Loading items...</p>
            ) : contractItems.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                  <ClipboardList className="h-4 w-4" />
                  Contract Items ({contractItems.length})
                </h4>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Unit Cost</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {contractItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <p className="text-sm text-gray-700">{item.description}</p>
                            {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right">{formatCurrency(item.unit_cost)}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 text-right font-medium">{formatCurrency(item.total_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PM Status Section */}
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <Wrench className="h-4 w-4" />
                  Preventive Maintenance
                </h4>
                {contract.asset_id && (
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
                    <p className="mt-0.5 text-gray-700">{formatDate(contract.pm_last_performed_date)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No PM tracking configured. Set a PM date on this contract to enable tracking.</p>
              )}
              <p className="text-xs text-gray-400 mt-2">Interval: every {contract.pm_interval_months} month{contract.pm_interval_months !== 1 ? 's' : ''}</p>
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
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-700">{formatDate(r.report_date)}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{r.technician}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 capitalize">{r.type.replace(/_/g, ' ')}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 max-w-[200px] truncate">{r.summary}</td>
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
                                onClick={() => openReportFile(r.file_path!)}
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
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              {contract.asset_id && (
                <Button onClick={() => setShowLogPm(true)}>
                  <Wrench className="mr-2 h-4 w-4" />
                  Log PM
                </Button>
              )}
              <Button variant="secondary" onClick={() => setShowAddReport(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Service Report
              </Button>
              <Link
                href={`/contracts/${contract.id}/edit`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Edit Contract
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showAddReport && (
        <AddServiceReportModal
          serviceContractId={contract.id}
          assetId={contract.asset_id}
          assetName={contract.assets?.name}
          onClose={() => setShowAddReport(false)}
          onSaved={loadReports}
        />
      )}

      {showLogPm && contract.asset_id && (
        <LogContractPmModal
          contract={contract}
          onClose={() => setShowLogPm(false)}
        />
      )}
    </>
  )
}
