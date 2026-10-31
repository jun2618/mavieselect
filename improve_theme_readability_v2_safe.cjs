const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'src', 'App.css')
const backup = path.join(process.cwd(), 'src', 'App.css.before-theme-readability-v2')
const marker = 'M-CROSS_THEME_READABILITY_V2_SAFE'

if (!fs.existsSync(target)) {
  console.error('ERROR: src/App.css が見つかりません。M-Crossフォルダで実行してください。')
  process.exit(1)
}

let source = fs.readFileSync(target, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: テーマ視認性改善V2は適用済みです。')
  process.exit(0)
}

fs.copyFileSync(target, backup)

const css = `

/* ${marker} */
/* App.jsxには触れず、App.cssの末尾から安全に上書きする */

/* 全テーマ共通: 文字サイズ */
.app,
.main {
  font-size: 17px;
  line-height: 1.58;
}

button,
input,
select,
textarea {
  font-size: 16px !important;
  line-height: 1.4;
}

button {
  font-weight: 700;
}

label > span,
.fieldLabel {
  font-size: 15px !important;
  font-weight: 700;
}

small,
.subtitle,
.estimateNote,
.oneDriveSyncNote,
.oneDriveWarning {
  font-size: 14px !important;
  line-height: 1.5;
  opacity: 0.88 !important;
}

input::placeholder,
textarea::placeholder {
  color: #667085 !important;
  opacity: 1 !important;
}

button:disabled,
input:disabled,
select:disabled,
textarea:disabled {
  opacity: 0.7 !important;
}

.propertyListPickerItem strong,
.selectedPropertySummary strong {
  font-size: 17px !important;
}

.propertyListPickerItem small,
.selectedPropertySummary small {
  font-size: 14px !important;
  opacity: 0.88 !important;
}

/* 暗色テーマ共通 */
.theme-dark,
.theme-cyber,
.theme-luxury,
.theme-retro,
.theme-galaxy {
  --mcross-readable-text: #f7fbff;
  --mcross-readable-muted: #d8e8f6;
}

.theme-dark :is(p, span, small, label, strong, h1, h2, h3),
.theme-cyber :is(p, span, small, label, strong, h1, h2, h3),
.theme-luxury :is(p, span, small, label, strong, h1, h2, h3),
.theme-retro :is(p, span, small, label, strong, h1, h2, h3),
.theme-galaxy :is(p, span, small, label, strong, h1, h2, h3) {
  color: var(--mcross-readable-text);
}

.theme-dark :is(.subtitle, .estimateNote, .oneDriveSyncNote, .oneDriveWarning, .propertyListPickerItem small, .selectedPropertySummary small),
.theme-cyber :is(.subtitle, .estimateNote, .oneDriveSyncNote, .oneDriveWarning, .propertyListPickerItem small, .selectedPropertySummary small),
.theme-luxury :is(.subtitle, .estimateNote, .oneDriveSyncNote, .oneDriveWarning, .propertyListPickerItem small, .selectedPropertySummary small),
.theme-retro :is(.subtitle, .estimateNote, .oneDriveSyncNote, .oneDriveWarning, .propertyListPickerItem small, .selectedPropertySummary small),
.theme-galaxy :is(.subtitle, .estimateNote, .oneDriveSyncNote, .oneDriveWarning, .propertyListPickerItem small, .selectedPropertySummary small) {
  color: var(--mcross-readable-muted) !important;
  opacity: 1 !important;
}

/* Cyber: 薄い水色を本文に使わず、白と青白を基本にする */
.theme-cyber {
  --mcross-readable-text: #f8fcff;
  --mcross-readable-muted: #d7edf7;
  --mcross-cyber-accent: #33e6ff;
}

.theme-cyber :is(h1, h2, h3, .eyebrow, .fieldLabel, label > span) {
  color: #f8fcff !important;
  text-shadow: none !important;
}

.theme-cyber :is(.subtitle, small, .estimateNote, .oneDriveSyncNote, .oneDriveWarning) {
  color: #d7edf7 !important;
  opacity: 1 !important;
}

.theme-cyber :is(input, select, textarea) {
  color: #ffffff !important;
  background: #101b2a !important;
  border-color: #4e7189 !important;
}

.theme-cyber :is(input, textarea)::placeholder {
  color: #b6cfdb !important;
  opacity: 1 !important;
}

.theme-cyber .secondaryButton {
  color: #f8fcff !important;
  border-color: #33e6ff !important;
}

.theme-cyber :is(.primary, .saveButton) {
  font-weight: 800 !important;
}

.theme-cyber :is(.address, .selectedPropertySummary, .propertyListPickerItem, .oneDriveStatus, .oneDriveCount) {
  color: #f8fcff !important;
}

.theme-cyber :is(.address small, .selectedPropertySummary small, .propertyListPickerItem small) {
  color: #d7edf7 !important;
  opacity: 1 !important;
}

/* 明色テーマも補足文字を薄くしすぎない */
.theme-beige :is(small, .subtitle, .estimateNote),
.theme-sakura :is(small, .subtitle, .estimateNote),
.theme-ice :is(small, .subtitle, .estimateNote) {
  opacity: 0.84 !important;
}

@media (max-width: 620px) {
  .app,
  .main {
    font-size: 17px;
  }

  button,
  input,
  select,
  textarea {
    font-size: 16px !important;
  }

  small,
  .subtitle {
    font-size: 14px !important;
  }
}
`

source += css
fs.writeFileSync(target, source, 'utf8')

console.log('OK: 安全版V2の文字サイズ・コントラスト改善をApp.cssへ追加しました。')
console.log('  - App.jsxは変更していません')
console.log('  - 本文17px、入力・ボタン16px、補足14px')
console.log('  - Cyberの本文を白、補足を明るい青白へ改善')
console.log('  - Dark/Luxury/Retro/Galaxyの補足文字も改善')
console.log('BACKUP: ' + backup)
console.log('NEXT: npm run build')
