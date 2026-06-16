/*
 * Copyright 2025 Daytona Platforms Inc.
 * Modified by BoxLite AI, 2025-2026
 * SPDX-License-Identifier: AGPL-3.0
 */

// Drop-in replacement for react-oidc-context's <AuthProvider> used only by the
// MSW mock target. It reports a fixed authenticated session so the dashboard
// renders without a real OIDC server or login round-trip. All sign-in/out
// actions are no-ops; tokens are never sent anywhere (MSW intercepts requests).

import type { ReactNode } from 'react'
import { AuthContext, type AuthContextProps } from 'react-oidc-context'
import type { User } from 'oidc-client-ts'
import { MOCK_USER } from './fixtures'

const mockUser = {
  access_token: 'mock-access-token',
  token_type: 'Bearer',
  profile: {
    sub: MOCK_USER.sub,
    name: MOCK_USER.name,
    email: MOCK_USER.email,
    email_verified: true,
    picture: MOCK_USER.picture,
  },
  expired: false,
  scopes: ['openid', 'profile', 'email'],
} as unknown as User

const noop = async () => undefined

const mockAuth = {
  isAuthenticated: true,
  isLoading: false,
  activeNavigator: undefined,
  error: undefined,
  user: mockUser,
  settings: {},
  events: {},
  signinRedirect: noop,
  signinSilent: noop,
  signinPopup: noop,
  signinResourceOwnerCredentials: noop,
  signoutRedirect: noop,
  signoutPopup: noop,
  signoutSilent: noop,
  removeUser: noop,
  revokeTokens: noop,
  startSilentRenew: () => undefined,
  stopSilentRenew: () => undefined,
  clearStaleState: noop,
  querySessionStatus: noop,
} as unknown as AuthContextProps

export function MockAuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={mockAuth}>{children}</AuthContext.Provider>
}
