'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatCurrency, statusColor, dueStatusBadge } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, FileText, ChevronRight, Paperclip, Wrench, RefreshCw, Sparkles, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addMonths, parseISO, differenceInDays, format } from 'date-fns'
import ContractDetailModal from './ContractDetailModal'
import ContractAlertsModal from './ContractAlertsModal'

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
  assets: { name: string; asset_tag: string | null; serial_number: string | null; model: string | null } | null
  service_contract_assets?: LinkedAsset[]
  renewed_from_contract_id?: string | null
  renewed_at?: string | null
  activated_at?: string | null
}

// Contracts renewed within this window are pinned to the top of the list.
const RECENT_RENEWAL_DAYS = 7

function isRecentlyRenewed(contract: Contract): boolean {
  if (!contract.renewed_at) return false
  return differenceInDays(new Date(), parseISO(contract.renewed_at)) < RECENT_RENEWAL_DAYS
}

// Pending contracts (e.g. renewals) that auto-activated on their start date within
// this window are flagged as newly active and pinned alongside recent renewals.
function isRecentlyActivated(contract: Contract): boolean {
  if (contract.status !== 'active' || !contract.activated_at) return false
  return differenceInDays(new Date(), parseISO(contract.activated_at)) < RECENT_RENEWAL_DAYS
}

// Most recent renewal/activation timestamp within the pin window, or null.
function pinnedAt(contract: Contract): number | null {
  const times = [
    isRecentlyRenewed(contract) ? parseISO(contract.renewed_at!).getTime() : null,
    isRecentlyActivated(contract) ? parseISO(contract.activated_at!).getTime() : null,
  ].filter((t): t is number => t !== null)
  return times.length > 0 ? Math.max(...times) : null
}

// Active contracts ending within this many days show in the alerts pop-up.
const EXPIRING_SOON_DAYS = 30

function getLinkedAssetNames(contract: Contract): string {
  const linked = contract.service_contract_assets?.filter((la) => la.assets) ?? []
  if (linked.length > 0) {
    return linked.map((la) => la.assets!.name).join(', ')
  }
  // Fallback to legacy asset_id
  return contract.assets?.name ?? 'No assets linked'
}

function getLinkedAssetIds(contract: Contract): string[] {
  const linked = contract.service_contract_assets?.filter((la) => la.assets) ?? []
  if (linked.length > 0) {
    return linked.map((la) => la.asset_id)
  }
  return contract.asset_id ? [contract.asset_id] : []
}

// When a contract covers multiple assets, each asset tracks its own last PM date.
// Return the oldest of those (which yields the soonest upcoming PM date) so the
// status reflects the most urgent unit rather than whichever was serviced most
// recently. Returns null when no PM has been logged.
function getPmLastDate(contract: Contract): Date | null {
  const perAssetDates = (contract.service_contract_assets ?? [])
    .filter((la) => la.assets && la.pm_last_performed_date)
    .map((la) => parseISO(la.pm_last_performed_date!))

  const lastDates = perAssetDates.length > 0
    ? perAssetDates
    : contract.pm_last_performed_date
      ? [parseISO(contract.pm_last_performed_date)]
      : []

  if (lastDates.length === 0) return null

  return lastDates.reduce((a, b) => (a < b ? a : b))
}

// Upcoming PM date (last PM + interval), or null when no PM has been logged.
function getPmNextDate(contract: Contract): Date | null {
  const oldestLast = getPmLastDate(contract)
  return oldestLast ? addMonths(oldestLast, contract.pm_interval_months) : null
}

