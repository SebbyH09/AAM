'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Trash2 } from 'lucide-react'

interface Props {
  itemId: string
  itemName: string
}

export default function DeleteInventoryItemButton({ itemId, itemName }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('inventory_items').delete().eq('id', itemId)
    if (error) {
      alert('Failed to delete: ' + error.message)
      setLoading(false)
      return
    }
    router.push('/inventory/items')
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600">Delete &quot;{itemName}&quot;?</span>
        <Button variant="danger" size="sm" loading={loading} onClick={handleDelete}>
          Confirm
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
    >
      <Trash2 className="h-4 w-4" />
      Delete
    </button>
  )
}
