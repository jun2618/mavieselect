const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-property-picker-v4')
const marker = 'M-CROSS_PROPERTY_PICKER_V4_SIMPLE'
const listMarker = '              {/* M-CROSS_PROPERTY_LIST_PICKER_V2 */}'
const searchLabelText = '<span>物件名検索</span>'
const resultsStartText = '              {propertySearch.trim() && !selectedProperty && ('
const addressStartText = '              <div className="address">'

if (!fs.existsSync(target)) {
  console.error('ERROR: src/App.jsx が見つかりません。M-Crossフォルダで実行してください。')
  process.exit(1)
}

let source = fs.readFileSync(target, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: シンプル物件選択V4は適用済みです。')
  process.exit(0)
}
if (!source.includes('M-CROSS_PROPERTY_LIST_PICKER_V2')) {
  console.error('ERROR: 物件一覧選択V2が見つかりません。変更していません。')
  process.exit(1)
}

function findOpeningLabel(text, containedText) {
  const contained = text.indexOf(containedText)
  if (contained < 0) return -1
  return text.lastIndexOf('              <label>', contained)
}

function findBlockEnd(text, start, openToken, closeToken) {
  let depth = 0
  let cursor = start
  while (cursor < text.length) {
    const nextOpen = text.indexOf(openToken, cursor)
    const nextClose = text.indexOf(closeToken, cursor)
    if (nextClose < 0) return -1
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1
      cursor = nextOpen + openToken.length
    } else {
      depth -= 1
      cursor = nextClose + closeToken.length
      if (depth === 0) return cursor
    }
  }
  return -1
}

const labelStart = findOpeningLabel(source, searchLabelText)
const listStart = source.indexOf(listMarker)
if (labelStart < 0 || listStart < 0 || labelStart >= listStart) {
  console.error('ERROR: 現在の「物件名検索」欄を特定できません。変更していません。')
  process.exit(1)
}

const resultsStart = source.indexOf(resultsStartText, listStart)
const addressStart = source.indexOf(addressStartText, resultsStart)
if (resultsStart < 0 || addressStart < 0) {
  console.error('ERROR: 旧検索候補欄または住所欄を特定できません。変更していません。')
  process.exit(1)
}

fs.copyFileSync(target, backup)

// 旧検索入力欄を削除。内部stateとsetPropertySearchは維持する。
source = source.slice(0, labelStart) + source.slice(listStart)

// 旧検索候補欄を削除。
const newResultsStart = source.indexOf(resultsStartText)
const newAddressStart = source.indexOf(addressStartText, newResultsStart)
if (newResultsStart < 0 || newAddressStart < 0) {
  fs.copyFileSync(backup, target)
  console.error('ERROR: 削除後の候補欄を特定できません。変更を取り消しました。')
  process.exit(1)
}
source = source.slice(0, newResultsStart) + source.slice(newAddressStart)

// ボタン文言を選択状態に合わせる。
const oldCaption = '                📋 物件一覧から選ぶ'
const newCaption = "                {selectedProperty ? '📋 物件を変更する' : '📋 物件を選ぶ'}"
if (!source.includes(oldCaption)) {
  fs.copyFileSync(backup, target)
  console.error('ERROR: 一覧ボタンの文言が見つかりません。変更を取り消しました。')
  process.exit(1)
}
source = source.replace(oldCaption, newCaption)

// 一覧ダイアログの直後、住所欄の前に選択中物件を表示する。
const currentAddressStart = source.indexOf(addressStartText)
if (currentAddressStart < 0) {
  fs.copyFileSync(backup, target)
  console.error('ERROR: 住所欄が見つかりません。変更を取り消しました。')
  process.exit(1)
}
const summary = `              {/* ${marker} */}
              <div className="selectedPropertySummary">
                <small>選択中の物件</small>
                <strong>{selectedProperty?.name || 'まだ選択されていません'}</strong>
              </div>

`
source = source.slice(0, currentAddressStart) + summary + source.slice(currentAddressStart)

const styleAnchor = '.propertyListOpenButton{width:100%;margin-top:10px}'
const summaryStyle = '.propertyListOpenButton{width:100%;margin-top:10px}.selectedPropertySummary{display:grid;gap:3px;margin-top:10px;padding:12px 14px;border:1px solid rgba(90,120,170,.24);border-radius:12px;background:rgba(38,114,236,.06)}.selectedPropertySummary small{opacity:.68}.selectedPropertySummary strong{font-size:1.05rem}'
if (!source.includes(styleAnchor)) {
  fs.copyFileSync(backup, target)
  console.error('ERROR: 一覧画面のスタイル位置が見つかりません。変更を取り消しました。')
  process.exit(1)
}
source = source.replace(styleAnchor, summaryStyle)

fs.writeFileSync(target, source, 'utf8')
console.log('OK: 物件選択をシンプル表示へ変更しました。')
console.log('  - トップ画面の物件名検索欄を削除')
console.log('  - 旧候補欄を削除')
console.log('  - 物件を選ぶ／物件を変更するボタンへ一本化')
console.log('  - 一覧内検索は維持')
console.log('  - 選択中の物件名と住所を表示')
console.log('  - propertySearchの内部処理は維持')
console.log('BACKUP: ' + backup)
console.log('NEXT: npm run build')
