'use client'

import { Bell } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:h-16 sm:py-0">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-gray-900 sm:text-xl truncate">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {actions}
        <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
