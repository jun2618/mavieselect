const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-doma-cf-only')

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

// 1) 土間を共通部屋一覧へは追加しない。
source = source.replace(
  "  '階段', 'ホール', '玄関', '脱衣所', 'トイレ', '土間',",
  "  '階段', 'ホール', '玄関', '脱衣所', 'トイレ',"
)
source = source.replace(
  "const roomPriority = ['居間', 'LDK', '台所', '洋間', '和室', '階段', 'ホール', '玄関', '脱衣所', 'トイレ', '土間']",
  "const roomPriority = ['居間', 'LDK', '台所', '洋間', '和室', '階段', 'ホール', '玄関', '脱衣所', 'トイレ']"
)

// 2) 以前の「床／土間」切替UIとpartデータを削除。
source = source.replace("  const [part, setPart] = useState('床')\n", '')
source = source.replace("    if (title === 'CF') setPart('床')\n", '')
source = source.replace("part: title === 'CF' ? part : '', ", '')
const partUiPattern = /            \{title === 'CF' && \(\n              <div className="measurementTypes" aria-label="CFの部位">[\s\S]*?            \)\}\n/
source = source.replace(partUiPattern, '')
source = source.replace(
  "<strong>{countOnly ? 'ソフト巾木登録' : title === 'CF' ? `CF（${item.part === '土間' ? '土間' : '床'}）` : title}</strong>",
  "<strong>{countOnly ? 'ソフト巾木登録' : title}</strong>"
)

// 3) CF画面へ渡す部屋一覧だけ、最後に土間を追加。
const cfCallPattern = /(<LengthMeasurementPage\n\s+title="CF"[\s\S]*?\n\s+rooms=)\{rooms\}/
const cfCallMatch = source.match(cfCallPattern)
if (!cfCallMatch) {
  console.error('CF画面の部屋一覧指定が見つかりません。変更せず終了しました。')
  process.exit(1)
}
source = source.replace(cfCallPattern, "$1{rooms.includes('土間') ? rooms : [...rooms, '土間']}")
console.log('OK: CFページだけ土間タブを追加')

// 4) 見積では通常部屋と土間を処理し、すべて「部屋名｜床｜CF貼り」。
const cfSectionStart = source.indexOf('// 2. クロスが終わった後に、CF')
const cfLoopStart = source.indexOf('  orderedRooms.forEach(roomName => {', cfSectionStart)
const cfLoopEnd = source.indexOf('\n  // 3.', cfLoopStart)
if (cfSectionStart === -1 || cfLoopStart === -1 || cfLoopEnd === -1) {
  console.error('CF見積集計処理が見つかりません。変更せず終了しました。')
  process.exit(1)
}
const newCfLoop = `  const cfRooms = [...orderedRooms]
  if (cfRecords.some(record => record.room === '土間') && !cfRooms.includes('土間')) cfRooms.push('土間')
  cfRooms.forEach(roomName => {
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
source = source.slice(0, cfLoopStart) + newCfLoop + source.slice(cfLoopEnd)
console.log('OK: 土間を「土間｜床｜CF貼り」で集計')

// 5) 見積ExcelのCFは、構築済みpartsをそのまま使う。
source = source.replace(
  "? [row.room, '床', 'CF貼り']",
  '? row.parts'
)
source = source.replace(
  "? [row.room, '床', 'CF貼替']",
  '? row.parts'
)

// 6) 採寸Excelでは土間は部屋名として出す。部位列は不要。
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
source = source.replace(
  "addWorksheet('CF', 'FF6E91E8', ['部屋名', '部位', 'メモ', '長さ', '本数', '数量'], cfRows)",
  "addWorksheet('CF', 'FF6E91E8', ['部屋名', 'メモ', '長さ', '本数', '数量'], cfRows)"
)

// 7) 既存物件でもCFページを開けば土間タブが出るため、保存済みrooms自体は変更しない。
if (source === original) {
  console.error('変更がありません。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, source, 'utf8')
console.log('OK: バックアップ作成 ' + backup)
console.log('OK: クロスとソフト巾木には土間を表示しません')
console.log('OK: CFページだけ最後に土間を表示します')
console.log('OK: 見積は「土間｜床｜CF貼り」、概算数量は実測m×1.8です')
console.log('完了: 次に npm run build を実行してください。')
