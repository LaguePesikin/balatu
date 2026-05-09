/** 与小程序 poster-copy 保持一致 */
export function getScoreComment(correctCount: number): string {
  const n = Math.floor(Number(correctCount))
  if (n <= 3) return '看来你被AI骗得不浅……还得练！'
  if (n <= 6) return '已经能看出不少门道了，再多练几局会更稳！'
  if (n <= 9) return '相当犀利！真假照片在你眼里几乎无处藏身。'
  return '神中神！任何AI造假都骗不到你！'
}

export type PosterPayload = {
  nickName: string
  correctCount: number
  totalCount: number
  elapsedSec: string
}

export const POSTER_FOOTER =
  '长按保存图片，欢迎把链接分享给你的朋友一起来玩'

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = []
  let line = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      lines.push(line)
      line = ch
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : [text]
}

/** 在 Canvas 2d 上绘制海报（逻辑像素宽高） */
export function drawPoster(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: PosterPayload
): void {
  ctx.save()
  ctx.fillStyle = '#111827'
  ctx.fillRect(0, 0, width, height)

  const pad = 36
  let y = pad + 28

  ctx.fillStyle = '#93c5fd'
  ctx.font = '600 15px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('扒拉图', width / 2, y)
  y += 44

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 26px system-ui, "PingFang SC", sans-serif'
  ctx.fillText(data.nickName || '玩家', width / 2, y)
  y += 48

  ctx.fillStyle = '#e5e7eb'
  ctx.font = '18px system-ui, "PingFang SC", sans-serif'
  ctx.fillText(`正确率：${data.correctCount}/${data.totalCount}`, width / 2, y)
  y += 36

  ctx.fillStyle = '#fbbf24'
  ctx.font = 'bold 17px system-ui, "PingFang SC", sans-serif'
  const comment = getScoreComment(data.correctCount)
  const commentLines = wrapLines(ctx, comment, width - pad * 2)
  const lh = 26
  commentLines.forEach((ln, i) => {
    ctx.fillText(ln, width / 2, y + i * lh)
  })
  y += commentLines.length * lh + 20

  ctx.fillStyle = '#d1d5db'
  ctx.font = '18px system-ui, sans-serif'
  ctx.fillText(`总耗时：${data.elapsedSec}秒`, width / 2, y)
  y += 56

  ctx.fillStyle = '#9ca3af'
  ctx.font = '13px system-ui, "PingFang SC", sans-serif'
  const footLines = wrapLines(ctx, POSTER_FOOTER, width - pad * 2)
  const flh = 22
  footLines.forEach((ln, i) => {
    ctx.fillText(ln, width / 2, y + i * flh)
  })

  ctx.restore()
}
