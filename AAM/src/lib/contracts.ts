import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Flip pending service contracts (e.g. renewals with a future start date) to
 * active once their start date has arrived, stamping activated_at so the
 * contracts page can surface them as newly active.
 */
export async function activateStartedContracts(supabase: SupabaseClient): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase
    .from('service_contracts')
    .update({ status: 'active', activated_at: new Date().toISOString() })
    .eq('status', 'pending')
    .lte('start_date', today)

  if (error) {
    // Fall back to a status-only update if the activated_at migration hasn't been applied yet.
    console.error('Failed to auto-activate contracts:', error.message)
    await supabase
      .from('service_contracts')
      .update({ status: 'active' })
      .eq('status', 'pending')
      .lte('start_date', today)
  }
}
