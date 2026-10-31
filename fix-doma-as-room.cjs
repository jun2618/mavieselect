const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-doma-room-fix')
if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}
let source = fs.readFileSync(file, 'utf8')
const original = source
function replaceOnce(oldText, newText, label) {
  const count = source.split(oldText).length - 1
  if (count !== 1) {
    console.error(`置換失敗: ${label}（一致数: ${count}）`)
    process.exit(1)
  }
  source = source.replace(oldText, newText)
  console.log('OK: ' + label)
}

// 土間をCFの「部位」ではなく独立した部屋として扱う。
replaceOnce(
"  '居間', 'LDK', '台所', '洋間', '洋間2', '洋間3', '和室',\n  '階段', 'ホール', '玄関', '脱衣所', 'トイレ',",
"  '居間', 'LDK', '台所', '洋間', '洋間2', '洋間3', '和室',\n  '階段', 'ホール', '玄関', '脱衣所', 'トイレ', '土間',",
'既定部屋に土間を追加'
)
replaceOnce(
"const roomPriority = ['居間', 'LDK', '台所', '洋間', '和室', '階段', 'ホール', '玄関', '脱衣所', 'トイレ']",
"const roomPriority = ['居間', 'LDK', '台所', '洋間', '和室', '階段', 'ホール', '玄関', '脱衣所', 'トイレ', '土間']",
'見積の部屋順に土間を追加'
)

// 以前の床/土間選択は削除し、CFは選択した部屋の「床」として登録する。
source = source.replace("  const [part, setPart] = useState('床')\n", '')
source = source.replace("    if (title === 'CF') setPart('床')\n", '')
source = source.replace("part: title === 'CF' ? part : '', ", '')
const uiPattern = /            \{title === 'CF' && \(\n              <div className="measurementTypes" aria-label="CFの部位">[\s\S]*?            \)\}\n/
if (!uiPattern.test(source)) {
  console.error('CFの床/土間選択UIが見つかりません。変更せず終了しました。')
  process.exit(1)
}
source = source.replace(uiPattern, '')
source = source.replace("<strong>{countOnly ? 'ソフト巾木登録' : title === 'CF' ? `CF（${item.part === '土間' ? '土間' : '床'}）` : title}</strong>", "<strong>{countOnly ? 'ソフト巾木登録' : title}</strong>")

// 見積CFは「選んだ部屋 | 床 | CF貼り」。土間タブなら「土間 | 床 | CF貼り」。
const cfStart = source.indexOf('  orderedRooms.forEach(roomName => {', source.indexOf('// 2. クロスが終わった後に、CF'))
const cfEnd = source.indexOf('\n  // 3.', cfStart)
if (cfStart === -1 || cfEnd === -1) {
  console.error('CF集計処理が見つかりません。変更せず終了しました。')
  process.exit(1)
}
const cfBlock = `  orderedRooms.forEach(roomName => {
    const roomCfRecords = cfRecords.filter(record => record.room === roomName)
    groupByMemo(roomCfRecords).forEach((groupRecords, memo) => {
      const measuredLength = groupRecords.reduce((sum, record) => sum + getLengthQuantity(record), 0)
      const quantity = measuredLength * 1.8
      if (quantity <= 0) return
      const rate = Number(pricingSettings.cfRate || 0)
      cfRows.push({
        room: roomName,
        parts: [roomName, '床', 'CF貼り'],
        memo,
        category: 'cf',
        quantity,
        unit: '㎡',
        rate,
        amount: quantity * rate,
      })
    })
  })`
source = source.slice(0, cfStart) + cfBlock + source.slice(cfEnd)

// 採寸Excelでは既存の部位列を削除。土間は部屋名として出る。
const cfRowsPattern = /  const cfRows = \(entry\.cfRecords \|\| \[\]\)\.map\(record => \[[\s\S]*?  \]\)\n  const softRows/
if (!cfRowsPattern.test(source)) {
  console.error('CF採寸Excel処理が見つかりません。変更せず終了しました。')
  process.exit(1)
}
source = source.replace(cfRowsPattern, `  const cfRows = (entry.cfRecords || []).map(record => [
    record.room || '',
    record.memo || '',
    Number(record.length || 0),
    Number(record.count || 0),
    Number(formatQuantity(getLengthQuantity(record))),
  ])
  const softRows`)
source = source.replace("addWorksheet('CF', 'FF6E91E8', ['部屋名', '部位', 'メモ', '長さ', '本数', '数量'], cfRows)", "addWorksheet('CF', 'FF6E91E8', ['部屋名', 'メモ', '長さ', '本数', '数量'], cfRows)")

fs.copyFileSync(file, backup)
if (source === original) {
  console.error('変更がありません。')
  process.exit(1)
}
fs.writeFileSync(file, source, 'utf8')
console.log('OK: バックアップ作成 ' + backup)
console.log('OK: 土間を独立した部屋項目として追加')
console.log('OK: CFの床/土間切替ボタンを削除')
console.log('OK: 見積は「土間 | 床 | CF貼り」で出力')
console.log('OK: CF概算1.8倍はそのまま維持')
console.log('完了: 次に npm run build を実行してください。')
