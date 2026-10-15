'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X, Pencil, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PickerAsset } from '@/components/AssetPicker'
import RecordAttachments from '@/components/RecordAttachments'
import { formatDate, formatCurrency, statusColor } from '@/lib/utils'
import type { Repair } from '@/types/database'
import RepairForm from './RepairForm'
import LaborLogSection from './LaborLogSection'

export type RepairWithAsset = Repair & {
  assets: { name: string; asset_tag: string | null; serial_number: string | null; model: string | null } | null
}

interface RepairDetailModalProps {
  repair: RepairWithAsset
  assets: PickerAsset[]
  onClose: () => void
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">{label}</h4>
      <p className="text-sm text-gray-700 break-words whitespace-pre-line">{value || '—'}</p>
    </div>
  )
}

export default function RepairDetailModal({ repair, assets, onClose }: RepairDetailModalProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleSaved() {
    setEditing(false)
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? 'Edit Repair' : repair.repair_number ? `Repair #${repair.repair_number}` : 'Repair'}
              </h2>
              <Badge className={statusColor(repair.status)}>{repair.status.replace('_', ' ')}</Badge>
              <Badge className={statusColor(repair.priority)}>{repair.priority}</Badge>
              {repair.warranty_repair && <Badge className="bg-purple-100 text-purple-800">Warranty</Badge>}
            </div>
            <p className="text-sm text-gray-500 truncate">{repair.description}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 hover:text-blue-800"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-5 space-y-6">
          {editing ? (
            <RepairForm
              assets={assets}
              repair={repair}
              bare
              onSaved={handleSaved}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              <section>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Details</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Field
                    label="Asset"
                    value={
                      repair.asset_id && repair.assets ? (
                        <Link
                          href={`/assets/${repair.asset_id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                          {repair.assets.name}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : null
                    }
                  />
                  <Field label="Asset Tag" value={repair.assets?.asset_tag} />
                  <Field label="Serial Number" value={repair.assets?.serial_number} />
                  <Field label="Reported By" value={repair.reported_by} />
                  <Field label="Reported" value={formatDate(repair.reported_date)} />
                  <Field label="Assigned To" value={repair.assigned_to} />
                  <Field label="Vendor" value={repair.vendor} />
                  <Field label="Started" value={repair.started_date ? formatDate(repair.started_date) : null} />
                  <Field label="Completed" value={repair.completed_date ? formatDate(repair.completed_date) : null} />
                </div>
              </section>

              <section className="space-y-4">
                <Field label="Description" value={repair.description} />
                <Field label="Root Cause" value={repair.root_cause} />
                <Field label="Resolution" value={repair.resolution} />
                <Field label="Notes" value={repair.notes} />
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Costs</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Parts" value={formatCurrency(repair.parts_cost)} />
                  <Field label="Labor" value={formatCurrency(repair.labor_cost)} />
                  <Field label="Total" value={formatCurrency(repair.total_cost)} />
                </div>
              </section>

              <div className="flex gap-3">
                <Button onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4" />
                  Update Repair
                </Button>
                <Button variant="outline" onClick={onClose}>Close</Button>
              </div>
            </>
          )}

          <LaborLogSection repairId={repair.id} />
          <RecordAttachments repairId={repair.id} assetId={repair.asset_id} />
        </div>
      </div>
    </div>
  )
}
