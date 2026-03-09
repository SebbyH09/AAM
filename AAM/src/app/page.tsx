import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Package, FileText, ClipboardList, Wrench,
  Clock, AlertTriangle, CheckCircle, TrendingUp
} from 'lucide-react'
import { formatDate, dueStatusBadge, statusColor } from '@/lib/utils'
import Link from 'next/link'
import { addDays } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const in30Days = addDays(new Date(), 30).toISOString().split('T')[0]
  const in7Days = addDays(new Date(), 7).toISOString().split('T')[0]

  const [
    { count: totalAssets },
    { count: activeAssets },
    { count: activeContracts },
    { count: expiringContracts },
    { count: openRepairs },
    { count: overdueMaintenance },
    { data: upcomingMaintenance },
    { data: expiringContractsList },
    { data: openRepairsList },
    { data: activeDowntime },
  ] = await Promise.all([
    supabase.from('assets').select('*', { count: 'exact', head: true }),
    supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('service_contracts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('service_contracts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .lte('end_date', in30Days)
      .gte('end_date', today),
    supabase.from('repairs').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    supabase.from('maintenance_plans')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .lt('next_due_date', today),
    supabase.from('maintenance_plans')
      .select('*, assets(name, asset_tag)')
      .eq('is_active', true)
      .gte('next_due_date', today)
      .lte('next_due_date', in7Days)
      .order('next_due_date')
      .limit(5),
    supabase.from('service_contracts')
      .select('*, assets(name, asset_tag)')
      .eq('status', 'active')
      .lte('end_date', in30Days)
      .gte('end_date', today)
      .order('end_date')
      .limit(5),
    supabase.from('repairs')
      .select('*, assets(name, asset_tag)')
      .in('status', ['open', 'in_progress', 'waiting_parts'])
      .eq('priority', 'critical')
      .order('reported_date')
      .limit(5),
    supabase.from('downtime_events')
      .select('*, assets(name, asset_tag)')
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(5),
  ])

  return (
    <div>
      <Header title="Dashboard" subtitle="Overview of your asset health and upcoming tasks" />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Assets"
            value={totalAssets ?? 0}
            subtitle={`${activeAssets ?? 0} active`}
            icon={<Package className="h-6 w-6" />}
            color="blue"
          />
          <StatCard
            title="Active Contracts"
            value={activeContracts ?? 0}
            subtitle={`${expiringContracts ?? 0} expiring soon`}
            icon={<FileText className="h-6 w-6" />}
            color={expiringContracts ? 'orange' : 'green'}
          />
          <StatCard
            title="Open Repairs"
            value={openRepairs ?? 0}
            subtitle="In progress"
            icon={<Wrench className="h-6 w-6" />}
            color={openRepairs ? 'yellow' : 'green'}
          />
          <StatCard
            title="Overdue Maintenance"
            value={overdueMaintenance ?? 0}
            subtitle="Need attention"
            icon={<AlertTriangle className="h-6 w-6" />}
            color={overdueMaintenance ? 'red' : 'green'}
          />
        </div>

        {((overdueMaintenance ?? 0) > 0 || (expiringContracts ?? 0) > 0) && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-800">Action Required</p>
                <p className="text-sm text-orange-700 mt-0.5">
                  {(overdueMaintenance ?? 0) > 0 && `${overdueMaintenance} maintenance task(s) are overdue. `}
                  {(expiringContracts ?? 0) > 0 && `${expiringContracts} contract(s) expiring within 30 days.`}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Upcoming Maintenance */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">Maintenance Due This Week</h2>
              </div>
              <Link href="/maintenance" className="text-sm text-blue-600 hover:text-blue-800">View all →</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {upcomingMaintenance && upcomingMaintenance.length > 0 ? (
                upcomingMaintenance.map((plan: any) => {
                  const badge = dueStatusBadge(plan.next_due_date)
                  return (
                    <div key={plan.id} className="flex items-center justify-between px-6 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{plan.name}</p>
                        <p className="text-xs text-gray-500">{plan.assets?.name ?? 'No asset'}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge className={badge.color}>{badge.label}</Badge>
                        <Badge className={statusColor(plan.priority)}>{plan.priority}</Badge>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-8 w-8 text-green-400 mb-2" />
                  <p className="text-sm text-gray-500">No maintenance due this week</p>
                </div>
              )}
            </div>
          </div>

          {/* Expiring Contracts */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-600" />
                <h2 className="font-semibold text-gray-900">Expiring Contracts (30 days)</h2>
              </div>
              <Link href="/contracts" className="text-sm text-blue-600 hover:text-blue-800">View all →</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {expiringContractsList && expiringContractsList.length > 0 ? (
                expiringContractsList.map((contract: any) => {
                  const badge = dueStatusBadge(contract.end_date)
                  return (
                    <div key={contract.id} className="flex items-center justify-between px-6 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{contract.vendor_name}</p>
                        <p className="text-xs text-gray-500">
                          {contract.assets?.name ?? 'No asset'} • Expires {formatDate(contract.end_date)}
                        </p>
                      </div>
                      <Badge className={badge.color}>{badge.label}</Badge>
                    </div>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-8 w-8 text-green-400 mb-2" />
                  <p className="text-sm text-gray-500">No contracts expiring soon</p>
                </div>
              )}
            </div>
          </div>

          {/* Critical Repairs */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-red-600" />
                <h2 className="font-semibold text-gray-900">Critical Repairs</h2>
              </div>
              <Link href="/repairs" className="text-sm text-blue-600 hover:text-blue-800">View all →</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {openRepairsList && openRepairsList.length > 0 ? (
                openRepairsList.map((repair: any) => (
                  <div key={repair.id} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{repair.description}</p>
                      <p className="text-xs text-gray-500">
                        {repair.assets?.name ?? 'No asset'} • Reported {formatDate(repair.reported_date)}
                      </p>
                    </div>
                    <Badge className={statusColor(repair.status)}>
                      {repair.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-8 w-8 text-green-400 mb-2" />
                  <p className="text-sm text-gray-500">No critical repairs open</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Downtime */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <h2 className="font-semibold text-gray-900">Active Downtime</h2>
              </div>
              <Link href="/downtime" className="text-sm text-blue-600 hover:text-blue-800">View all →</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {activeDowntime && activeDowntime.length > 0 ? (
                activeDowntime.map((event: any) => (
                  <div key={event.id} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {event.assets?.name ?? 'Unknown Asset'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {event.reason.replace(/_/g, ' ')} • Since {formatDate(event.start_time)}
                      </p>
                    </div>
                    <Badge className="bg-red-100 text-red-800">Active</Badge>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <TrendingUp className="h-8 w-8 text-green-400 mb-2" />
                  <p className="text-sm text-gray-500">All assets operational</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