function getPmStatus(contract: Contract): { label: string; nextDate: string; lastDate: string; color: string } | null {
  const oldestLast = getPmLastDate(contract)
  if (!oldestLast) return null

  const nextDate = addMonths(oldestLast, contract.pm_interval_months)
  const daysLeft = differenceInDays(nextDate, new Date())
  const nextFormatted = format(nextDate, 'MMM d, yyyy')
  const lastFormatted = format(oldestLast, 'MMM d, yyyy')

  if (daysLeft < 0) return { label: `${Math.abs(daysLeft)}d overdue`, nextDate: nextFormatted, lastDate: lastFormatted, color: 'bg-red-100 text-red-800' }
  if (daysLeft === 0) return { label: 'Due today', nextDate: nextFormatted, lastDate: lastFormatted, color: 'bg-red-100 text-red-800' }
  if (daysLeft <= 30) return { label: `${daysLeft}d left`, nextDate: nextFormatted, lastDate: lastFormatted, color: 'bg-orange-100 text-orange-800' }
  if (daysLeft <= 90) return { label: `${daysLeft}d left`, nextDate: nextFormatted, lastDate: lastFormatted, color: 'bg-yellow-100 text-yellow-800' }
  return { label: `${daysLeft}d left`, nextDate: nextFormatted, lastDate: lastFormatted, color: 'bg-green-100 text-green-800' }
}

interface ContractsClientProps {
  contracts: Contract[]
}

type SortField = 'assets' | 'type' | 'period' | 'expiry' | 'cost' | 'pm' | 'status'
type SortDir = 'asc' | 'desc'

// Compare two contracts on a given column (ascending). Missing values (no cost /
// no PM logged) sort last in ascending order; the caller negates for descending.
function compareContracts(a: Contract, b: Contract, field: SortField): number {
  switch (field) {
    case 'assets':
      return getLinkedAssetNames(a).toLowerCase().localeCompare(getLinkedAssetNames(b).toLowerCase())
    case 'type':
      return a.contract_type.toLowerCase().localeCompare(b.contract_type.toLowerCase())
    case 'period':
      return parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime()
    case 'expiry':
      return parseISO(a.end_date).getTime() - parseISO(b.end_date).getTime()
    case 'cost': {
      if (a.cost == null && b.cost == null) return 0
      if (a.cost == null) return 1
      if (b.cost == null) return -1
      return a.cost - b.cost
    }
    case 'pm': {
      const aNext = getPmNextDate(a)
      const bNext = getPmNextDate(b)
      if (!aNext && !bNext) return 0
      if (!aNext) return 1
      if (!bNext) return -1
      return aNext.getTime() - bNext.getTime()
    }
    case 'status':
      return a.status.toLowerCase().localeCompare(b.status.toLowerCase())
  }
}

const STATUS_FILTERS = ['all', 'active', 'expired', 'pending']

