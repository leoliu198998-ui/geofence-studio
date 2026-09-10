import '@testing-library/jest-dom/vitest'
import { webcrypto } from 'node:crypto'

// jsdom 的 Web Crypto 能力不全，用 Node 的 webcrypto 补齐
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}
