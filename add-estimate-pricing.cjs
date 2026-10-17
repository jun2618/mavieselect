const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'App.jsx');
if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file);
  process.exit(1);
}

let s = fs.readFileSync(file, 'utf8');
const original = s;

function replaceOnce(oldText, newText, label) {
  const count = s.split(oldText).length - 1;
  if (count !== 1) {
    console.error(`置換失敗: ${label} (一致数: ${count})`);
    process.exit(1);
  }
  s = s.replace(oldText, newText);
  console.log('OK:', label);
}

function insertBefore(anchor, text, label) {
  const count = s.split(anchor).length - 1;
  if (count !== 1) {
    console.error(`挿入失敗: ${label} (一致数: ${count})`);
    process.exit(1);
  }
  s = s.replace(anchor, text + anchor);
  console.log('OK:', label);
}

// 1. 基本単価のキーと初期値
replaceOnce(
`const propertyMasterKey = 'm-cross:property-master:v1'`,
`const propertyMasterKey = 'm-cross:property-master:v1'
const pricingSettingsKey = 'm-cross:pricing-settings:v1'
const defaultPricingSettings = {
  crossRates: {
    '天井': 650,
    '収納天井': 650,
    '壁': 650,
    '収納壁': 650,
  },
  cfRate: 2600,
  softRate: 0,
  crossFactor: 1,
}`,
'単価設定の初期値を追加'
);

// 2. 単価設定の読込・金額表示ヘルパー
insertBefore(
`function createRecordId() {`,
`function loadPricingSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(pricingSettingsKey) || 'null')
    if (!stored || typeof stored !== 'object') return defaultPricingSettings
    return {
      ...defaultPricingSettings,
      ...stored,
      crossRates: {
        ...defaultPricingSettings.crossRates,
        ...(stored.crossRates || {}),
      },
    }
  } catch {
    return defaultPricingSettings
  }
}

function formatYen(value) {
  return new Intl.NumberFormat('ja-JP').format(Math.round(Number(value) || 0)) + '円'
}

`,
'単価設定ヘルパーを追加'
);

// 3. 概算表示CSS
insertBefore(
`  .saveStatus {`,
`  .estimateSettings { display:grid; gap:14px; }
  .estimateSettingsGrid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr)); gap:12px; }
  .estimateSettingsGrid label { margin:0; }
  .estimateIntro { margin:0 0 14px; color:#8e8190; line-height:1.7; }
  .estimateRoom { display:grid; gap:10px; margin-bottom:16px; padding:15px; border:1px solid #f0d6c8; border-radius:16px; background:rgba(255,255,255,.82); }
  .estimateRoom h3 { margin:0; color:#514751; font-size:20px; }
  .estimateRow { display:grid; grid-template-columns:minmax(0,1.5fr) minmax(70px,.7fr) minmax(80px,.7fr) minmax(96px,.8fr); gap:8px; align-items:center; padding:10px 0; border-bottom:1px solid #f0e7e1; }
  .estimateRow:last-child { border-bottom:0; }
  .estimateRow strong { color:#514751; }
  .estimateNumber { text-align:right; white-space:nowrap; }
  .estimateTotal { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:18px; padding:18px; border-radius:16px; color:#6d5865; background:#fff0d8; font-size:20px; font-weight:900; }
  .estimateTotal strong { color:#c96358; font-size:28px; }
  .estimateNote { margin:16px 0 0; padding:14px; border:1px dashed #efc7b4; border-radius:14px; color:#806f7b; background:#fff9f1; line-height:1.7; }
  .estimateFactor { display:grid; gap:8px; margin-bottom:16px; }
  .estimateFactor input { width:100%; min-height:54px; padding:0 15px; border:2px solid #efe4dc; border-radius:14px; font:inherit; }
  @media (max-width:520px) {
    .estimateRow { grid-template-columns:minmax(0,1fr) auto; }
    .estimateRow .estimateUnit,.estimateRow .estimateRate { grid-column:1 / -1; text-align:left; color:#958896; }
  }
`,
'概算金額用CSSを追加'
);

// 4. state追加
replaceOnce(
`  const [theme, setTheme] = useState(() => readPreference(themeKey, 'beige'))`,
`  const [theme, setTheme] = useState(() => readPreference(themeKey, 'beige'))
  const [pricingSettings, setPricingSettings] = useState(loadPricingSettings)`,
'基本単価stateを追加'
);
replaceOnce(
`  const [showRoomManagement, setShowRoomManagement] = useState(false)`,
`  const [showRoomManagement, setShowRoomManagement] = useState(false)
  const [showEstimate, setShowEstimate] = useState(false)
  const [caseCrossFactor, setCaseCrossFactor] = useState(() => String(loadPricingSettings().crossFactor))`,
'概算画面stateを追加'
);

