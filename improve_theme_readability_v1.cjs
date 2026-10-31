const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-theme-readability-v1')
const marker = 'M-CROSS_THEME_READABILITY_V1'

if (!fs.existsSync(target)) {
  console.error('ERROR: src/App.jsx が見つかりません。')
  process.exit(1)
}
let source = fs.readFileSync(target, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: テーマ視認性改善V1は適用済みです。')
  process.exit(0)
}

const styleEnd = source.lastIndexOf('</style>')
if (styleEnd < 0) {
  console.error('ERROR: App.jsx の style ブロックが見つかりません。変更していません。')
  process.exit(1)
}

fs.copyFileSync(target, backup)

const css = `
/* ${marker} */
/* 全テーマ共通: 本文・入力・ボタンを一段大きくして補足文字の薄さを抑える */
.app{font-size:17px;line-height:1.58}
.main,.card,.modal,.panel{font-size:1rem}
button,input,select,textarea{font-size:16px!important;line-height:1.4}
button{font-weight:700}
label>span,.fieldLabel{font-size:15px!important;font-weight:700}
small,.subtitle,.estimateNote,.oneDriveSyncNote,.oneDriveWarning{font-size:14px!important;line-height:1.5;opacity:.88!important}
input::placeholder,textarea::placeholder{opacity:1!important;color:#667085!important}
button:disabled,input:disabled,select:disabled,textarea:disabled{opacity:.68!important}
.propertyListPickerItem strong,.selectedPropertySummary strong{font-size:17px!important}
.propertyListPickerItem small,.selectedPropertySummary small{font-size:14px!important;opacity:.86!important}

/* 暗色系テーマ: 読ませる文字は白寄り、補足は明るい青白へ統一 */
.theme-dark,.theme-cyber,.theme-luxury,.theme-retro,.theme-galaxy{
  --mcross-readable-text:#f7fbff;
  --mcross-readable-muted:#d8e8f6;
}
.theme-dark :is(p,span,small,label,strong,h1,h2,h3),
.theme-cyber :is(p,span,small,label,strong,h1,h2,h3),
.theme-luxury :is(p,span,small,label,strong,h1,h2,h3),
.theme-retro :is(p,span,small,label,strong,h1,h2,h3),
.theme-galaxy :is(p,span,small,label,strong,h1,h2,h3){color:var(--mcross-readable-text)}
.theme-dark :is(.subtitle,.estimateNote,.oneDriveSyncNote,.oneDriveWarning,.propertyListPickerItem small,.selectedPropertySummary small),
.theme-cyber :is(.subtitle,.estimateNote,.oneDriveSyncNote,.oneDriveWarning,.propertyListPickerItem small,.selectedPropertySummary small),
.theme-luxury :is(.subtitle,.estimateNote,.oneDriveSyncNote,.oneDriveWarning,.propertyListPickerItem small,.selectedPropertySummary small),
.theme-retro :is(.subtitle,.estimateNote,.oneDriveSyncNote,.oneDriveWarning,.propertyListPickerItem small,.selectedPropertySummary small),
.theme-galaxy :is(.subtitle,.estimateNote,.oneDriveSyncNote,.oneDriveWarning,.propertyListPickerItem small,.selectedPropertySummary small){color:var(--mcross-readable-muted)!important}

/* Cyber: 薄い水色文字を避け、白 + 高コントラストのシアンをアクセントに限定 */
.theme-cyber{--mcross-readable-text:#f8fcff;--mcross-readable-muted:#d7edf7;--mcross-cyber-accent:#33e6ff}
.theme-cyber :is(h1,h2,h3,.eyebrow,.fieldLabel,label>span){color:#f8fcff!important;text-shadow:none!important}
.theme-cyber :is(.subtitle,small,.estimateNote,.oneDriveSyncNote,.oneDriveWarning){color:#d7edf7!important;opacity:1!important}
.theme-cyber :is(input,select,textarea){color:#fff!important;background:#101b2a!important;border-color:#4e7189!important}
.theme-cyber :is(input,textarea)::placeholder{color:#b6cfdb!important;opacity:1!important}
.theme-cyber .secondaryButton{color:#f8fcff!important;border-color:#33e6ff!important}
.theme-cyber .primary,.theme-cyber .saveButton{font-weight:800!important}
.theme-cyber :is(.address,.selectedPropertySummary,.propertyListPickerItem,.oneDriveStatus,.oneDriveCount){color:#f8fcff!important}
.theme-cyber :is(.address small,.selectedPropertySummary small,.propertyListPickerItem small){color:#d7edf7!important;opacity:1!important}

/* 明るいテーマでも補足文字を薄くしすぎない */
.theme-beige :is(small,.subtitle,.estimateNote),
.theme-sakura :is(small,.subtitle,.estimateNote),
.theme-ice :is(small,.subtitle,.estimateNote){opacity:.82!important}

@media(max-width:620px){
  .app{font-size:17px}
  button,input,select,textarea{font-size:16px!important}
  small,.subtitle{font-size:14px!important}
}
`

source = source.slice(0, styleEnd) + css + source.slice(styleEnd)
fs.writeFileSync(target, source, 'utf8')
console.log('OK: 全テーマの文字サイズとコントラスト改善を追加しました。')
console.log('  - 通常本文 17px基準')
console.log('  - 入力・選択・ボタン 16px以上')
console.log('  - small/補足 14px基準')
console.log('  - Cyberの薄い水色を白/明るい青白へ改善')
console.log('  - 暗色テーマの補足文字も明るく調整')
console.log('BACKUP: ' + backup)
console.log('NEXT: npm run build')
