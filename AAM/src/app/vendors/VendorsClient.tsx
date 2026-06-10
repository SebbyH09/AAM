'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { Search, Building2 } from 'lucide-react'

interface Vendor {
  id: string
  name: string
  category: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  rating: number | null
  is_preferred: boolean
  created_at: string
}

interface VendorsClientProps {
  vendors: Vendor[]
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-gray-400 text-xs">—</span>
  return (
    <span className="text-yellow-500 text-sm">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

export default function VendorsClient({ vendors }: VendorsClientProps) {
  const [search, setSearch] = useState('')
  const [showPreferred, setShowPreferred] = useState(false)

  const filtered = useMemo(() => {
    return vendors.filter((v) => {
      const matchSearch =
        search === '' ||
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        (v.email?.toLowerCase().includes(search.toLowerCase())) ||
        (v.contact_name?.toLowerCase().includes(search.toLowerCase()))
      const matchPreferred = !showPreferred || v.is_preferred
      return matchSearch && matchPreferred
    })
  }, [vendors, search, showPreferred])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showPreferred}
              onChange={(e) => setShowPreferred(e.target.checked)}
              className="rounded text-blue-600"
            />
            Preferred only
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Building2 className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No vendors found</p>
          <Link
            href="/vendors/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Vendor
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Preferred</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{vendor.name}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                    {vendor.category?.replace('_', ' ') ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {vendor.contact_name ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {vendor.email ? (
                      <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:underline">{vendor.email}</a>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {vendor.phone ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <StarRating rating={vendor.rating} />
                  </td>
                  <td className="px-6 py-4">
                    {vendor.is_preferred ? (
                      <Badge className="bg-yellow-100 text-yellow-800">Preferred</Badge>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/vendors/${vendor.id}/edit`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