export default function ContractsClient({ contracts }: ContractsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  // Default to expiry ascending, which matches the order the rows arrive in.
  const [sortField, setSortField] = useState<SortField>('expiry')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const alerts = useMemo(() => {
    const byStart = (a: Contract, b: Contract) => a.start_date.localeCompare(b.start_date)
    const byEnd = (a: Contract, b: Contract) => a.end_date.localeCompare(b.end_date)
    return {
      newlyActive: contracts.filter(isRecentlyActivated).sort(byStart),
      pending: contracts.filter((c) => c.status === 'pending').sort(byStart),
      expiring: contracts
        .filter((c) => c.status === 'active' && differenceInDays(parseISO(c.end_date), new Date()) <= EXPIRING_SOON_DAYS)
        .sort(byEnd),
    }
  }, [contracts])
  // Pop up the alerts once when the page loads, if there is anything to show.
  const [showAlerts, setShowAlerts] = useState(
    () => alerts.newlyActive.length + alerts.pending.length + alerts.expiring.length > 0
  )

  const filtered = contracts.filter((c) => {
    const q = search.toLowerCase()
    const assetNames = getLinkedAssetNames(c).toLowerCase()
    const matchSearch =
      search === '' ||
      c.vendor_name.toLowerCase().includes(q) ||
      (c.contract_number?.toLowerCase().includes(q)) ||
      assetNames.includes(q) ||
      (c.assets?.serial_number?.toLowerCase().includes(q)) ||
      (c.assets?.model?.toLowerCase().includes(q))
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  // Pin contracts renewed or auto-activated within the last 7 days to the top (most
  // recent first); everything else is ordered by the selected sort column.
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aPinned = pinnedAt(a)
      const bPinned = pinnedAt(b)
      if (aPinned !== null && bPinned !== null) return bPinned - aPinned
      if (aPinned !== null) return -1
      if (bPinned !== null) return 1
      const cmp = compareContracts(a, b, sortField)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-gray-400" />
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-blue-600" />
      : <ArrowDown className="h-3 w-3 text-blue-600" />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search contracts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <FileText className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No contracts found</p>
          <Link
            href="/contracts/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Contract
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => toggleSort('assets')} className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700">
                    Assets / Vendor <SortIcon field="assets" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => toggleSort('type')} className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700">
                    Type <SortIcon field="type" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => toggleSort('period')} className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700">
                    Period <SortIcon field="period" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => toggleSort('expiry')} className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700">
                    Expiry <SortIcon field="expiry" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => toggleSort('cost')} className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700">
                    Cost <SortIcon field="cost" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => toggleSort('pm')} className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700">
                    PM Status <SortIcon field="pm" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700">
                    Status <SortIcon field="status" />
                  </button>
                </th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((contract) => {
                const badge = dueStatusBadge(contract.end_date)
                const pm = getPmStatus(contract)
                const assetNames = getLinkedAssetNames(contract)
                return (
                  <tr key={contract.id} className="hover:bg-blue-100 transition-colors cursor-pointer" onClick={() => setSelectedContract(contract)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {assetNames}
                            {contract.contract_number && <span className="text-gray-400 font-normal"> • #{contract.contract_number}</span>}
                          </p>
                          <p className="text-xs text-gray-500">{contract.vendor_name}</p>
                        </div>
                        {contract.file_name && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (!contract.file_path) return
                              const { data, error } = await supabase.storage
                                .from('contracts')
                                .createSignedUrl(contract.file_path, 60)
                              if (error) {
                                console.error(error)
                                return
                              }
                              window.open(data.signedUrl, '_blank')
                            }}
                            className="text-blue-400 hover:text-blue-600"
                            title={contract.file_name}
                          >
                            <Paperclip className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                      {contract.contract_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(contract.start_date)} – {formatDate(contract.end_date)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={badge.color}>{badge.label}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(contract.cost)}</td>
                    <td className="px-6 py-4">
                      {pm ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge className={pm.color}>
                            <Wrench className="mr-1 inline h-3 w-3" />
                            {pm.label}
                          </Badge>
                          <span className="text-[11px] text-gray-500">Next: {pm.nextDate}</span>
                          <span className="text-[11px] text-gray-400">Last: {pm.lastDate}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <Badge className={statusColor(contract.status)}>{contract.status}</Badge>
                        {isRecentlyRenewed(contract) && (
                          <Badge className="bg-purple-100 text-purple-700 text-[10px] flex items-center gap-0.5 w-fit">
                            <RefreshCw className="h-2.5 w-2.5" />
                            Renewed
                          </Badge>
                        )}
                        {isRecentlyActivated(contract) && (
                          <Badge className="bg-green-100 text-green-700 text-[10px] flex items-center gap-0.5 w-fit">
                            <Sparkles className="h-2.5 w-2.5" />
                            New active
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/contracts/${contract.id}/edit`}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        Edit <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {showAlerts && (
        <ContractAlertsModal
          newlyActive={alerts.newlyActive}
          pending={alerts.pending}
          expiring={alerts.expiring}
          getAssetNames={getLinkedAssetNames}
          onSelect={(c) => { setShowAlerts(false); setSelectedContract(c) }}
          onClose={() => setShowAlerts(false)}
        />
      )}
      {selectedContract && (
        <ContractDetailModal
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
          onDeleted={() => { setSelectedContract(null); router.refresh() }}
        />
      )}
    </div>
  )
}
