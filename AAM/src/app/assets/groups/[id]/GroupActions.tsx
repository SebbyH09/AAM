'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LogDowntimeModal from '@/app/downtime/LogDowntimeModal'
import AddOneTimePmButton from '@/app/assets/[id]/AddOneTimePmButton'
import { groupValue, type PickerAsset, type PickerGroup } from '@/lib/assetPicker'
import GroupLogPmModal, { type GroupPlan } from './GroupLogPmModal'
import EndGroupDowntimeModal, { type GroupDowntimeEvent } from './EndGroupDowntimeModal'
import {
  CheckCircle,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Gauge,
  Hammer,
  PlayCircle,
  Wrench,
  Zap,
} from 'lucide-react'

interface GroupActionsProps {
  group: PickerGroup
  memberIds: string[]
  assets: PickerAsset[]
  groups: PickerGroup[]
  plans: GroupPlan[]
  activeDowntime: GroupDowntimeEvent[]
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'repair', label: 'In Repair' },
  { value: 'decommissioned', label: 'Decommissioned' },
]

const linkClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50'

/**
 * Everything that can be done to one asset, done to the whole group. Each
 * action saves a separate record on every unit, so each asset's own history,
 * schedule and status stay accurate.
 */
export default function GroupActions({ group, memberIds, assets, groups, plans, activeDowntime }: GroupActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [modal, setModal] = useState<'' | 'log_pm' | 'downtime' | 'end_downtime'>('')
  const [statusBusy, setStatusBusy] = useState(false)
  const [error, setError] = useState('')

  const empty = memberIds.length === 0
  const q = `group=${group.id}`

  async function setStatus(status: string) {
    if (!status) return
    if (!confirm(`Set all ${memberIds.length} assets in ${group.name} to "${status}"?`)) return
    setStatusBusy(true)
    setError('')
    const { error } = await supabase.from('assets').update({ status }).in('id', memberIds)
    setStatusBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    router.refresh()
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="font-semibold text-gray-900">Group actions</h2>
        <p className="text-xs text-gray-500">
          Each action is saved on every asset in the group{empty ? '' : ` (${memberIds.length})`}.
        </p>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {empty ? (
        <p className="text-sm text-gray-400">Add assets to this group to act on them together.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setModal('log_pm')}
            disabled={plans.length === 0}
            title={plans.length === 0 ? 'No active maintenance plans on this group' : undefined}
            className={`${linkClass} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <ClipboardCheck className="h-4 w-4 text-green-600" /> Log PM
          </button>
          <Link href={`/maintenance/new?${q}`} className={linkClass}>
            <ClipboardList className="h-4 w-4 text-green-600" /> Add PM Plan
          </Link>
          <AddOneTimePmButton
            assetName={group.name}
            group={{ name: group.name, assetIds: memberIds }}
            triggerClassName={linkClass}
          />
          <Link href={`/repairs/new?${q}`} className={linkClass}>
            <Wrench className="h-4 w-4 text-orange-600" /> Log Repair
          </Link>
          <button type="button" onClick={() => setModal('downtime')} className={linkClass}>
            <Zap className="h-4 w-4 text-red-600" /> Log Downtime
          </button>
          {activeDowntime.length > 0 && (
            <button type="button" onClick={() => setModal('end_downtime')} className={linkClass}>
              <PlayCircle className="h-4 w-4 text-green-600" /> End Downtime ({activeDowntime.length})
            </button>
          )}
          <Link href={`/work-orders/new?${q}`} className={linkClass}>
            <Hammer className="h-4 w-4 text-gray-600" /> Work Order
          </Link>
          <Link href={`/contracts/new?${q}`} className={linkClass}>
            <FileText className="h-4 w-4 text-blue-600" /> Service Contract
          </Link>
          <Link href={`/calibrations/new?${q}`} className={linkClass}>
            <Gauge className="h-4 w-4 text-purple-600" /> Calibration
          </Link>
          <label className={`${linkClass} cursor-pointer`}>
            <CheckCircle className="h-4 w-4 text-gray-500" />
            <select
              value=""
              disabled={statusBusy}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-transparent text-sm focus:outline-none"
              aria-label="Set status for every asset in the group"
            >
              <option value="">Set status…</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {modal === 'log_pm' && (
        <GroupLogPmModal groupName={group.name} plans={plans} onClose={() => setModal('')} />
      )}
      {modal === 'downtime' && (
        <LogDowntimeModal
          assets={assets}
          groups={groups}
          defaultValue={groupValue(group.id)}
          onClose={() => setModal('')}
        />
      )}
      {modal === 'end_downtime' && (
        <EndGroupDowntimeModal groupName={group.name} events={activeDowntime} onClose={() => setModal('')} />
      )}
    </section>
  )
}
