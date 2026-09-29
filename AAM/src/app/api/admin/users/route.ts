import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ROLES, isAdmin } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

/** Returns the signed-in user if they are an admin, otherwise null. */
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.user_metadata?.role)) return null
  return user
}

function missingServiceKey() {
  return !process.env.SUPABASE_SERVICE_ROLE_KEY
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  }
  if (missingServiceKey()) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured, so users cannot be listed.' },
      { status: 500 },
    )
  }

  const admin = createServiceClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const users = data.users
    .map((u) => ({
      id: u.id,
      email: u.email ?? '',
      name: (u.user_metadata?.full_name as string | undefined) ?? (u.user_metadata?.name as string | undefined) ?? null,
      role: (u.user_metadata?.role as string | undefined) ?? 'user',
      last_sign_in_at: u.last_sign_in_at ?? null,
      created_at: u.created_at,
    }))
    .sort((a, b) => a.email.localeCompare(b.email))

  return NextResponse.json({ users })
}

export async function PATCH(request: Request) {
  const currentUser = await requireAdmin()
  if (!currentUser) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  }
  if (missingServiceKey()) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured, so roles cannot be changed.' },
      { status: 500 },
    )
  }

  const body = (await request.json().catch(() => null)) as { userId?: string; role?: string } | null
  const userId = body?.userId
  const role = body?.role
  if (!userId || !role || !ROLES.some((r) => r.value === role)) {
    return NextResponse.json({ error: 'A user and a valid role are required.' }, { status: 400 })
  }
  if (userId === currentUser.id && !isAdmin(role)) {
    return NextResponse.json({ error: 'You cannot remove your own admin access.' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data: existing, error: fetchError } = await admin.auth.admin.getUserById(userId)
  if (fetchError || !existing.user) {
    return NextResponse.json({ error: fetchError?.message ?? 'User not found.' }, { status: 404 })
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...existing.user.user_metadata, role },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
