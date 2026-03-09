'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Shield } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/'
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(redirectTo)
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 px-4">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
            Aera Asset Manager
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to your account to continue
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              loading={loading}
              className="w-full"
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
