const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-final-review')
if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}
let s = fs.readFileSync(file, 'utf8')
const original = s

function replaceOnce(oldText, newText, label) {
  const count = s.split(oldText).length - 1
  if (count !== 1) {
    console.error(`置換失敗: ${label}（一致数: ${count}）`)
    process.exit(1)
  }
  s = s.replace(oldText, newText)
  console.log('OK: ' + label)
}

// M-Cross全体で共有する「よく使う追加作業」。実際の追加作業は物件データ内へ保存する。
replaceOnce(
  "const estimateCopyFormatKey = 'm-cross-estimate-copy-format'",
  "const estimateCopyFormatKey = 'm-cross-estimate-copy-format'\nconst commonAdditionalWorksKey = 'm-cross:common-additional-works:v1'\nconst defaultCommonAdditionalWorks = ['畳表替え', '電球交換', 'ドア簡易着色補修', '戸当たりゴム取付', '建具調整', 'コーキング']",
  '追加作業の共通保存キーを追加'
)

// 最終確認ページ用のスタイル。
const cssAnchor = '  .floorTrimColorButton.active { border-color:#f3a18f; color:#fff; background:linear-gradient(180deg,#ffb49b,#f18c7d); }'
if (!s.includes(cssAnchor)) {
  console.error('最終確認画面CSSの追加位置が見つかりません。')
  process.exit(1)
}
s = s.replace(cssAnchor, cssAnchor + `
  .reviewTotals { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin:16px 0 24px; }
  .reviewTotal { padding:16px; border:1px solid #eadce9; border-radius:18px; background:#fffafc; box-shadow:0 5px 0 #eee2e9; }
  .reviewTotal span { display:block; color:#8a7b8d; font-size:13px; font-weight:800; }
  .reviewTotal strong { display:block; margin-top:5px; color:#cf716f; font-size:23px; }
  .additionalWorkForm { margin-top:16px; padding:16px; border:1px dashed #efc7b4; border-radius:20px; background:#fffaf5; }
  .additionalWorkGrid { display:grid; grid-template-columns:1fr 90px 90px; gap:10px; }
  .commonWorkButtons { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0 16px; }
  .additionalWorkItem { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:10px; align-items:center; padding:14px 0; border-bottom:1px solid #eee5ec; }
  .additionalWorkItem:last-child { border-bottom:0; }
  .additionalWorkItem small { display:block; margin-top:4px; color:#988b99; }
  @media (max-width:520px) { .reviewTotals { grid-template-columns:1fr 1fr; } .additionalWorkGrid { grid-template-columns:1fr 78px; } .additionalWorkGrid label:last-child { grid-column:1 / -1; } }`)
console.log('OK: 最終確認画面のスタイルを追加')

