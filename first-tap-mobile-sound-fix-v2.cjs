const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-first-tap-mobile-dedicated-v2');
const appliedMarker = '/* M-CROSS_FIRST_TAP_MOBILE_DEDICATED_V2_APPLIED */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');

if (!source.includes('M-CROSS_THEME_BUTTON_SOUNDS_V2_START') ||
    !source.includes('mCrossGetAudioContext') ||
    !source.includes('mCrossPlayButtonSound')) {
  console.error('ERROR: 現在のクリック音処理を確認できないため中止しました。');
  process.exit(1);
}

if (source.includes(appliedMarker)) {
  console.log('SKIP: 1タップ目専用対策V2はすでに適用済みです。');
  process.exit(0);
}

const possibleStarts = [
  'let mCrossIsFirstButtonSound = true',
  'async function mCrossPlayButtonSound() {',
  'function mCrossPlayButtonSound() {'
];
const endText = 'function mCrossHandleButtonSound(event) {';
let start = -1;
for (const text of possibleStarts) {
  const index = source.indexOf(text);
  if (index !== -1) {
    start = index;
    break;
  }
}
const end = source.indexOf(endText, start);

if (start === -1 || end === -1 || end <= start) {
  console.error('ERROR: 音処理の置換範囲を安全に特定できないため中止しました。');
  process.exit(1);
}

const replacement = String.raw`let mCrossIsFirstButtonSound = true

function mCrossCreateTone(audioContext, sound, gainValue, duration, delay = 0) {
  const at = audioContext.currentTime + delay
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()

  oscillator.type = sound.type
  oscillator.frequency.setValueAtTime(sound.frequency, at)
  gain.gain.setValueAtTime(Math.min(gainValue, 0.22), at)
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration)

  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start(at)
  oscillator.stop(at + duration)
}

async function mCrossPlayButtonSound() {
  const sounds = {
    beige:  { frequency: 620,  type: 'sine',     gain: 0.090, duration: 0.070 },
    dark:   { frequency: 360,  type: 'triangle', gain: 0.100, duration: 0.075 },
    pop:    { frequency: 880,  type: 'triangle', gain: 0.110, duration: 0.090 },
    cyber:  { frequency: 1240, type: 'square',   gain: 0.065, duration: 0.065 },
    luxury: { frequency: 520,  type: 'sine',     gain: 0.085, duration: 0.085 },
    sakura: { frequency: 760,  type: 'sine',     gain: 0.085, duration: 0.095 },
    ice:    { frequency: 1080, type: 'sine',     gain: 0.080, duration: 0.100 },
    forest: { frequency: 440,  type: 'triangle', gain: 0.095, duration: 0.090 },
    retro:  { frequency: 960,  type: 'square',   gain: 0.065, duration: 0.070 },
    galaxy: { frequency: 1380, type: 'sine',     gain: 0.080, duration: 0.110 },
  }

  const sound = sounds[mCrossGetThemeName()] || sounds.beige
  const audioContext = mCrossGetAudioContext()
  if (!audioContext) return

  try {
    if (audioContext.state === 'suspended') await audioContext.resume()
    if (audioContext.state !== 'running') return

    if (mCrossIsFirstButtonSound) {
      mCrossCreateTone(audioContext, sound, sound.gain * 2.0, Math.max(sound.duration, 0.11), 0)
      mCrossCreateTone(audioContext, sound, sound.gain * 1.25, 0.060, 0.020)
      mCrossIsFirstButtonSound = false
      return
    }

    mCrossCreateTone(audioContext, sound, sound.gain, sound.duration)
  } catch (error) {
    console.debug('M-Cross button sound skipped', error)
  }
}

${appliedMarker}

`;

fs.copyFileSync(appPath, backupPath);
source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: 現在のApp.jsxに合わせて、1タップ目専用対策V2を適用しました。');
console.log('BACKUP:', backupPath);
console.log('NEXT: git add src/App.jsx');
