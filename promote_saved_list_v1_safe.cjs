const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const cssPath = path.join(root, 'src', 'App.css')
const appBackup = appPath + '.before-promote-saved-list-v1'
const cssBackup = cssPath + '.before-promote-saved-list-v1'
const marker = 'M-CROSS_PROMOTE_SAVED_LIST_V1_SAFE'

function fail(msg){ console.error('ERROR: ' + msg); process.exit(1) }
if(!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
if(!fs.existsSync(cssPath)) fail('src/App.css が見つかりません。')
let app=fs.readFileSync(appPath,'utf8')
let css=fs.readFileSync(cssPath,'utf8')
if(app.includes(marker)){ console.log('SKIP: 保存済み一覧トップ配置V1は適用済みです。'); process.exit(0) }

const subtitle='            <p className="subtitle">採寸する物件を選択してください。</p>'
const oldButton='              <button className="secondaryButton" type="button" onClick={openSavedList}>保存済み一覧を見る</button>'
if(!app.includes(subtitle)) fail('トップページ見出しが見つかりません。変更していません。')
if(!app.includes(oldButton)) fail('既存の保存済み一覧ボタンが見つかりません。変更していません。')

fs.copyFileSync(appPath,appBackup)
fs.copyFileSync(cssPath,cssBackup)
try{
  // 既存の下側ボタンを削除し、トップ見出し直下へ大きなボタンを移す。
  app=app.replace(oldButton,'')
  const hero=`${subtitle}\n            {/* ${marker} */}\n            <button className="savedListHeroButton" type="button" onClick={openSavedList}>\n              <span>📂 保存済み一覧を見る</span>\n              <small>保存した物件を開く・続きから編集</small>\n            </button>`
  app=app.replace(subtitle,hero)

  css += `\n/* ${marker} */\n.savedListHeroButton{display:grid;gap:4px;width:100%;margin:14px 0 10px;padding:18px 20px;border:0;border-radius:16px;background:linear-gradient(135deg,#6a4fd6,#8b5dd9);color:#fff;box-shadow:0 12px 28px rgba(93,63,180,.28);text-align:left;cursor:pointer}.savedListHeroButton span{font-size:20px;font-weight:900;color:inherit!important}.savedListHeroButton small{font-size:14px!important;color:rgba(255,255,255,.92)!important;opacity:1!important}.savedListHeroButton:hover{transform:translateY(-1px);box-shadow:0 15px 32px rgba(93,63,180,.34)}.savedListHeroButton:focus-visible{outline:3px solid rgba(106,79,214,.4);outline-offset:3px}@media(max-width:620px){.savedListHeroButton{padding:16px}.savedListHeroButton span{font-size:18px}}\n`
  fs.writeFileSync(appPath,app,'utf8')
  fs.writeFileSync(cssPath,css,'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true})
  console.log('OK: 保存済み一覧をトップ最上部へ移動し、ビルド成功を確認しました。')
  console.log('BACKUP: ' + appBackup)
}catch(error){
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message||String(error))
  if(fs.existsSync(appBackup)) fs.copyFileSync(appBackup,appPath)
  if(fs.existsSync(cssBackup)) fs.copyFileSync(cssBackup,cssPath)
  process.exit(1)
}
