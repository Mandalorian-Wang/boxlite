/*
 * Copyright 2025 Daytona Platforms Inc.
 * Modified by BoxLite AI, 2025-2026
 * SPDX-License-Identifier: AGPL-3.0
 */

import boxliteLogoStacked from '@/assets/boxlite-logo-stacked.png'
import LoadingFallback from '@/components/LoadingFallback'
import { RoutePath } from '@/enums/RoutePath'
import { useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { Navigate, useLocation } from 'react-router-dom'

const LandingPage: React.FC = () => {
  const { signinRedirect, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)

  if (isLoading) {
    return <LoadingFallback />
  }

  if (isAuthenticated) {
    return <Navigate to={`${RoutePath.DASHBOARD}${location.search}`} replace />
  }

  // Every entry point hands off to the OIDC hosted login (no client-side auth API).
  const go = () => {
    void signinRedirect({
      state: { returnTo: RoutePath.DASHBOARD + location.search },
      ...(email ? { login_hint: email } : {}),
    })
  }

  const isLogin = mode === 'login'

  // The auth screen is always dark, regardless of the user's saved theme. Scoping the
  // `dark` class here makes the design tokens resolve to their dark values for this
  // subtree only (the rest of the app still follows ThemeContext).
  return (
    <div className="dark flex min-h-screen flex-col overflow-y-auto bg-background font-mono text-[13px] text-foreground">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          {/* brand */}
          <div className="mb-[30px] text-center">
            <img
              src={boxliteLogoStacked}
              alt="BoxLite"
              className="mx-auto mb-[14px] block h-[104px] w-auto object-contain"
            />
            <p className="m-0 text-[12px] tracking-[0.3px] text-muted-foreground">
              Agent cloud — secure compute for AI agents.
            </p>
          </div>

          {/* tabs */}
          <div className="mb-6 flex border-b border-border">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`-mb-px flex-1 border-b-2 pb-[13px] text-center text-[12px] tracking-[1.5px] transition-colors ${
                isLogin ? 'border-brand text-foreground' : 'border-transparent text-muted-foreground'
              }`}
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`-mb-px flex-1 border-b-2 pb-[13px] text-center text-[12px] tracking-[1.5px] transition-colors ${
                !isLogin ? 'border-brand text-foreground' : 'border-transparent text-muted-foreground'
              }`}
            >
              SIGN UP
            </button>
          </div>

          {/* SSO */}
          <div className="grid grid-cols-2 gap-[10px]">
            <button
              type="button"
              onClick={go}
              className="flex items-center justify-center gap-[9px] border border-border px-3 py-3 text-[12.5px] transition-colors hover:border-muted-foreground hover:bg-card"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
                />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.36 12 4.75z"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={go}
              className="flex items-center justify-center gap-[9px] border border-border px-3 py-3 text-[12.5px] transition-colors hover:border-muted-foreground hover:bg-card"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-1.8c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0C17 4.4 18 4.7 18 4.7c.6 1.6.2 2.9.1 3.2.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
              </svg>
              GitHub
            </button>
          </div>

          {/* divider */}
          <div className="my-[22px] flex items-center gap-[14px]">
            <div className="h-px flex-1 bg-border" />
            <span className="whitespace-nowrap text-[9.5px] uppercase tracking-[1.5px] text-muted-foreground">
              Or continue with email
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* email */}
          <label className="mb-[7px] block text-[10px] uppercase tracking-[1.5px] text-muted-foreground">
            Email address
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            className="mb-4 block w-full border border-border bg-card px-[14px] py-[13px] text-[13px] text-foreground outline-none focus:border-brand"
          />

          {/* password */}
          <label className="mb-[7px] block text-[10px] uppercase tracking-[1.5px] text-muted-foreground">Password</label>
          <div className="relative mb-4">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              className="block w-full border border-border bg-card px-[14px] py-[13px] pr-[62px] text-[13px] text-foreground outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-0 top-0 flex h-full items-center px-[14px] text-[10.5px] tracking-[1px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPw ? 'HIDE' : 'SHOW'}
            </button>
          </div>

          {/* signup confirm */}
          {!isLogin && (
            <>
              <label className="mb-[7px] block text-[10px] uppercase tracking-[1.5px] text-muted-foreground">
                Confirm password
              </label>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                className="mb-4 block w-full border border-border bg-card px-[14px] py-[13px] text-[13px] text-foreground outline-none focus:border-brand"
              />
            </>
          )}

          {/* extras */}
          {isLogin ? (
            <div className="mb-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setRemember((v) => !v)}
                className="flex select-none items-center gap-[9px]"
              >
                <span
                  className="flex size-4 items-center justify-center border transition-colors"
                  style={{
                    borderColor: remember ? 'hsl(var(--brand))' : 'hsl(var(--border))',
                    background: remember ? 'hsl(var(--brand))' : 'transparent',
                  }}
                >
                  {remember && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--background))" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </span>
                <span className="whitespace-nowrap text-[12px] text-muted-foreground">Remember me</span>
              </button>
              <button type="button" onClick={go} className="text-[12px] text-muted-foreground hover:text-foreground">
                Forgot password?
              </button>
            </div>
          ) : (
            <p className="mb-5 text-[11.5px] leading-relaxed text-muted-foreground">
              By creating an account you agree to our <span className="text-foreground underline">Terms</span> &amp;{' '}
              <span className="text-foreground underline">Privacy Policy</span>.
            </p>
          )}

          {/* primary */}
          <button
            type="button"
            onClick={go}
            className="flex w-full items-center justify-center gap-[9px] bg-primary px-3 py-[14px] text-[12.5px] font-semibold uppercase tracking-[1.5px] text-primary-foreground transition-opacity hover:opacity-90"
          >
            {isLogin ? 'Sign in' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
