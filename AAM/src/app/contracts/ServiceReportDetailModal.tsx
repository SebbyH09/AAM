'use client'

import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate, formatCurrency } from '@/lib/utils'
import { FileText, Clock, DollarSign, User, Wrench, ClipboardList } from 'lucide-react'

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

interface ServiceReportDetailModalProps {
  report: ServiceReport
  onClose: () => void
}

function statusBadgeClass(status: string) {
  if (status === 'completed') return 'bg-green-100 text-green-800'
  if (status === 'requires_followup') return 'bg-orange-100 text-orange-800'
  return 'bg-gray-100 text-gray-700'
}

export default function ServiceReportDetailModal({ report, onClose }: ServiceReportDetailModalProps) {
  const supabase = createClient()

  async function openReportFile() {
    if (!report.file_path) return
    const { data, error } = await supabase.storage
      .from('service-reports')
      .createSignedUrl(report.file_path, 60)
    if (!error && data) window.open(data.signedUrl, '_blank')
  }

  return (
    <Modal open={true} onClose={onClose} title="Service Report" size="lg">
      <div className="space-y-5">
        {/* Header badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={statusBadgeClass(report.status)}>
            {report.status.replace(/_/g, ' ')}
          </Badge>
          <Badge className="bg-gray-100 text-gray-700 capitalize">
            {report.type.replace(/_/g, ' ')}
          </Badge>
        </div>

        {/* Key details grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              <ClipboardList className="h-3 w-3" />
              Date
            </div>
            <p className="text-sm text-gray-700">{formatDate(report.report_date)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              <User className="h-3 w-3" />
              Technician
            </div>
            <p className="text-sm text-gray-700">{report.technician || '—'}</p>
          </div>
          {report.labor_hours != null && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
                <Clock className="h-3 w-3" />
                Labor Hours
              </div>
              <p className="text-sm text-gray-700">{report.labor_hours}h</p>
            </div>
          )}
          {report.cost != null && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
                <DollarSign className="h-3 w-3" />
                Cost
              </div>
              <p className="text-sm text-gray-700">{formatCurrency(report.cost)}</p>
            </div>
          )}
        </div>

        {/* Summary */}
        {report.summary && (
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Summary</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.summary}</p>
          </div>
        )}

        {/* Findings */}
        {report.findings && (
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Findings</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.findings}</p>
          </div>
        )}

        {/* Recommendations */}
        {report.recommendations && (
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Recommendations</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.recommendations}</p>
          </div>
        )}

        {/* Parts Used */}
        {report.parts_used && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              <Wrench className="h-3 w-3" />
              Parts Used
            </div>
            <p className="text-sm text-gray-700">{report.parts_used}</p>
          </div>
        )}

        {/* Attached File */}
        {report.file_path && report.file_name && (
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Attached Document</h4>
            <button
              onClick={openReportFile}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <FileText className="h-4 w-4" />
              {report.file_name}
            </button>
          </div>
        )}

        {/* Close button */}
        <div className="flex pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}
