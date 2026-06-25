/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('global modal transitions', () => {
  it('does not let a leaving modal intercept immediate clicks behind it', () => {
    const cssPath = join(process.cwd(), 'src/app/styles/index.css')
    const css = readFileSync(cssPath, 'utf8')

    expect(css).toMatch(/\.modal-fade-leave-active\s*\{[^}]*pointer-events:\s*none;/s)
  })
})
