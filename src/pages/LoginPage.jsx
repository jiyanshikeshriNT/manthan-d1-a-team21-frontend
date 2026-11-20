import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { LockKeyhole } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import { Input } from '../components/ui/Field'
import { useLogin } from '../api/hooks'
import { ROLE_HOME, setSession } from '../auth/session'
import { useSession } from '../auth/useSession'

// Only allow same-app paths in ?next= (prevents open redirects).
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null)

export default function LoginPage() {
  const session = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const login = useLogin()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})

  if (session) return <Navigate to={safeNext(params.get('next')) ?? ROLE_HOME[session.role]} replace />

  function submit(e) {
    e.preventDefault()
    const next = {}
    if (!form.email.trim()) next.email = 'Enter your work email.'
    if (!form.password) next.password = 'Enter your password.'
    setErrors(next)
    if (Object.keys(next).length || login.isPending) return

    login.mutate(
      { email: form.email.trim(), password: form.password },
      {
        onSuccess: ({ token, role }) => {
          setSession({ token, role })
          navigate(safeNext(params.get('next')) ?? ROLE_HOME[role], { replace: true })
        },
      },
    )
  }

  const failed = login.error
  return (
    <div className="mx-auto grid max-w-md gap-6 pt-4 sm:pt-10">
      <div className="grid gap-2 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
          <LockKeyhole className="size-6" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-semibold">Staff sign in</h1>
        <p className="text-muted">Warehouse, finance and operations teams.</p>
      </div>
      <Card>
        <form noValidate onSubmit={submit} className="grid gap-4">
          {failed && (
            <Alert tone="danger" title="Sign in failed">
              {failed.status === 429
                ? 'Too many attempts. Please wait a minute and try again.'
                : failed.status === 401 || failed.status === 400
                  ? 'The email or password is incorrect.'
                  : failed.message}
            </Alert>
          )}
          <Input
            label="Work email"
            type="email"
            autoComplete="username"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
          />
          <Button type="submit" block loading={login.isPending}>
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
