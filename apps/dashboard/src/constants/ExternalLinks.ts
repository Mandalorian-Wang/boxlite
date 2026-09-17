/**
 * Copyright 2025 Daytona Platforms Inc.
 * Modified by BoxLite AI, 2025-2026
 * SPDX-License-Identifier: AGPL-3.0
 */

/**
 * External URLs for BoxLite resources
 */
export const BOXLITE_DOCS_URL = 'https://docs.boxlite.ai'
export const BOXLITE_SLACK_URL = 'https://go.boxlite.ai/discord'

/**
 * Every deep link into the docs site, named in one place.
 *
 * Two kinds of rot start when these are written at the call site. Paths that
 * no longer exist: five links pointed at `/en/…`, a scheme the docs site has
 * never served. And link text that promises a page the href does not open:
 * "check out the API Key setup guide" and "Read the Volumes guide" both went
 * to the docs home, leaving the reader to search for what the sentence had
 * already named. One list can be diffed against the sitemap; call sites
 * cannot.
 */
export const DOCS_LINKS = {
  apiKeys: `${BOXLITE_DOCS_URL}/cloud/api-keys`,
  volumes: `${BOXLITE_DOCS_URL}/cloud/volumes`,
} as const
