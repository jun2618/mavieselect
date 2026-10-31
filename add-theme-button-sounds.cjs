const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-theme-button-sounds-auto');
const START = '/* M-CROSS_THEME_BUTTON_SOUNDS_START */';
const END = '/* M-CROSS_THEME_BUTTON_SOUNDS_END */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。crossmeasure フォルダで実行してください。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');

if (source.includes(START)) {
  console.log('SKIP: テーマ別クリック音はすでに追加されています。');
  process.exit(0);
}

const markerCandidates = [
  'createRoot(document.getElementById(\'root\'))',
  'createRoot(document.getElementById("root"))',
  'ReactDOM.createRoot(document.getElementById(\'root\'))',
  'ReactDOM.createRoot(document.getElementById("root"))'
];

let marker = markerCandidates.find(value => source.includes(value));
if (!marker) {
  console.error('ERROR: Reactの起動位置を確認できなかったため、書き換えを中止しました。');
  process.exit(1);
}

const injection = String.raw`
${START}
function mCrossThemeButtonSound(event) {
  const button = event.target instanceof Element ? event.target.closest('button') : null
  if (!button || button.disabled) return

  try {
    // 既存の操作音設定に sound: "off" が保存されている場合は鳴らさない
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      try {
        const value = JSON.parse(raw)
        if (value && typeof value === 'object' && value.sound === 'off') return
      } catch {}
    }

    const app = document.querySelector('.app')
    const className = app?.className || ''
    const theme =
      className.includes('theme-cyber') ? 'cyber' :
      className.includes('theme-retro') ? 'retro' :
      className.includes('theme-galaxy') ? 'galaxy' :
      className.includes('theme-sakura') ? 'sakura' :
      className.includes('theme-ice') ? 'ice' :
      className.includes('theme-forest') ? 'forest' :
      className.includes('theme-luxury') ? 'luxury' :
      className.includes('theme-pop') ? 'pop' :
      className.includes('theme-dark') ? 'dark' : 'beige'

    const sound = {
      beige:  { frequency: 620, type: 'sine',     gain: 0.035, duration: 0.055 },
      dark:   { frequency: 360, type: 'triangle', gain: 0.040, duration: 0.060 },
      pop:    { frequency: 880, type: 'triangle', gain: 0.045, duration: 0.075 },
      cyber:  { frequency: 1240,type: 'square',   gain: 0.025, duration: 0.050 },
      luxury: { frequency: 520, type: 'sine',     gain: 0.030, duration: 0.070 },
      sakura: { frequency: 760, type: 'sine',     gain: 0.032, duration: 0.080 },
      ice:    { frequency: 1080,type: 'sine',     gain: 0.028, duration: 0.090 },
      forest: { frequency: 440, type: 'triangle', gain: 0.035, duration: 0.080 },
      retro:  { frequency: 960, type: 'square',   gain: 0.025, duration: 0.055 },
      galaxy: { frequency: 1380,type: 'sine',     gain: 0.028, duration: 0.100 },
    }[theme]

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
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

if (!globalThis.__mCrossThemeButtonSoundInstalled) {
  globalThis.__mCrossThemeButtonSoundInstalled = true
  document.addEventListener('click', mCrossThemeButtonSound, true)
}
${END}

`;

fs.copyFileSync(appPath, backupPath);
source = source.replace(marker, injection + marker);
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: テーマ別クリック音を全ボタンに追加しました。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev で確認してください。');