// コンポーネントをAppの前へ追加。
const appAnchor = 'export default function App() {'
if (!s.includes(appAnchor)) {
  console.error('App本体が見つかりません。')
  process.exit(1)
}
const component = `function FinalReviewPage({
  rooms,
  crossTotal,
  cfTotal,
  softTotal,
  floorTrimTotal,
  additionalWorks,
  setAdditionalWorks,
  commonWorks,
  setCommonWorks,
  onChanged,
}) {
  const [room, setRoom] = useState(rooms[0] || '')
  const [work, setWork] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('式')
  const [memo, setMemo] = useState('')

  function addWork(event) {
    event.preventDefault()
    const numericQuantity = Number(quantity)
    if (!room || !work.trim() || !Number.isFinite(numericQuantity) || numericQuantity <= 0) return
    setAdditionalWorks(previous => [...previous, {
      id: createRecordId(), room, work: work.trim(), quantity: numericQuantity, unit, memo: memo.trim(),
    }])
    setWork('')
    setQuantity('1')
    setMemo('')
    onChanged()
  }

  function addCommonWork() {
    const value = window.prompt('よく使う項目名を入力してください')?.trim()
    if (!value || commonWorks.includes(value)) return
    const next = [...commonWorks, value]
    setCommonWorks(next)
    localStorage.setItem(commonAdditionalWorksKey, JSON.stringify(next))
  }

  function deleteCommonWork(value) {
    const next = commonWorks.filter(item => item !== value)
    setCommonWorks(next)
    localStorage.setItem(commonAdditionalWorksKey, JSON.stringify(next))
  }

  return (
    <>
      <section className="card">
        <h2>✅ 最終確認</h2>
        <p className="subtitle">内装数量と、内装以外の追加作業を確認してください。</p>
        <div className="reviewTotals">
          <div className="reviewTotal"><span>クロス合計</span><strong>{formatQuantity(crossTotal)}㎡</strong></div>
          <div className="reviewTotal"><span>CF合計</span><strong>{formatQuantity(cfTotal)}㎡</strong></div>
          <div className="reviewTotal"><span>ソフト巾木</span><strong>{formatQuantity(softTotal)}枚</strong></div>
          <div className="reviewTotal"><span>床見切り</span><strong>{formatQuantity(floorTrimTotal)}本</strong></div>
        </div>
      </section>

      <section className="card">
        <h2>🔧 内装以外の追加作業</h2>
        <div className="commonWorkButtons" aria-label="よく使う追加作業">
          {commonWorks.map(value => (
            <button key={value} className="quickMemoButton" type="button" onClick={() => setWork(value)} onContextMenu={event => { event.preventDefault(); deleteCommonWork(value) }}>{value}</button>
          ))}
          <button className="quickMemoButton" type="button" onClick={addCommonWork}>＋ よく使う項目</button>
        </div>

        <form className="additionalWorkForm" onSubmit={addWork}>
          <label><span>部屋</span><select value={room} onChange={event => setRoom(event.target.value)}>{rooms.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
          <label><span>作業内容</span><input value={work} onChange={event => setWork(event.target.value)} placeholder="例：畳表替え、電球交換" /></label>
          <div className="additionalWorkGrid">
            <label><span>数量</span><input type="number" min="0.1" step="0.1" value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
            <label><span>単位</span><select value={unit} onChange={event => setUnit(event.target.value)}>{['式','個','本','枚','台','箇所'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <label><span>メモ</span><input value={memo} onChange={event => setMemo(event.target.value)} placeholder="任意" /></label>
          </div>
          <button className="add" type="submit">＋ 追加作業を登録</button>
        </form>

        <div className="records">
          {additionalWorks.length === 0 ? <p className="empty">追加作業はありません</p> : additionalWorks.map(item => (
            <div className="additionalWorkItem" key={item.id}>
              <div><strong>{item.room}　{item.work}</strong><small>{item.memo || 'メモなし'}</small></div>
              <b>{formatQuantity(item.quantity)}{item.unit}</b>
              <button type="button" onClick={() => { setAdditionalWorks(previous => previous.filter(record => record.id !== item.id)); onChanged() }} aria-label="追加作業を削除">×</button>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

${appAnchor}`
s = s.replace(appAnchor, component)
console.log('OK: 最終確認コンポーネントを追加')

// 物件ごとの追加作業stateと、全体共通のよく使う項目state。
replaceOnce(
  "  const [floorTrimRecords, setFloorTrimRecords] = useState([])",
  "  const [floorTrimRecords, setFloorTrimRecords] = useState([])\n  const [additionalWorks, setAdditionalWorks] = useState([])\n  const [commonAdditionalWorks, setCommonAdditionalWorks] = useState(() => {\n    try {\n      const stored = JSON.parse(localStorage.getItem(commonAdditionalWorksKey) || 'null')\n      return Array.isArray(stored) && stored.length ? stored : defaultCommonAdditionalWorks\n    } catch {\n      return defaultCommonAdditionalWorks\n    }\n  })",
  '追加作業stateを追加'
)

// 保存済み物件を開く。
replaceOnce(
  "    setFloorTrimRecords(Array.isArray(entry.floorTrimRecords) ? entry.floorTrimRecords : [])",
  "    setFloorTrimRecords(Array.isArray(entry.floorTrimRecords) ? entry.floorTrimRecords : [])\n    setAdditionalWorks(Array.isArray(entry.additionalWorks) ? entry.additionalWorks : [])",
  '保存済み物件から追加作業を読込'
)

// 物件データの正規化・保存済み一覧。
replaceOnce(
  "        floorTrimRecords: Array.isArray(entry.floorTrimRecords) ? entry.floorTrimRecords : [],",
  "        floorTrimRecords: Array.isArray(entry.floorTrimRecords) ? entry.floorTrimRecords : [],\n        additionalWorks: Array.isArray(entry.additionalWorks) ? entry.additionalWorks : [],",
  '保存済み物件の追加作業を正規化'
)

// 採寸開始時に保存データを読み込む。
replaceOnce(
  "      setFloorTrimRecords(Array.isArray(savedData?.floorTrimRecords) ? savedData.floorTrimRecords : [])",
  "      setFloorTrimRecords(Array.isArray(savedData?.floorTrimRecords) ? savedData.floorTrimRecords : [])\n      setAdditionalWorks(Array.isArray(savedData?.additionalWorks) ? savedData.additionalWorks : [])",
  '採寸開始時に追加作業を読込'
)

