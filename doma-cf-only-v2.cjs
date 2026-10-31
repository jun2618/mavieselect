const fs = require('fs')
const path = require('path')
const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-doma-cf-only-v2')
if (!fs.existsSync(file)) { console.error('見つかりません: ' + file); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const original = s

// CFコンポーネント呼び出しの rooms={rooms} だけを、行位置に依存せず置換
const marker = 'title="CF"'
const markerPos = s.indexOf(marker)
if (markerPos === -1) { console.error('title="CF" が見つかりません。'); process.exit(1) }
const beforeMarker = s.lastIndexOf('<LengthMeasurementPage', markerPos)
const afterMarker = s.indexOf('/>', markerPos)
if (beforeMarker === -1 || afterMarker === -1) { console.error('CF画面ブロックを特定できません。'); process.exit(1) }
let block = s.slice(beforeMarker, afterMarker + 2)
if (!block.includes('rooms={rooms}')) { console.error('CF画面内の rooms={rooms} が見つかりません。'); process.exit(1) }
block = block.replace('rooms={rooms}', "rooms={rooms.includes('土間') ? rooms : [...rooms, '土間']}")
s = s.slice(0, beforeMarker) + block + s.slice(afterMarker + 2)

// CF見積集計を土間専用タブ対応へ変更
const cfComment = s.indexOf('// 2. クロスが終わった後に、CF')
const loopStart = s.indexOf('  orderedRooms.forEach(roomName => {', cfComment)
const loopEnd = s.indexOf('\n  // 3.', loopStart)
if (cfComment === -1 || loopStart === -1 || loopEnd === -1) { console.error('CF見積集計部分が見つかりません。'); process.exit(1) }
const loop = `  const cfRooms = [...orderedRooms]
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
s = s.slice(0, loopStart) + loop + s.slice(loopEnd)

// 見積Excelはpartsをそのまま使用
s = s.replace("? [row.room, '床', 'CF貼り']", '? row.parts')
s = s.replace("? [row.room, '床', 'CF貼替']", '? row.parts')

// 古い部位切替UIが残っていれば除去
s = s.replace("  const [part, setPart] = useState('床')\n", '')
s = s.replace("    if (title === 'CF') setPart('床')\n", '')
s = s.replace("part: title === 'CF' ? part : '', ", '')
s = s.replace(/            \{title === 'CF' && \(\n              <div className="measurementTypes" aria-label="CFの部位">[\s\S]*?            \)\}\n/, '')
s = s.replace("<strong>{countOnly ? 'ソフト巾木登録' : title === 'CF' ? `CF（${item.part === '土間' ? '土間' : '床'}）` : title}</strong>", "<strong>{countOnly ? 'ソフト巾木登録' : title}</strong>")

// 共通部屋に土間があれば除去
s = s.replace("  '階段', 'ホール', '玄関', '脱衣所', 'トイレ', '土間',", "  '階段', 'ホール', '玄関', '脱衣所', 'トイレ',")
s = s.replace("const roomPriority = ['居間', 'LDK', '台所', '洋間', '和室', '階段', 'ホール', '玄関', '脱衣所', 'トイレ', '土間']", "const roomPriority = ['居間', 'LDK', '台所', '洋間', '和室', '階段', 'ホール', '玄関', '脱衣所', 'トイレ']")

if (s === original) { console.error('変更がありません。'); process.exit(1) }
fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('OK: バックアップ作成 ' + backup)
console.log('OK: CFページだけに土間を追加')
console.log('OK: クロス・ソフト巾木には土間を追加しない')
console.log('OK: 見積は 土間 | 床 | CF貼り、数量は実測m×1.8')
console.log('完了: npm run build を実行してください。')
