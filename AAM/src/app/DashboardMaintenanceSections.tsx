'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { ClipboardList, CheckCircle, Calendar, Settings2, Wrench } from 'lucide-react'
import { formatDate, dueStatusBadge, statusColor } from '@/lib/utils'
import { addMonths, parseISO, differenceInDays, format } from 'date-fns'
import Link from 'next/link'
import { addDays } from 'date-fns'

interface MaintenancePlan {
  id: string
  name: string
  next_due_date: string | null
  priority: string
  frequency: string
  frequency_days: number | null
  assigned_to: string | null
  last_performed_date: string | null
  assets: { name: string; asset_tag: string } | null
}

interface ContractPm {
  id: string
  vendor_name: string
  contract_number: string | null
  pm_last_performed_date: string | null
  pm_interval_months: number
  status: string
  assets: { name: string; asset_tag: string } | null
  nextPmDate: string
  daysLeft: number
}

export default function DashboardMaintenanceSections() {
  const [days, setDays] = useState(7)
  const [daysInput, setDaysInput] = useState('7')
  const [dueMaintenance, setDueMaintenance] = useState<MaintenancePlan[]>([])
  const [upcomingPMs, setUpcomingPMs] = useState<ContractPm[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (numDays: number) => {
    setLoading(true)
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const futureDate = addDays(new Date(), numDays).toISOString().split('T')[0]

    const [{ data: due }, { data: contracts }] = await Promise.all([
      // Maintenance due within X days AND any overdue (past due)
      supabase
        .from('maintenance_plans')
        .select('*, assets(name, asset_tag)')
        .eq('is_active', true)
        .lte('next_due_date', futureDate)
        .order('next_due_date')
        .limit(20),
      // Upcoming preventative maintenance from service contracts
      supabase
        .from('service_contracts')
        .select('id, vendor_name, contract_number, pm_last_performed_date, pm_interval_months, status, assets(name, asset_tag)')
        .eq('status', 'active')
        .not('pm_last_performed_date', 'is', null),
    ])

    // Calculate next PM dates from contracts and filter within window
    const contractPMs: ContractPm[] = (contracts ?? [])
      .map((c: any) => {
        if (!c.pm_last_performed_date) return null
        const lastDate = parseISO(c.pm_last_performed_date)
        const nextDate = addMonths(lastDate, c.pm_interval_months)
        const daysLeft = differenceInDays(nextDate, new Date())
        const nextPmDate = format(nextDate, 'yyyy-MM-dd')
        if (nextPmDate > futureDate) return null
        return { ...c, nextPmDate, daysLeft }
      })
      .filter((c: ContractPm | null): c is ContractPm => c !== null)
      .sort((a: ContractPm, b: ContractPm) => a.daysLeft - b.daysLeft)
      .slice(0, 10)

    setDueMaintenance(due ?? [])
    setUpcomingPMs(contractPMs)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData(days)
  }, [days, fetchData])

  const handleDaysChange = (value: string) => {
    setDaysInput(value)
    const num = parseInt(value, 10)
    if (!isNaN(num) && num >= 1 && num <= 365) {
      setDays(num)
    }
  }

  const presetDays = [7, 14, 30, 60, 90]

  const frequencyLabel = (freq: string, freqDays: number | null) => {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      semi_annual: 'Semi-Annual',
      annual: 'Annual',
    }
    if (freq === 'custom' && freqDays) return `Every ${freqDays}d`
    return labels[freq] ?? freq
  }

  return (
    <>
      {/* Day range selector */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-6 py-4 lg:col-span-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Maintenance Window:</span>
          </div>
          <div className="flex items-center gap-2">
            {presetDays.map((d) => (
              <button
                key={d}
                onClick={() => { setDays(d); setDaysInput(String(d)) }}
                className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                  days === d
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-500">or</span>
            <input
              type="number"
              min={1}
              max={365}
              value={daysInput}
              onChange={(e) => handleDaysChange(e.target.value)}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-gray-500">days</span>
          </div>
        </div>
      </div>

      {/* Maintenance Due */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">
              Maintenance Due
              <span className="ml-1 text-sm font-normal text-gray-500">
                (overdue + next {days} {days === 1 ? 'day' : 'days'})
              </span>
            </h2>
          </div>
          <Link href="/maintenance" className="text-sm text-blue-600 hover:text-blue-800">View all →</Link>
        </div>
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : dueMaintenance.length > 0 ? (
            dueMaintenance.map((plan) => {
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
              <p className="text-sm text-gray-500">No overdue or upcoming maintenance in the next {days} days</p>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Preventative Maintenance */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900">
              Upcoming Preventative Maintenance
              <span className="ml-1 text-sm font-normal text-gray-500">
                (next {days} {days === 1 ? 'day' : 'days'})
              </span>
            </h2>
          </div>
          <Link href="/contracts" className="text-sm text-blue-600 hover:text-blue-800">View all →</Link>
        </div>
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
            </div>
          ) : upcomingPMs.length > 0 ? (
            upcomingPMs.map((contract) => {
              const badge = dueStatusBadge(contract.nextPmDate)
              return (
                <div key={contract.id} className="flex items-center justify-between px-6 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      <Wrench className="inline h-3.5 w-3.5 mr-1 text-purple-500" />
                      {contract.vendor_name}
                      {contract.contract_number && <span className="text-gray-400 ml-1">#{contract.contract_number}</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {contract.assets?.name ?? 'No asset'}
                      {' • '}
                      <span className="text-gray-400">Every {contract.pm_interval_months} mo</span>
                    </p>
                    {contract.pm_last_performed_date && (
                      <p className="text-xs text-gray-400">Last performed: {formatDate(contract.pm_last_performed_date)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <Badge className={badge.color}>{badge.label}</Badge>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-8 w-8 text-green-400 mb-2" />
              <p className="text-sm text-gray-500">No contract PMs scheduled in the next {days} days</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
