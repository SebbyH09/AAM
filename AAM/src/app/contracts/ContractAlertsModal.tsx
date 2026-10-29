'use client'

import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate, dueStatusBadge, daysUntil } from '@/lib/utils'
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

interface AlertContract {
  id: string
  vendor_name: string
  contract_number: string | null
  start_date: string
  end_date: string
}

interface ContractAlertsModalProps<T extends AlertContract> {
  newlyActive: T[]
  pending: T[]
  expiring: T[]
  getAssetNames: (contract: T) => string
  onSelect: (contract: T) => void
  onClose: () => void
}

export default function ContractAlertsModal<T extends AlertContract>({
  newlyActive,
  pending,
  expiring,
  getAssetNames,
  onSelect,
  onClose,
}: ContractAlertsModalProps<T>) {
  function Row({ contract, badge }: { contract: T; badge: { label: string; color: string } }) {
    return (
      <button
        onClick={() => onSelect(contract)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-left hover:bg-blue-50 transition-colors"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">
            {getAssetNames(contract)}
            {contract.contract_number && <span className="font-normal text-gray-400"> • #{contract.contract_number}</span>}
          </p>
          <p className="text-xs text-gray-500">
            {contract.vendor_name} · {formatDate(contract.start_date)} – {formatDate(contract.end_date)}
          </p>
        </div>
        <Badge className={`${badge.color} flex-shrink-0`}>{badge.label}</Badge>
      </button>
    )
  }

  function startsBadge(contract: T) {
    const days = daysUntil(contract.start_date) ?? 0
    return { label: days <= 0 ? 'Starts today' : `Starts in ${days}d`, color: 'bg-blue-100 text-blue-800' }
  }

  return (
    <Modal open={true} onClose={onClose} title="Contract Alerts" size="lg">
      <div className="space-y-5">
        {newlyActive.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Newly Active ({newlyActive.length})
            </h3>
            <div className="space-y-2">
              {newlyActive.map((c) => (
                <Row key={c.id} contract={c} badge={{ label: 'New active', color: 'bg-green-100 text-green-800' }} />
              ))}
            </div>
          </section>
        )}

        {pending.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
              <Clock className="h-4 w-4" />
              Pending ({pending.length})
            </h3>
            <div className="space-y-2">
              {pending.map((c) => <Row key={c.id} contract={c} badge={startsBadge(c)} />)}
            </div>
          </section>
        )}

        {expiring.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-orange-700">
              <AlertTriangle className="h-4 w-4" />
              Expiring ({expiring.length})
            </h3>
            <div className="space-y-2">
              {expiring.map((c) => <Row key={c.id} contract={c} badge={dueStatusBadge(c.end_date)} />)}
            </div>
          </section>
        )}

        <div className="flex justify-end border-t border-gray-100 pt-3">
          <Button type="button" onClick={onClose}>Got it</Button>
        </div>
      </div>
    </Modal>
  )
}
