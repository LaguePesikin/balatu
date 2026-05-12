/**
 * 网页版题目图（UUID + 索引驱动）：
 * - 假图：`../assets/all_generated_images/index.json`（按 difficulty_from_detector 分桶）
 * - 真图：`../assets/true_images/index.json`
 * - URL：需配置 COS（VITE_COS_BUCKET + VITE_COS_REGION）或 VITE_IMAGE_CDN_BASE；
 *   对象路径 = bucket_relative_path 去掉 `assets/` 前缀（与 COS 上 easy/xxx.png 一致）
 * - 真图目录：VITE_COS_TRUE_FOLDER（默认 true_images）
 *
 * 题量：各难度「希望题数」与 min(真图数, floor(假图数/3)) 取小，至少 1 题。
 * hell 使用 extreme 假图池。
 */

import generatedCatalogJson from '../../assets/all_generated_images/index.json'
import trueCatalogJson from '../../assets/true_images/index.json'

export type Question = {
  answerIndex: number
  images: string[]
}

export type BuildResult =
  | { ok: true; questions: Question[] }
  | { ok: false; error: string }

export type GameDifficulty = 'easy' | 'medium' | 'hard' | 'hell'

type GeneratedEntry = {
  uid: string
  filename: string
  bucket_relative_path?: string | null
  difficulty_from_detector?: string | null
}

type GeneratedCatalog = {
  entries: GeneratedEntry[]
}

type TrueEntry = {
  uid: string
  filename: string
}

type TrueCatalog = {
  entries: TrueEntry[]
}

const GENERATED = generatedCatalogJson as GeneratedCatalog
const TRUE_CAT = trueCatalogJson as TrueCatalog

/** 各难度希望题数上限；实际题数会受池子大小限制 */
export const DESIRED_QUESTIONS_PER_ROUND: Record<GameDifficulty, number> = {
  easy: 5,
  medium: 8,
  hard: 10,
  hell: 10,
}

