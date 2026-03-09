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

  const { data: item } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', id)
    .single()

  if (!item) notFound()

  const { data: alternates, error: alternatesError } = await supabase
    .from('item_alternates')
    .select('id, alternate_item_id, notes, inventory_items!alternate_item_id(id, name, sku)')
    .eq('item_id', id)

  if (alternatesError) {
    console.error('Failed to fetch alternates:', alternatesError)
  }

  return (
    <div>
      <Header title="Edit Item" subtitle={item.name} />
      <div className="p-6">
        <InventoryItemForm item={item} alternates={alternates ?? []} />
      </div>
    </div>
  )
}
