const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-mobile-sound-fix');
const appliedMarker = '/* M-CROSS_MOBILE_SOUND_FIX_APPLIED */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');

if (!source.includes('M-CROSS_THEME_BUTTON_SOUNDS_V2_START')) {
  console.error('ERROR: テーマ別クリック音V2が見つからないため中止しました。');
  process.exit(1);
}

if (source.includes(appliedMarker)) {
  console.log('SKIP: スマホ向けクリック音改善はすでに適用済みです。');
  process.exit(0);
}

const startText = 'function mCrossPlayButtonSound() {';
const endText = 'function mCrossHandleButtonSound(event) {';
const start = source.indexOf(startText);
const end = source.indexOf(endText, start);

if (start === -1 || end === -1 || end <= start) {
  console.error('ERROR: クリック音処理の範囲を安全に特定できないため中止しました。');
  process.exit(1);
}

const replacement = String.raw`let mCrossSharedAudioContext = null

function mCrossGetAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null

  if (!mCrossSharedAudioContext || mCrossSharedAudioContext.state === 'closed') {
    mCrossSharedAudioContext = new AudioContextClass()
  }

  if (mCrossSharedAudioContext.state === 'suspended') {
    mCrossSharedAudioContext.resume().catch(() => {})
  }

  return mCrossSharedAudioContext
}

function mCrossPlayButtonSound() {
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
  if (!audioContext || audioContext.state !== 'running') return

  try {
    const now = audioContext.currentTime
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = sound.type
    oscillator.frequency.setValueAtTime(sound.frequency, now)
    gain.gain.setValueAtTime(sound.gain, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + sound.duration)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(now)
    oscillator.stop(now + sound.duration)
  } catch (error) {
    console.debug('M-Cross button sound skipped', error)
  }
}

${appliedMarker}

`;

fs.copyFileSync(appPath, backupPath);
source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: スマホ向けに音処理を軽量化し、音量を上げました。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev で確認してください。');
