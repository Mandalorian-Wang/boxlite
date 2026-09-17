/*
 * Modified by BoxLite AI, 2026
 * SPDX-License-Identifier: AGPL-3.0
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return name === 'mocks' ? [] : sourceFiles(full)
    if (!/\.tsx?$/.test(name) || /\.(test|stories)\.tsx?$/.test(name)) return []
    return [full]
  })
}

/**
 * A docs URL written at the call site: a path appended to the constant, or the
 * host spelled out at all. `href={BOXLITE_DOCS_URL}` is fine — that is the
 * root, reached through the name.
 */
const INLINE_DOCS_URL = /BOXLITE_DOCS_URL\}\/[a-zA-Z0-9/_-]+|https:\/\/docs\.boxlite\.ai[a-zA-Z0-9/_-]*/g

describe('docs links', () => {
  /**
   * Docs URLs belong in ExternalLinks.ts, not at the call site. Both forms rot
   * there, and both did:
   *
   * - Five links built as `${BOXLITE_DOCS_URL}/en/…`, a path scheme
   *   docs.boxlite.ai has never served. All 404'd, across three box tabs.
   * - Two links whose text named a page the href did not open — "check out the
   *   API Key setup guide" and "Read the Volumes guide" both went to the docs
   *   home, with `/cloud/api-keys` and `/cloud/volumes` sitting right there.
   *
   * One list can be diffed against the sitemap, and a reviewer can see the
   * whole surface at once. Scattered string literals offer neither.
   */
  it('are never written inline', () => {
    // Where docs URLs are supposed to be declared.
    const home = join(__dirname, 'ExternalLinks.ts')

    const offenders = sourceFiles(SRC)
      .filter((file) => file !== home)
      .flatMap((file) => {
        const inline = readFileSync(file, 'utf8').match(INLINE_DOCS_URL) ?? []
        return inline.map((hit) => `${relative(SRC, file)}: ${hit}`)
      })

    expect(
      offenders,
      `Confirm each URL resolves on docs.boxlite.ai and matches the link text, then declare it in constants/ExternalLinks.ts:\n${offenders.join('\n')}`,
    ).toEqual([])
  })
})
