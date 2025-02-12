/**
 * This file is used to mock the `@actions/core` module in tests.
 */
import { vi } from 'vitest'

export const debug = vi.fn()
export const isDebug = vi.fn()
export const error = vi.fn()
export const info = vi.fn()
export const getInput = vi.fn()
export const setOutput = vi.fn()
export const setFailed = vi.fn()
export const warning = vi.fn()
export const startGroup = vi.fn()
export const endGroup = vi.fn()
export const group = vi.fn()
