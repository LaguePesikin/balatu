import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 允许读取仓库根 assets/ 下的 index.json（与 web 并列） */
const repoRoot = path.resolve(__dirname, '..')

export default defineConfig({
  base: './',
  server: {
    fs: {
      allow: [__dirname, repoRoot],
    },
  },
})
