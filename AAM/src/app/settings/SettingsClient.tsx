'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { AssetCategory, RolePageAccess } from '@/types/database'
import { ADMIN_ROLE, CONFIGURABLE_PAGES, CONFIGURABLE_ROLES, ROLES } from '@/lib/permissions'
import { AlertTriangle, ArrowDown, ArrowUp, Check, Edit, Plus, Tags, Trash2, Users, Eye, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'categories' | 'access' | 'users'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'categories', label: 'Asset Categories', icon: Tags },
  { id: 'access', label: 'Page Access', icon: Eye },
  { id: 'users', label: 'Users', icon: Users },
]

interface SettingsClientProps {
  currentUserId: string
  categories: AssetCategory[]
  categoryUsage: Record<string, number>
  accessRows: RolePageAccess[]
  setupNeeded: boolean
}

export default function SettingsClient({
  currentUserId,
  categories,
  categoryUsage,
  accessRows,
  setupNeeded,
}: SettingsClientProps) {
  const [tab, setTab] = useState<Tab>('categories')

  return (
    <div className="max-w-4xl space-y-4">
      {setupNeeded && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Some settings tables are missing. Run <code className="font-mono">supabase/migrations/add_asset_groups_and_settings.sql</code> in
            the Supabase SQL editor, then reload this page. Until then the built-in defaults are used.
          </p>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'categories' && <CategoriesTab categories={categories} usage={categoryUsage} />}
      {tab === 'access' && <PageAccessTab rows={accessRows} />}
      {tab === 'users' && <UsersTab currentUserId={currentUserId} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Asset categories

function CategoriesTab({ categories, usage }: { categories: AssetCategory[]; usage: Record<string, number> }) {
  const router = useRouter()
  const supabase = createClient()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const known = new Set(categories.map((c) => c.name))
  const unlisted = Object.keys(usage).filter((name) => name && !known.has(name)).sort()

  async function run(action: () => Promise<string | null>) {
    setBusy(true)
    setError('')
    const err = await action()
    setBusy(false)
    if (err) setError(err)
    else router.refresh()
  }

  function addCategory(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" already exists.`)
      return
    }
    const nextOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1
    run(async () => {
      const { error } = await supabase.from('asset_categories').insert({ name: trimmed, sort_order: nextOrder })
      if (!error) setNewName('')
      return error?.message ?? null
    })
  }

  function renameCategory(cat: AssetCategory) {
    const trimmed = editName.trim()
    if (!trimmed || trimmed === cat.name) {
      setEditingId(null)
      return
    }
    if (categories.some((c) => c.id !== cat.id && c.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" already exists.`)
      return
    }
    run(async () => {
      const { error } = await supabase.from('asset_categories').update({ name: trimmed }).eq('id', cat.id)
      if (error) return error.message
      // Carry existing assets over to the new name so nothing is orphaned.
      const { error: assetsError } = await supabase.from('assets').update({ category: trimmed }).eq('category', cat.name)
      if (assetsError) return `Category renamed, but assets could not be updated: ${assetsError.message}`
      setEditingId(null)
      return null
    })
  }

  function deleteCategory(cat: AssetCategory) {
    if (!confirm(`Delete the category "${cat.name}"?`)) return
    run(async () => {
      const { error } = await supabase.from('asset_categories').delete().eq('id', cat.id)
      return error?.message ?? null
    })
  }

  function move(index: number, direction: -1 | 1) {
    const other = categories[index + direction]
    const cat = categories[index]
    if (!other) return
    // Renumber the whole list so ties in sort_order can't make a move a no-op.
    const reordered = [...categories]
    reordered[index] = other
    reordered[index + direction] = cat
    run(async () => {
      const results = await Promise.all(
        reordered.map((c, i) => supabase.from('asset_categories').update({ sort_order: i + 1 }).eq('id', c.id)),
      )
      return results.find((r) => r.error)?.error?.message ?? null
    })
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="font-semibold text-gray-900">Asset Categories</h2>
        <p className="text-sm text-gray-500">
          Used on the asset form, the asset list filter and the Excel import. Renaming a category updates every asset that uses it.
        </p>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="divide-y divide-gray-100">
        {categories.length === 0 && (
          <p className="px-6 py-6 text-center text-sm text-gray-400">No categories yet. Add one below.</p>
        )}
        {categories.map((cat, i) => {
          const count = usage[cat.name] ?? 0
          const editing = editingId === cat.id
          return (
            <div key={cat.id} className="hover-row flex items-center gap-3 px-6 py-3">
              <div className="flex flex-col">
                <button
                  onClick={() => move(i, -1)}
                  disabled={busy || i === 0}
                  aria-label={`Move ${cat.name} up`}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={busy || i === categories.length - 1}
                  aria-label={`Move ${cat.name} down`}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                {editing ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); renameCategory(cat) }}
                    className="flex items-center gap-2"
                  >
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus aria-label="Category name" />
                    <button type="submit" disabled={busy} className="rounded-lg p-1.5 text-green-600 hover:bg-green-50" aria-label="Save">
                      <Check className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Cancel">
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                    <p className="text-xs text-gray-500">{count} asset{count === 1 ? '' : 's'}</p>
                  </>
                )}
              </div>

              {!editing && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingId(cat.id); setEditName(cat.name); setError('') }}
                    disabled={busy}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                    aria-label={`Rename ${cat.name}`}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteCategory(cat)}
                    disabled={busy || count > 0}
                    title={count > 0 ? 'Move or rename the assets using this category before deleting it' : undefined}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                    aria-label={`Delete ${cat.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {unlisted.length > 0 && (
        <div className="border-t border-gray-200 px-6 py-4">
          <p className="text-sm font-medium text-gray-700">In use but not in the list</p>
          <p className="text-xs text-gray-500 mb-2">These categories are on existing assets. Add them so they can be picked on the asset form.</p>
          <div className="flex flex-wrap gap-2">
            {unlisted.map((name) => (
              <button
                key={name}
                onClick={() => addCategory(name)}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
              >
                <Plus className="h-3 w-3" /> {name} ({usage[name]})
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); addCategory(newName) }}
        className="flex items-end gap-3 border-t border-gray-200 px-6 py-4"
      >
        <div className="flex-1">
          <Input label="New category" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Chromatography" />
        </div>
        <Button type="submit" loading={busy} disabled={!newName.trim()}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </form>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page access per role

function buildAccessState(rows: RolePageAccess[]): Record<string, Record<string, boolean>> {
  const state: Record<string, Record<string, boolean>> = {}
  for (const role of CONFIGURABLE_ROLES) {
    state[role.value] = {}
    for (const page of CONFIGURABLE_PAGES) {
      const row = rows.find((r) => r.role === role.value && r.page === page.href)
      state[role.value][page.href] = row ? row.can_view : page.defaultVisible
    }
  }
  return state
}

function PageAccessTab({ rows }: { rows: RolePageAccess[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [access, setAccess] = useState(() => buildAccessState(rows))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function toggle(role: string, page: string) {
    setSaved(false)
    setAccess((prev) => ({ ...prev, [role]: { ...prev[role], [page]: !prev[role][page] } }))
  }

  async function save() {
    setSaving(true)
    setError('')
    const payload = CONFIGURABLE_ROLES.flatMap((role) =>
      CONFIGURABLE_PAGES.map((page) => ({
        role: role.value,
        page: page.href,
        can_view: access[role.value][page.href],
        updated_at: new Date().toISOString(),
      })),
    )
    const { error } = await supabase.from('role_page_access').upsert(payload, { onConflict: 'role,page' })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setSaved(true)
    router.refresh()
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="font-semibold text-gray-900">Page Access</h2>
        <p className="text-sm text-gray-500">
          Choose which pages each role can open. Hidden pages are removed from the sidebar and blocked if visited directly.
          Admins always see everything, including this Settings page.
        </p>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Page</th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Admin</th>
              {CONFIGURABLE_ROLES.map((role) => (
                <th key={role.value} className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  {role.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-6 py-3 text-sm text-gray-900">Dashboard</td>
              <td className="px-6 py-3 text-center"><Check className="mx-auto h-4 w-4 text-gray-400" /></td>
              {CONFIGURABLE_ROLES.map((role) => (
                <td key={role.value} className="px-6 py-3 text-center"><Check className="mx-auto h-4 w-4 text-gray-400" /></td>
              ))}
            </tr>
            {CONFIGURABLE_PAGES.map((page) => (
              <tr key={page.href}>
                <td className="px-6 py-3 text-sm text-gray-900">{page.name}</td>
                <td className="px-6 py-3 text-center"><Check className="mx-auto h-4 w-4 text-gray-400" /></td>
                {CONFIGURABLE_ROLES.map((role) => (
                  <td key={role.value} className="px-6 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={access[role.value][page.href]}
                      onChange={() => toggle(role.value, page.href)}
                      aria-label={`${role.label} can see ${page.name}`}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 border-t border-gray-200 px-6 py-4">
        <Button onClick={save} loading={saving}>Save access</Button>
        {saved && <span className="inline-flex items-center gap-1 text-sm text-green-600"><Check className="h-4 w-4" /> Saved</span>}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Users and their roles

interface AppUser {
  id: string
  email: string
  name: string | null
  role: string
  last_sign_in_at: string | null
  created_at: string
}

function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AppUser[] | null>(null)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/users')
      .then(async (res) => {
        const body = await res.json()
        if (cancelled) return
        if (!res.ok) setError(body.error ?? 'Could not load users.')
        else setUsers(body.users)
      })
      .catch(() => { if (!cancelled) setError('Could not load users.') })
    return () => { cancelled = true }
  }, [])

  async function changeRole(user: AppUser, role: string) {
    setSavingId(user.id)
    setError('')
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, role }),
    })
    const body = await res.json().catch(() => ({}))
    setSavingId(null)
    if (!res.ok) {
      setError(body.error ?? 'Could not update role.')
      return
    }
    setUsers((prev) => prev?.map((u) => (u.id === user.id ? { ...u, role } : u)) ?? null)
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="font-semibold text-gray-900">Users</h2>
        <p className="text-sm text-gray-500">
          Assign each person a role. What each role can see is set on the Page Access tab.
        </p>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {users === null && !error ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : users && users.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Last sign-in</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const isSelf = u.id === currentUserId
                return (
                  <tr key={u.id}>
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {u.name ?? u.email}
                        {isSelf && <Badge className="ml-2 bg-blue-100 text-blue-700">You</Badge>}
                      </p>
                      {u.name && <p className="text-xs text-gray-500">{u.email}</p>}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{u.last_sign_in_at ? formatDate(u.last_sign_in_at) : 'Never'}</td>
                    <td className="px-6 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                        disabled={savingId === u.id || (isSelf && u.role === ADMIN_ROLE)}
                        title={isSelf ? 'You cannot change your own role' : undefined}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                        {!ROLES.some((r) => r.value === u.role) && <option value={u.role}>{u.role}</option>}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : users ? (
        <p className="px-6 py-8 text-center text-sm text-gray-400">No users found.</p>
      ) : null}
    </section>
  )
}