/** 兼容旧引用：已不再使用固定 max index */
export const GAME_CONFIG = {
  DESIRED_QUESTIONS_PER_ROUND,
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

function sampleUniqueFrom<T>(arr: T[], count: number): T[] | null {
  if (arr.length < count) return null
  const copy = [...arr]
  shuffle(copy)
  return copy.slice(0, count)
}

function sampleWithReplacement<T>(arr: T[], count: number): T[] {
  const out: T[] = []
  for (let i = 0; i < count; i++) {
    out.push(arr[Math.floor(Math.random() * arr.length)])
  }
  return out
}

/** hell 在 COS 上与文件夹 extreme 对应 */
function difficultyFolder(difficulty: GameDifficulty): string {
  if (difficulty === 'hell') {
    const folder = (import.meta.env.VITE_COS_HELL_FOLDER as string | undefined)?.trim()
    return folder || 'extreme'
  }
  return difficulty
}

function remoteStorageRoot(): string | null {
  const explicit = (import.meta.env.VITE_IMAGE_CDN_BASE as string | undefined)?.trim()
  if (explicit) {
    return explicit.replace(/\/+$/, '')
  }
  const bucket = (import.meta.env.VITE_COS_BUCKET as string | undefined)?.trim()
  const region = (import.meta.env.VITE_COS_REGION as string | undefined)?.trim()
  if (bucket && region) {
    return `https://${bucket}.cos.${region}.myqcloud.com`
  }
  return null
}

/** COS 对象键：去掉 catalog 里的 assets/ 前缀 */
function falseObjectKey(entry: GeneratedEntry, tier: string): string {
  const br = entry.bucket_relative_path?.trim()
  if (br) {
    return br.replace(/^assets\//, '').replace(/^\/+/, '')
  }
  return `${tier}/${entry.filename}`
}

function trueObjectKey(entry: TrueEntry): string {
  const folder = (import.meta.env.VITE_COS_TRUE_FOLDER as string | undefined)?.trim() || 'true_images'
  return `${folder.replace(/^\/+|\/+$/g, '')}/${entry.filename}`
}

function falseImageUrl(root: string, entry: GeneratedEntry, tier: string): string {
  const key = falseObjectKey(entry, tier)
  return `${root}/${key}`
}

function trueImageUrl(root: string, entry: TrueEntry): string {
  return `${root}/${trueObjectKey(entry)}`
}

function poolFalseForTier(tier: string): GeneratedEntry[] {
  return (GENERATED.entries || []).filter(
    (e) => e.filename && (e.difficulty_from_detector || '') === tier
  )
}

function poolTrueAll(): TrueEntry[] {
  return (TRUE_CAT.entries || []).filter((e) => e.filename)
}

function chooseRoundSize(difficulty: GameDifficulty, trueLen: number, falseLen: number): number {
  const want = DESIRED_QUESTIONS_PER_ROUND[difficulty] ?? 10
  const maxByFalse = Math.floor(falseLen / 3)
  return Math.max(1, Math.min(want, trueLen, maxByFalse))
}

export function buildQuestionRound(
  _legacy: typeof GAME_CONFIG | undefined,
  options?: { difficulty?: GameDifficulty }
): BuildResult {
  const difficulty: GameDifficulty = options?.difficulty ?? 'hard'
  const root = remoteStorageRoot()
  if (!root) {
    return { ok: false, error: 'CONFIG_CATALOG_NEED_REMOTE' }
  }

  const tier = difficultyFolder(difficulty)
  const falsePool = poolFalseForTier(tier)
  const truePool = poolTrueAll()

  if (truePool.length < 1) {
    return { ok: false, error: 'TRUE_POOL_EMPTY' }
  }
  if (falsePool.length < 1) {
    return { ok: false, error: 'FALSE_POOL_EMPTY' }
  }

  const n = chooseRoundSize(difficulty, truePool.length, falsePool.length)

  const trueSamples = sampleUniqueFrom(truePool, n)
  if (!trueSamples) {
    return { ok: false, error: 'TRUE_POOL_SMALL' }
  }

  const needFalse = n * 3
  let falseSamples: GeneratedEntry[]
  if (falsePool.length >= needFalse) {
    const f = sampleUniqueFrom(falsePool, needFalse)
    if (!f) return { ok: false, error: 'FALSE_POOL_SMALL' }
    falseSamples = f
  } else {
    falseSamples = sampleWithReplacement(falsePool, needFalse)
  }

  const questions: Question[] = []

  for (let q = 0; q < n; q++) {
    const tEntry = trueSamples[q]
    const f0 = falseSamples[q * 3]
    const f1 = falseSamples[q * 3 + 1]
    const f2 = falseSamples[q * 3 + 2]

    const truePath = trueImageUrl(root, tEntry)
    const falses = [falseImageUrl(root, f0, tier), falseImageUrl(root, f1, tier), falseImageUrl(root, f2, tier)]

    type Slot = { kind: 't' | 'f'; src: string }
    const slots: Slot[] = [{ kind: 't', src: truePath }, ...falses.map((src) => ({ kind: 'f' as const, src }))]
    shuffle(slots)
    if (difficulty === 'hell') {
      shuffle(slots)
    }

    let answerIndex = -1
    const images = slots.map((s, idx) => {
      if (s.kind === 't') answerIndex = idx
      return s.src
    })

    questions.push({ answerIndex, images })
  }

  return { ok: true, questions }
}

/** 供 UI 展示当前难度池子规模 */
export function getCatalogPoolStats(difficulty: GameDifficulty): {
  tier: string
  falseCount: number
  trueCount: number
  desired: number
  actualN: number
} {
  const tier = difficultyFolder(difficulty)
  const falsePool = poolFalseForTier(tier)
  const truePool = poolTrueAll()
  const desired = DESIRED_QUESTIONS_PER_ROUND[difficulty] ?? 10
  const actualN = chooseRoundSize(difficulty, truePool.length, falsePool.length)
  return {
    tier,
    falseCount: falsePool.length,
    trueCount: truePool.length,
    desired,
    actualN,
  }
}
