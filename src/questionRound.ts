/**
 * 与小程序相同：每题 1 true + 3 false，10 题共需 10 个不同 true 编号 + 30 个 false 编号。
 * 网页版图片放在 public/images/，路径为 BASE_URL + images/true-n.jpeg
 *
 * 若 false 图少于 30 张：从 1..falseMax 随机放回抽取 30 次凑齐（极端情况下同一局内可能出现重复图）。
 */

export type Question = {
  answerIndex: number
  images: string[]
}

export type BuildResult =
  | { ok: true; questions: Question[] }
  | { ok: false; error: string }

/** 修改此处与 public/images 内实际文件一致 */
export const GAME_CONFIG = {
  TRUE_IMAGE_MAX_INDEX: 10,
  FALSE_IMAGE_MAX_INDEX: 30,
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

function sampleUnique(maxIndex: number, count: number): number[] | null {
  if (maxIndex < count) return null
  const pool = Array.from({ length: maxIndex }, (_, i) => i + 1)
  shuffle(pool)
  return pool.slice(0, count)
}

/** 随机放回抽取 count 个，编号范围 1..maxIndex */
function sampleWithReplacement(maxIndex: number, count: number): number[] {
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    out.push(Math.floor(Math.random() * maxIndex) + 1)
  }
  return out
}

function imageUrl(prefix: string, kind: 'true' | 'false', index: number): string {
  return `${prefix}${kind}-${index}.jpeg`
}

function imagesPrefix(): string {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? `${base}images/` : `${base}/images/`
}

export function buildQuestionRound(config = GAME_CONFIG): BuildResult {
  const prefix = imagesPrefix()

  const trueMax = config.TRUE_IMAGE_MAX_INDEX
  const falseMax = config.FALSE_IMAGE_MAX_INDEX

  if (trueMax < 10) {
    return { ok: false, error: 'TRUE_POOL_SMALL' }
  }
  if (falseMax < 1) {
    return { ok: false, error: 'FALSE_POOL_EMPTY' }
  }

  const trueSamples = sampleUnique(trueMax, 10)
  if (!trueSamples) {
    return { ok: false, error: 'TRUE_POOL_SMALL' }
  }

  let falseSamples: number[]
  if (falseMax >= 30) {
    const f = sampleUnique(falseMax, 30)
    if (!f) return { ok: false, error: 'FALSE_POOL_SMALL' }
    falseSamples = f
  } else {
    falseSamples = sampleWithReplacement(falseMax, 30)
  }

  const questions: Question[] = []

  for (let q = 0; q < 10; q++) {
    const truePath = imageUrl(prefix, 'true', trueSamples[q])
    const falses = [
      imageUrl(prefix, 'false', falseSamples[q * 3]),
      imageUrl(prefix, 'false', falseSamples[q * 3 + 1]),
      imageUrl(prefix, 'false', falseSamples[q * 3 + 2]),
    ]

    type Slot = { kind: 't' | 'f'; src: string }
    const slots: Slot[] = [{ kind: 't', src: truePath }, ...falses.map((src) => ({ kind: 'f' as const, src }))]
    shuffle(slots)

    let answerIndex = -1
    const images = slots.map((s, idx) => {
      if (s.kind === 't') answerIndex = idx
      return s.src
    })

    questions.push({ answerIndex, images })
  }

  return { ok: true, questions }
}