// 新規・エラー時にリセット。
replaceOnce(
  "      setFloorTrimRecords([])\n      setProjectRooms(defaultRooms)",
  "      setFloorTrimRecords([])\n      setAdditionalWorks([])\n      setProjectRooms(defaultRooms)",
  '新規案件では追加作業を空にする'
)

// 保存データ本体へ追加。
replaceOnce(
  "      floorTrimRecords,\n      draftMemo",
  "      floorTrimRecords,\n      additionalWorks,\n      draftMemo",
  '物件ごとに追加作業を保存'
)

// 部屋名変更・削除にも連動。
const renameAnchor = `    setFloorTrimRecords(previous => previous.map(record => ({
      ...record,
      roomA: record.roomA === oldName ? newName : record.roomA,
      roomB: record.roomB === oldName ? newName : record.roomB,
    })))`
if (s.includes(renameAnchor)) {
  s = s.replace(renameAnchor, renameAnchor + `
    setAdditionalWorks(previous => previous.map(record => record.room === oldName ? { ...record, room: newName } : record))`)
  console.log('OK: 部屋名変更を追加作業へ連動')
}
replaceOnce(
  "    setFloorTrimRecords(previous => previous.filter(record => record.roomA !== roomName && record.roomB !== roomName))",
  "    setFloorTrimRecords(previous => previous.filter(record => record.roomA !== roomName && record.roomB !== roomName))\n    setAdditionalWorks(previous => previous.filter(record => record.room !== roomName))",
  '部屋削除を追加作業へ連動'
)

// 採寸カテゴリに最終確認を追加。
const floorTrimTab = `<button type="button" className={activePage === 'floorTrim' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('floorTrim')}>床見切り</button>`
if (!s.includes(floorTrimTab)) {
  console.error('採寸カテゴリの床見切りタブが見つかりません。')
  process.exit(1)
}
s = s.replace(floorTrimTab, floorTrimTab + `
                <button type="button" className={activePage === 'review' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('review')}>✅ 最終確認</button>`)
console.log('OK: 最終確認タブを追加')

// ページ見出し。
s = s.replace(
  ": activePage === 'cf' ? 'CF採寸' : activePage === 'soft' ? 'ソフト巾木' : '床見切り'}",
  ": activePage === 'cf' ? 'CF採寸' : activePage === 'soft' ? 'ソフト巾木' : activePage === 'floorTrim' ? '床見切り' : '最終確認'}"
)

// 最終確認ページを床見切り分岐より前に追加。
const renderAnchor = `            ) : activePage === 'floorTrim' ? (
              <FloorTrimSection rooms={rooms} records={floorTrimRecords} setRecords={setFloorTrimRecords} onChanged={markUnsaved} />`
if (!s.includes(renderAnchor)) {
  console.error('画面切替の床見切り部分が見つかりません。')
  process.exit(1)
}
const renderReview = `            ) : activePage === 'review' ? (
              <FinalReviewPage
                rooms={rooms}
                crossTotal={records.reduce((sum, record) => sum + getRecordQuantity(record), 0) * Math.max(0, Number(caseCrossFactor) || Number(pricingSettings.crossFactor) || 0)}
                cfTotal={cfRecords.reduce((sum, record) => sum + getLengthQuantity(record), 0) * 1.8}
                softTotal={softRecords.reduce((sum, record) => sum + getSoftBaseboardQuantity(record), 0)}
                floorTrimTotal={floorTrimRecords.reduce((sum, record) => sum + Math.max(0, Number(record.quantity) || 0), 0)}
                additionalWorks={additionalWorks}
                setAdditionalWorks={setAdditionalWorks}
                commonWorks={commonAdditionalWorks}
                setCommonWorks={setCommonAdditionalWorks}
                onChanged={markUnsaved}
              />
            ) : activePage === 'floorTrim' ? (
              <FloorTrimSection rooms={rooms} records={floorTrimRecords} setRecords={setFloorTrimRecords} onChanged={markUnsaved} />`
s = s.replace(renderAnchor, renderReview)
console.log('OK: 最終確認ページを画面切替へ追加')

if (s === original) {
  console.error('変更がありません。')
  process.exit(1)
}
fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('OK: バックアップ作成 ' + backup)
console.log('完了: 最終確認 + 追加作業 + 共通のよく使う項目を追加しました。')
console.log('次に npm run build を実行してください。')
