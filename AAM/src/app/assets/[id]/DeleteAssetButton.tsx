'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Trash2 } from 'lucide-react'

interface DeleteAssetButtonProps {
  assetId: string
  assetName: string
}

export default function DeleteAssetButton({ assetId, assetName }: DeleteAssetButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setLoading(true)
    const { error } = await supabase.from('assets').delete().eq('id', assetId)
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/assets')
    router.refresh()
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Delete Asset" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{assetName}</strong>? This will also delete all associated contracts, maintenance plans, repairs, and downtime records. This action cannot be undone.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="danger" loading={loading} onClick={handleDelete}>
              Delete Asset
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