// 5. 単価設定保存関数
insertBefore(
`  function changeFontSize(value) {`,
`  function updatePricingSetting(field, value, crossType = '') {
    const numericValue = Math.max(0, Number(value) || 0)
    setPricingSettings(previous => {
      const next = crossType
        ? { ...previous, crossRates: { ...previous.crossRates, [crossType]: numericValue } }
        : { ...previous, [field]: numericValue }
      try { localStorage.setItem(pricingSettingsKey, JSON.stringify(next)) } catch { /* 任意設定 */ }
      return next
    })
  }

`,
'単価設定保存関数を追加'
);

// 6. 設定画面へ単価設定UIを追加
replaceOnce(
`              <h2 style={{ marginTop: 28 }}>管理会社・物件管理</h2>`,
`              <h2 style={{ marginTop: 28 }}>概算金額の基本設定</h2>
              <div className="estimateSettings">
                <p className="estimateIntro">ここで設定した単価と換算率を、新しい案件の概算金額に使用します。</p>
                <div className="estimateSettingsGrid">
                  {measurementTypes.map(type => (
                    <label key={type}>
                      <span>クロス {type}（円／㎡）</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={pricingSettings.crossRates[type]}
                        onChange={event => updatePricingSetting('', event.target.value, type)}
                      />
                    </label>
                  ))}
                  <label>
                    <span>CF（円／㎡）</span>
                    <input type="number" min="0" step="1" value={pricingSettings.cfRate} onChange={event => updatePricingSetting('cfRate', event.target.value)} />
                  </label>
                  <label>
                    <span>ソフト巾木（円／枚）</span>
                    <input type="number" min="0" step="1" value={pricingSettings.softRate} onChange={event => updatePricingSetting('softRate', event.target.value)} />
                  </label>
                  <label>
                    <span>クロス基本換算率</span>
                    <input type="number" min="0" step="0.01" value={pricingSettings.crossFactor} onChange={event => updatePricingSetting('crossFactor', event.target.value)} />
                  </label>
                </div>
              </div>

              <h2 style={{ marginTop: 28 }}>管理会社・物件管理</h2>`,
'設定画面へ単価設定を追加'
);

// 7. 保存済み案件読込時に案件換算率を復元
replaceOnce(
`    setMeasurementType(entry.measurementType || '天井')`,
`    setMeasurementType(entry.measurementType || '天井')
    setCaseCrossFactor(String(entry.caseCrossFactor ?? pricingSettings.crossFactor))`,
'保存済み案件の換算率を復元'
);
replaceOnce(
`      setMeasurementType(savedData?.measurementType || '天井')`,
`      setMeasurementType(savedData?.measurementType || '天井')
      setCaseCrossFactor(String(savedData?.caseCrossFactor ?? pricingSettings.crossFactor))`,
'採寸開始時の換算率を復元'
);
replaceOnce(
`      setMeasurementType('天井')`,
`      setMeasurementType('天井')
      setCaseCrossFactor(String(pricingSettings.crossFactor))`,
'読込失敗時の換算率を初期化'
);

// 8. 保存データへ案件換算率を追加
replaceOnce(
`        measurementType: entry.measurementType || '天井',`,
`        measurementType: entry.measurementType || '天井',
        caseCrossFactor: Number(entry.caseCrossFactor ?? pricingSettings.crossFactor),`,
'上書き保存へ換算率を追加'
);
replaceOnce(
`      measurementType,
      archived,`,
`      measurementType,
      caseCrossFactor: Math.max(0, Number(caseCrossFactor) || 0),
      archived,`,
'通常保存へ換算率を追加'
);

// 9. 案件を開く時に概算ページを閉じる
s = s.replaceAll(
`    setShowRoomManagement(false)`,
`    setShowRoomManagement(false)
    setShowEstimate(false)`
);
console.log('OK: 案件開始時に概算ページを閉じる');

// 10. 見出しへ概算金額を追加
replaceOnce(
`              {showRoomManagement
                ? '部屋管理'
                : activePage === 'cross'`,
`              {showEstimate
                ? '概算金額'
                : showRoomManagement
                  ? '部屋管理'
                  : activePage === 'cross'`,
'概算金額タイトルを追加'
);

// 11. Excelボタンの後ろへ概算金額ボタンを追加
replaceOnce(
`              <button
                className="secondaryButton"
                type="button"
                onClick={() => downloadExcel({
                  company,
                  propertyName: selectedProperty?.name || '',
                  address: selectedProperty?.address || '',
                  unit,
                  records,
                  cfRecords,
                  softRecords,
                })}
              >
                Excel出力
              </button>`,
`              <button
                className="secondaryButton"
                type="button"
                onClick={() => downloadExcel({
                  company,
                  propertyName: selectedProperty?.name || '',
                  address: selectedProperty?.address || '',
                  unit,
                  records,
                  cfRecords,
                  softRecords,
                })}
              >
                Excel出力
              </button>
              <button
                className="secondaryButton"
                type="button"
                onClick={() => {
                  setShowEstimate(previous => !previous)
                  setShowRoomManagement(false)
                }}
              >
                {showEstimate ? '← 採寸画面へ戻る' : '💰 概算金額'}
              </button>`,
'概算金額ボタンを追加'
);

