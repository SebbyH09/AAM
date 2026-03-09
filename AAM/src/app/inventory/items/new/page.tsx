import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import InventoryItemForm from '../InventoryItemForm'

export const dynamic = 'force-dynamic'

export default async function NewInventoryItemPage() {
  const supabase = await createClient()
  const { data: allItems } = await supabase
    .from('inventory_items')
    .select('id, name, sku, category, vendor')
    .eq('is_active', true)
    .order('name')

  return (
    <div>
      <Header title="Add Inventory Item" subtitle="Add a new consumable item to inventory" />
      <div className="p-4 sm:p-6">
        <InventoryItemForm allItems={allItems ?? []} />
      </div>
    </div>
  )
}
