const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-theme-button-sounds-v2');
const START = '/* M-CROSS_THEME_BUTTON_SOUNDS_V2_START */';
const END = '/* M-CROSS_THEME_BUTTON_SOUNDS_V2_END */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。crossmeasure フォルダで実行してください。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');

if (source.includes(START)) {
  console.log('SKIP: 修正版のテーマ別クリック音はすでに追加されています。');
  process.exit(0);
}

// JSXファイルの最低限の安全確認
if (!source.includes('function App') && !source.includes('export default function')) {
  console.error('ERROR: Appコンポーネントを確認できなかったため、書き換えを中止しました。');
  process.exit(1);
}

const injection = String.raw`

${START}
function mCrossGetThemeName() {
  const className = document.querySelector('.app')?.className || ''
  if (className.includes('theme-cyber')) return 'cyber'
  if (className.includes('theme-retro')) return 'retro'
  if (className.includes('theme-galaxy')) return 'galaxy'
  if (className.includes('theme-sakura')) return 'sakura'
  if (className.includes('theme-ice')) return 'ice'
  if (className.includes('theme-forest')) return 'forest'
  if (className.includes('theme-luxury')) return 'luxury'
  if (className.includes('theme-pop')) return 'pop'
  if (className.includes('theme-dark')) return 'dark'
  return 'beige'
}

function mCrossIsSoundOff() {
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key) continue
      const raw = localStorage.getItem(key)
      if (!raw || raw[0] !== '{') continue
      try {
        const value = JSON.parse(raw)
        if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'sound')) {
          return value.sound === 'off'
        }
      } catch {}
    }
  } catch {}
  return false
}

function mCrossPlayButtonSound() {
  if (mCrossIsSoundOff()) return

  const sounds = {
    beige:  { frequency: 620,  type: 'sine',     gain: 0.035, duration: 0.055 },
    dark:   { frequency: 360,  type: 'triangle', gain: 0.040, duration: 0.060 },
    pop:    { frequency: 880,  type: 'triangle', gain: 0.045, duration: 0.075 },
    cyber:  { frequency: 1240, type: 'square',   gain: 0.025, duration: 0.050 },
    luxury: { frequency: 520,  type: 'sine',     gain: 0.030, duration: 0.070 },
    sakura: { frequency: 760,  type: 'sine',     gain: 0.032, duration: 0.080 },
    ice:    { frequency: 1080, type: 'sine',     gain: 0.028, duration: 0.090 },
    forest: { frequency: 440,  type: 'triangle', gain: 0.035, duration: 0.080 },
    retro:  { frequency: 960,  type: 'square',   gain: 0.025, duration: 0.055 },
    galaxy: { frequency: 1380, type: 'sine',     gain: 0.028, duration: 0.100 },
  }

  const sound = sounds[mCrossGetThemeName()] || sounds.beige
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return

  try {
    const audioContext = new AudioContextClass()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = sound.type
    oscillator.frequency.setValueAtTime(sound.frequency, audioContext.currentTime)
    gain.gain.setValueAtTime(sound.gain, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + sound.duration)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + sound.duration)
    oscillator.addEventListener('ended', () => audioContext.close(), { once: true })
  } catch (error) {
    console.debug('M-Cross button sound skipped', error)
  }
}

function mCrossHandleButtonSound(event) {
  const target = event.target
  if (!(target instanceof Element)) return
  const button = target.closest('button')
  if (!button || button.disabled) return
  mCrossPlayButtonSound()
}

if (!globalThis.__mCrossThemeButtonSoundsV2Installed) {
  globalThis.__mCrossThemeButtonSoundsV2Installed = true
  document.addEventListener('click', mCrossHandleButtonSound, true)
}
${END}
`;

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, source.trimEnd() + injection + '\n', 'utf8');

console.log('OK: 修正版のテーマ別クリック音を全ボタンに追加しました。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev で確認してください。');
