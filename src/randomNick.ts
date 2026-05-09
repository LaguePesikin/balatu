/** 昵称：{个性}的{color}{蔬果} */

const PERSONALITY = [
  '狂野',
  '害羞',
  '佛系',
  '呆萌',
  '傲娇',
  '高冷',
  '倔强',
  '温柔',
  '莽撞',
  '神秘',
  '忧郁',
  '慵懒',
  '腹黑',
  '憨厚',
  '叛逆',
  '憨憨',
]

const COLORS = [
  '金色',
  '银色',
  '深蓝',
  '墨色',
  '雪白',
  '粉红',
  '碧绿',
  '湛蓝',
  '绛紫',
  '炭灰',
  '暖橙',
  '琥珀',
  '翠绿',
  '薄荷',
  '蔷薇',
  '雾蓝',
  '奶白',
  '酒红',
]

const FRUITS_AND_VEG = [
  '番茄',
  '土豆',
  '草莓',
  '芦笋',
  '秋葵',
  '黄瓜',
  '蜜桃',
  '山竹',
  '竹笋',
  '甘蓝',
  '荸荠',
  '莴笋',
  '冬瓜',
  '苦瓜',
  '茄子',
  '樱桃',
  '芒果',
  '菠萝',
  '柠檬',
  '石榴',
  '杨桃',
]

function pick(arr: readonly string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]!
}

export function generateRandomNick(maxLen = 20): string {
  const s = `${pick(PERSONALITY)}的${pick(COLORS)}${pick(FRUITS_AND_VEG)}`
  return s.length <= maxLen ? s : s.slice(0, maxLen)
}
