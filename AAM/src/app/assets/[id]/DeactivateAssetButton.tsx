'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Power } from 'lucide-react'

interface DeactivateAssetButtonProps {
  assetId: string
  assetName: string
  currentStatus: string
}

export default function DeactivateAssetButton({ assetId, assetName, currentStatus }: DeactivateAssetButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isActive = currentStatus === 'active'
  const newStatus = isActive ? 'inactive' : 'active'

  async function handleToggle() {
    setLoading(true)
    const { error } = await supabase.from('assets').update({ status: newStatus }).eq('id', assetId)
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Power className="h-4 w-4" />
        {isActive ? 'Deactivate' : 'Reactivate'}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={isActive ? 'Deactivate Asset' : 'Reactivate Asset'} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to {isActive ? 'deactivate' : 'reactivate'} <strong>{assetName}</strong>?
            {isActive && ' The asset will be marked as inactive.'}
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant={isActive ? 'secondary' : 'primary'} loading={loading} onClick={handleToggle}>
              {isActive ? 'Deactivate' : 'Reactivate'}
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
