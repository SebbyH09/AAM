import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { notFound } from 'next/navigation'
import InventoryItemForm from '../../InventoryItemForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditInventoryItemPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: item },
    { data: rawAlternates },
    { data: allItems },
  ] = await Promise.all([
    supabase.from('inventory_items').select('*').eq('id', id).single(),
    supabase
      .from('alternate_inventory_items')
      .select('id, alternate_item_id, notes, inventory_items!alternate_item_id(id, name, sku)')
      .eq('item_id', id)
      .catch(() => ({ data: null })),
    supabase
      .from('inventory_items')
      .select('id, name, sku, category, vendor')
      .eq('is_active', true)
      .order('name'),
  ])

  if (!item) notFound()

  const existingAlternates = (rawAlternates ?? []).map((a: any) => ({
    id: a.id,
    itemId: a.alternate_item_id,
    name: a.inventory_items?.name ?? 'Unknown',
    sku: a.inventory_items?.sku ?? null,
    notes: a.notes ?? '',
  }))

  return (
    <div>
      <Header title="Edit Item" subtitle={item.name} />
      <div className="p-4 sm:p-6">
        <InventoryItemForm
          item={item}
          existingAlternates={existingAlternates}
          allItems={allItems ?? []}
        />
      </div>
    </div>
  )
}
