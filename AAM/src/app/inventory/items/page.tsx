import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import InventoryItemsClient from './InventoryItemsClient'

export const dynamic = 'force-dynamic'

export default async function InventoryItemsPage() {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from('inventory_items')
    .select('*')
    .order('name')

  return (
    <div>
      <Header
        title="Inventory Items"
        subtitle="Manage consumable inventory stock"
        actions={
          <Link
            href="/inventory/items/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Item</span>
            <span className="sm:hidden">Add</span>
          </Link>
        }
      />

      <div className="p-4 sm:p-6">
        <InventoryItemsClient items={items ?? []} />
      </div>
    </div>
  )
}
