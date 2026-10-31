const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-property-picker-v3')
const marker = 'M-CROSS_PROPERTY_PICKER_V3_SIMPLE'

if (!fs.existsSync(target)) {
  console.error('ERROR: src/App.jsx が見つかりません。M-Crossフォルダで実行してください。')
  process.exit(1)
}

let source = fs.readFileSync(target, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: シンプル物件選択V3は適用済みです。')
  process.exit(0)
}
if (!source.includes('M-CROSS_PROPERTY_LIST_PICKER_V2')) {
  console.error('ERROR: 先に物件一覧選択V2を適用してください。App.jsxは変更していません。')
  process.exit(1)
}

const searchLabelStart = source.indexOf('              <label>\n                <span>物件名検索</span>')
const listButtonMarker = source.indexOf('              {/* M-CROSS_PROPERTY_LIST_PICKER_V2 */}', searchLabelStart)
if (searchLabelStart < 0 || listButtonMarker < 0) {
  console.error('ERROR: 旧「物件名検索」欄を特定できません。App.jsxは変更していません。')
  process.exit(1)
}

const resultsStart = source.indexOf('              {propertySearch.trim() && !selectedProperty && (', listButtonMarker)
const addressStart = source.indexOf('              <div className="address">', resultsStart)
if (resultsStart < 0 || addressStart < 0) {
  console.error('ERROR: 旧検索候補欄を特定できません。App.jsxは変更していません。')
  process.exit(1)
}

fs.copyFileSync(target, backup)

// 画面上の旧検索入力欄だけ削除する。propertySearch stateは履歴・類似現場用に残す。
source = source.slice(0, searchLabelStart) + source.slice(listButtonMarker)

// 検索候補ブロックは位置が変わるため再検出して削除する。
const updatedResultsStart = source.indexOf('              {propertySearch.trim() && !selectedProperty && (')
const updatedAddressStart = source.indexOf('              <div className="address">', updatedResultsStart)
source = source.slice(0, updatedResultsStart) + source.slice(updatedAddressStart)

// ボタン文言をシンプルにする。
source = source.replace('                📋 物件一覧から選ぶ', "                {selectedProperty ? '📋 物件を変更する' : '📋 物件を選ぶ'}")

// ボタン直後に選択中物件を明示する。
const pickerClose = `              )}\n\n              <div className="address">`
const pickerCloseReplacement = `              )}\n\n              {/* ${marker} */}\n              <div className="selectedPropertySummary">\n                <small>選択中の物件</small>\n                <strong>{selectedProperty?.name || 'まだ選択されていません'}</strong>\n              </div>\n\n              <div className="address">`
if (!source.includes(pickerClose)) {
  console.error('ERROR: 物件一覧ダイアログ直後の位置が見つかりません。バックアップから復元します。')
  fs.copyFileSync(backup, target)
  process.exit(1)
}
source = source.replace(pickerClose, pickerCloseReplacement)

// 一覧ボタンのスタイルに選択表示を追加する。
const styleAnchor = '.propertyListOpenButton{width:100%;margin-top:10px}'
const styleReplacement = '.propertyListOpenButton{width:100%;margin-top:10px}.selectedPropertySummary{display:grid;gap:3px;margin-top:10px;padding:12px 14px;border:1px solid rgba(90,120,170,.24);border-radius:12px;background:rgba(38,114,236,.06)}.selectedPropertySummary small{opacity:.68}.selectedPropertySummary strong{font-size:1.05rem}'
if (!source.includes(styleAnchor)) {
  console.error('ERROR: 一覧画面のスタイル位置が見つかりません。バックアップから復元します。')
  fs.copyFileSync(backup, target)
  process.exit(1)
}
source = source.replace(styleAnchor, styleReplacement)

fs.writeFileSync(target, source, 'utf8')
console.log('OK: 物件選択画面をシンプル化しました。')
console.log('  - トップ画面の「物件名検索」を削除')
console.log('  - 旧検索候補欄を削除')
console.log('  - 「物件を選ぶ」ボタンへ一本化')
console.log('  - 一覧内の物件名・住所検索は維持')
console.log('  - 選択後は物件名と住所を表示')
console.log('  - propertySearch stateと内部履歴処理は維持')
console.log('BACKUP: ' + backup)
console.log('NEXT: npm run build')
