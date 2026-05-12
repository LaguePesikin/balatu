/**
 * 将仓库 assets 下的索引复制到 web/src/catalog/，供 Vite 打包（Vercel 仅构建 web 时也能找到）。
 * 若本地无 ../assets（例如纯 web 克隆），则跳过，沿用已提交的 catalog JSON。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(webRoot, '..')

const pairs = [
  [
    path.join(repoRoot, 'assets/all_generated_images/index.json'),
    path.join(webRoot, 'src/catalog/generated-images-index.json'),
  ],
  [
    path.join(repoRoot, 'assets/true_images/index.json'),
    path.join(webRoot, 'src/catalog/true-images-index.json'),
  ],
]

let copied = 0
for (const [src, dest] of pairs) {
  if (!fs.existsSync(src)) {
    console.warn(`[sync-catalog] 跳过（源不存在）: ${src}`)
    continue
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  copied += 1
  console.log(`[sync-catalog] 已复制 → ${path.relative(webRoot, dest)}`)
}

if (copied === 0) {
  console.warn(
    '[sync-catalog] 未复制任何文件；请确保 web/src/catalog/*.json 已提交，或在 monorepo 根执行构建。'
  )
}
