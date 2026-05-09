import './style.css'
import { buildQuestionRound, type Question } from './questionRound'
import { drawPoster, type PosterPayload } from './poster'

type Phase = 'landing' | 'playing' | 'poster'

const app = document.querySelector<HTMLDivElement>('#app')!

const POSTER_W = 375
const POSTER_H = 720

const state: {
  phase: Phase
  nickName: string
  questions: Question[]
  currentIndex: number
  selectedChoice: number | null
  correctCount: number
  startTime: number
  previewSrc: string | null
  posterPayload: PosterPayload | null
} = {
  phase: 'landing',
  nickName: '',
  questions: [],
  currentIndex: 0,
  selectedChoice: null,
  correctCount: 0,
  startTime: 0,
  previewSrc: null,
  posterPayload: null,
}

function explain(err: string): string {
  if (err === 'TRUE_POOL_SMALL') return 'true 图数量不足：至少需要 true-1～true-10 放在 images 目录。'
  if (err === 'FALSE_POOL_EMPTY') return '未找到 false 图：请将 false-x.jpeg 放入 images 目录。'
  if (err === 'FALSE_POOL_SMALL') return 'false 图数量不足。'
  return '题目加载失败。'
}

function render() {
  if (state.phase === 'landing') {
    renderLanding()
    return
  }
  if (state.phase === 'poster') {
    renderPosterView()
    return
  }
  renderGameShell()
}

function renderLanding() {
  app.innerHTML = `
    <div class="landing">
      <h1>扒拉图 🔍</h1>
      <p class="sub">测试你分辨 AI 生成图片的能力</p>
      <label class="nick-label" for="nick-input">昵称</label>
      <input
        id="nick-input"
        class="nick-field"
        type="text"
        maxlength="20"
        placeholder="填写昵称"
      />
      <div class="rules">
        <p>总共 <strong>10</strong> 题，每题四张照片，其中仅有一张是真实拍摄</p>
        <p>其余三张为 AI 生成的</p>
        <p>你的目标是找出唯一真实的那张</p>
        <p>答题不限时；结束后生成正确率和耗时结果</p>
        <p>欢迎分享链接给朋友们一起玩</p>
      </div>
      <button type="button" class="btn-primary" id="btn-start">开始挑战</button>
    </div>
  `
  const input = document.getElementById('nick-input') as HTMLInputElement
  input.value = state.nickName
  input.addEventListener('input', () => {
    state.nickName = input.value.trim()
  })

  document.getElementById('btn-start')!.onclick = () => {
    const nick = (input.value || '').trim()
    if (!nick) {
      alert('请先输入昵称')
      return
    }
    state.nickName = nick
    const round = buildQuestionRound()
    if (!round.ok) {
      alert(explain(round.error))
      return
    }
    state.phase = 'playing'
    state.questions = round.questions
    state.currentIndex = 0
    state.selectedChoice = null
    state.correctCount = 0
    state.startTime = Date.now()
    state.previewSrc = null
    render()
  }
}

function currentQuestion(): Question {
  return state.questions[state.currentIndex]
}

function renderGameShell() {
  const q = currentQuestion()
  const labels = ['A', 'B', 'C', 'D']
  const previewOpen = state.previewSrc !== null

  app.innerHTML = `
    <div class="game-root">
      <div class="game-top">
        <span>第 ${state.currentIndex + 1} / ${state.questions.length} 题</span>
      </div>
      <div class="game-title">哪张照片是真实拍摄的？</div>
      <div class="game-hint">点击图片可放大查看</div>
      <div class="grid">
        ${q.images
          .map(
            (src, i) => `
          <div class="grid-cell">
            <div class="pic-frame ${state.selectedChoice === i ? 'selected' : ''}">
              <div class="pic-crop">
                <img class="pic" src="${src}" alt="${labels[i]}" data-preview-index="${i}" loading="lazy" />
              </div>
            </div>
            <span class="pic-label">${labels[i]}</span>
          </div>`
          )
          .join('')}
      </div>
      <div class="choices">
        ${[0, 1, 2, 3]
          .map(
            (i) => `
          <button type="button" class="choice-btn ${state.selectedChoice === i ? 'active' : ''}" data-choice="${i}">${labels[i]}</button>`
          )
          .join('')}
      </div>
      <button type="button" class="next-btn" id="btn-next" ${state.selectedChoice === null ? 'disabled' : ''}>下一题</button>
    </div>
    ${
      previewOpen
        ? `
    <div class="preview-mask" id="preview-mask" role="dialog">
      <div class="preview-stage" id="preview-stage">
        <img class="preview-img" src="${state.previewSrc}" alt="" />
      </div>
      <div class="preview-tip">点击画面关闭</div>
    </div>`
        : ''
    }
  `

  app.querySelectorAll('.pic').forEach((img) => {
    img.addEventListener('click', (e) => {
      const i = Number((e.currentTarget as HTMLElement).dataset.previewIndex)
      state.previewSrc = q.images[i]
      renderGameShell()
    })
  })

  app.querySelectorAll('[data-choice]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      state.selectedChoice = Number((e.currentTarget as HTMLElement).dataset.choice)
      renderGameShell()
    })
  })

  document.getElementById('btn-next')!.onclick = () => goNext()

  if (previewOpen) {
    const mask = document.getElementById('preview-mask')!
    const stage = document.getElementById('preview-stage')!
    const close = () => {
      state.previewSrc = null
      renderGameShell()
    }
    mask.addEventListener('click', close)
    stage.addEventListener('click', (e) => {
      e.stopPropagation()
      close()
    })
  }
}

function goNext() {
  if (state.selectedChoice === null) return
  const question = currentQuestion()
  if (state.selectedChoice === question.answerIndex) {
    state.correctCount += 1
  }

  const next = state.currentIndex + 1
  if (next >= state.questions.length) {
    finishChallenge()
    return
  }

  state.currentIndex = next
  state.selectedChoice = null
  renderGameShell()
}

function finishChallenge() {
  const elapsedMs = Date.now() - state.startTime
  const elapsedSec = (elapsedMs / 1000).toFixed(3)

  state.posterPayload = {
    nickName: state.nickName || '玩家',
    correctCount: state.correctCount,
    totalCount: 10,
    elapsedSec,
  }
  state.phase = 'poster'
  render()
}

function renderPosterView() {
  const data = state.posterPayload!
  app.innerHTML = `
    <div class="poster-page">
      <h2 class="poster-heading">成绩单海报</h2>
      <canvas id="poster-canvas" class="poster-canvas-el" width="${POSTER_W}" height="${POSTER_H}"></canvas>
      <div class="poster-actions">
        <button type="button" class="btn-save-img" id="btn-save-png">保存为图片</button>
        <button type="button" class="btn-home" id="btn-home">返回首页</button>
      </div>
    </div>
  `

  const canvas = document.getElementById('poster-canvas') as HTMLCanvasElement
  const ctx = canvas.getContext('2d')!
  drawPoster(ctx, POSTER_W, POSTER_H, data)

  document.getElementById('btn-save-png')!.onclick = () => {
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `扒拉图成绩单-${data.nickName}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  document.getElementById('btn-home')!.onclick = () => {
    state.phase = 'landing'
    state.questions = []
    state.posterPayload = null
    state.nickName = ''
    render()
  }
}

render()
