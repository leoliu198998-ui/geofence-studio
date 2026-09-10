import '@testing-library/jest-dom/vitest'
import { webcrypto } from 'node:crypto'

// jsdom 不带 Web Crypto subtle，用 Node 的 webcrypto 补齐（hashPassword 依赖）
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}