// 12. 採寸カテゴリと部屋管理ボタンは概算表示中に隠す
replaceOnce(
`            {!showRoomManagement && (`,
`            {!showRoomManagement && !showEstimate && (`,
'概算表示中は採寸カテゴリを非表示'
);
replaceOnce(
`            <button
              className="measurementCheckButton"
              type="button"
              onClick={() => setShowRoomManagement(previous => !previous)}`, 
`            {!showEstimate && (
              <button
                className="measurementCheckButton"
                type="button"
                onClick={() => setShowRoomManagement(previous => !previous)}`,
'概算表示中は部屋管理ボタンを非表示'
);
replaceOnce(
`              {showRoomManagement ? '← 採寸画面へ戻る' : '⚙ 部屋管理'}
            </button>

            {showRoomManagement ? (`,
`                {showRoomManagement ? '← 採寸画面へ戻る' : '⚙ 部屋管理'}
              </button>
            )}

            {showEstimate ? (() => {
              const factor = Math.max(0, Number(caseCrossFactor) || 0)
              const estimateRows = []

              records.forEach(record => {
                const measured = getRecordQuantity(record)
                const billed = measured * factor
                const rate = Number(pricingSettings.crossRates[record.type] || 0)
                estimateRows.push({
                  room: record.room,
                  label: 'クロス張替 ' + record.type + (record.memo ? '（' + record.memo + '）' : ''),
                  quantity: billed,
                  unit: '㎡',
                  rate,
                  amount: billed * rate,
                  measured,
                })
              })
              cfRecords.forEach(record => {
                const quantity = getLengthQuantity(record)
                const rate = Number(pricingSettings.cfRate || 0)
                estimateRows.push({ room: record.room, label: 'CF貼り' + (record.memo ? '（' + record.memo + '）' : ''), quantity, unit: '㎡', rate, amount: quantity * rate })
              })
              softRecords.forEach(record => {
                const quantity = getSoftBaseboardQuantity(record)
                const rate = Number(pricingSettings.softRate || 0)
                estimateRows.push({ room: record.room, label: 'ソフト巾木', quantity, unit: '枚', rate, amount: quantity * rate })
              })

              const totalAmount = estimateRows.reduce((sum, row) => sum + row.amount, 0)
              return (
                <section className="card">
                  <h2>{selectedProperty?.name} {unit}号室</h2>
                  <p className="estimateIntro">退去時にお客様へ提示するための概算です。正式見積ではありません。</p>
                  <label className="estimateFactor">
                    <span>この案件のクロス換算率</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={caseCrossFactor}
                      onChange={event => {
                        setCaseCrossFactor(event.target.value)
                        markUnsaved()
                      }}
                    />
                    <small>例：1mを1㎡で計算する場合は1.0、0.9㎡で計算する場合は0.9</small>
                  </label>

                  {estimateRows.length === 0 ? (
                    <p className="empty">概算できる採寸データがありません</p>
                  ) : rooms.map(roomName => {
                    const roomRows = estimateRows.filter(row => row.room === roomName)
                    if (roomRows.length === 0) return null
                    return (
                      <section className="estimateRoom" key={roomName}>
                        <h3>{roomName}</h3>
                        {roomRows.map((row, index) => (
                          <div className="estimateRow" key={row.label + '-' + index}>
                            <strong>{row.label}</strong>
                            <span className="estimateNumber estimateUnit">{formatQuantity(row.quantity)}{row.unit}</span>
                            <span className="estimateNumber estimateRate">× {formatYen(row.rate)}</span>
                            <span className="estimateNumber"><strong>{formatYen(row.amount)}</strong></span>
                          </div>
                        ))}
                      </section>
                    )
                  })}

                  <div className="estimateTotal">
                    <span>概算合計</span>
                    <strong>{formatYen(totalAmount)}</strong>
                  </div>
                  <p className="estimateNote">概算金額です。実際の施工内容、使用材料、下地の状態、現場状況などにより金額が変更となる場合があります。</p>
                </section>
              )
            })() : showRoomManagement ? (`,
'概算金額ページを追加'
);

// 13. 残存構造チェック
const required = ['pricingSettingsKey', 'showEstimate', '💰 概算金額', '概算合計', 'caseCrossFactor']
const missing = required.filter(item => !s.includes(item))
if (missing.length) {
  console.error('追加後の確認に失敗:', missing.join(', '))
  process.exit(1)
}

if (s === original) {
  console.error('変更がありませんでした')
  process.exit(1)
}

const backup = file + '.before-estimate-pricing'
fs.writeFileSync(backup, original, 'utf8')
fs.writeFileSync(file, s, 'utf8')
console.log('\n完了')
console.log('更新:', file)
console.log('バックアップ:', backup)
console.log('次に実行: npm run build')
