const fs = require('fs')
const path = require('path')

const root = process.cwd()
const appFile = path.join(root, 'src', 'App.jsx')
const publicDir = path.join(root, 'public')
const logoSource = path.join(root, 'm-cross-logo.png')
const logoTarget = path.join(publicDir, 'm-cross-logo.png')
const backup = path.join(root, 'src', 'App.jsx.before-logo')

if (!fs.existsSync(appFile)) { console.error('見つかりません: ' + appFile); process.exit(1) }
if (!fs.existsSync(logoSource)) { console.error('m-cross-logo.png をcrossmeasureフォルダーへ入れてください。'); process.exit(1) }
fs.mkdirSync(publicDir, { recursive: true })
fs.copyFileSync(appFile, backup)
fs.copyFileSync(logoSource, logoTarget)

let s = fs.readFileSync(appFile, 'utf8')
const oldCss = `  .brandGroup { display:grid; justify-items:start; gap:0; line-height:1; }`
const newCss = `  .brandGroup { display:flex; align-items:center; justify-content:flex-start; gap:10px; line-height:1; min-width:0; }
  .brandLogo { width:62px; height:62px; object-fit:contain; flex:0 0 auto; filter:drop-shadow(0 5px 10px rgba(148,76,196,.18)); transition:filter .2s ease,transform .2s ease; }
  .theme-dark .brandLogo { filter:drop-shadow(0 0 8px rgba(240,160,141,.35)); }
  .theme-pop .brandLogo { filter:drop-shadow(0 5px 9px rgba(231,93,145,.22)); }
  .theme-cyber .brandLogo { filter:drop-shadow(0 0 7px rgba(0,234,255,.8)) drop-shadow(0 0 11px rgba(255,37,216,.45)); }
  @media (max-width:520px) { .brandLogo { width:54px; height:54px; } }`
if (!s.includes(oldCss)) { console.error('brandGroup CSS が見つかりません。変更せず終了しました。'); process.exit(1) }
s = s.replace(oldCss, newCss)

const oldBrand = `<div className="brandGroup">
            <div className="mavieBrand">MavieSelect</div>
            <div className="brand">M-Cross</div>
          </div>`
const newBrand = `<div className="brandGroup">
            <img className="brandLogo" src="/m-cross-logo.png" alt="M-Cross" />
            <div>
              <div className="mavieBrand">MavieSelect</div>
              <div className="brand">M-Cross</div>
            </div>
          </div>`
if (!s.includes(oldBrand)) { console.error('ヘッダーのM-Cross表示が見つかりません。変更せず終了しました。'); process.exit(1) }
s = s.replace(oldBrand, newBrand)
fs.writeFileSync(appFile, s, 'utf8')
console.log('OK: ロゴ画像を public/m-cross-logo.png に配置')
console.log('OK: ヘッダー左側へM-Crossロゴを追加')
console.log('OK: ダーク・ポップ・サイバーで影の色をテーマ連動')
console.log('OK: バックアップ ' + backup)
console.log('完了: npm run build を実行してください。')
