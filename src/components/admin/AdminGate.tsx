'use client';

import { useState } from 'react';
import { useAdminAuth } from '@/lib/admin-client';

export function AdminGate({
  children,
}: {
  children: (ctx: { token: string; signOut: () => void }) => React.ReactNode;
}) {
  const { state, signIn, signOut } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (state.status === 'loading') {
    return <Centered>Loading…</Centered>;
  }

  if (state.status === 'unconfigured') {
    return (
      <Centered>
        <h1 className="font-display text-2xl">Admin</h1>
        <p className="mt-3 max-w-md text-sm text-muted">
          Supabase isn&apos;t configured yet. Set{' '}
          <code>NEXT_PUBLIC_SUPABASE_URL</code>,{' '}
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> and{' '}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>.env.local</code>, then
          create an admin user in the Supabase dashboard.
        </p>
      </Centered>
    );
  }

  if (state.status === 'signed-out') {
    return (
      <Centered>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr('');
            const { error } = await signIn(email, password);
            setBusy(false);
            if (error) setErr(error);
          }}
          className="w-full max-w-sm space-y-4"
        >
          <h1 className="font-display text-3xl">Admin</h1>
          <input
            type="email"
            placeholder="Email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-line bg-paper px-4 py-3 outline-none focus:border-accent"
          />
          <input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-line bg-paper px-4 py-3 outline-none focus:border-accent"
          />
          {err && <p className="text-sm text-accent">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-ink px-6 py-3 text-sm text-surface disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </Centered>
    );
  }

  return <>{children({ token: state.session.access_token, signOut })}</>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-start justify-center gap-2 px-6 py-20 md:px-10">
      {children}
    </div>
  );
}
