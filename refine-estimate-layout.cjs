const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'App.jsx');
if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file);
  process.exit(1);
}

let s = fs.readFileSync(file, 'utf8');
const original = s;

function replaceRequired(searchValue, replacement, label) {
  const before = s;
  s = s.replace(searchValue, replacement);
  if (s === before) {
    console.error('置換失敗: ' + label);
    process.exit(1);
  }
  console.log('OK:', label);
}

// 1. 概算画面のレイアウトを左揃えにする
replaceRequired(
  `  .estimateRow { display:grid; grid-template-columns:minmax(0,1.5fr) minmax(70px,.7fr) minmax(80px,.7fr) minmax(96px,.8fr); gap:8px; align-items:center; padding:10px 0; border-bottom:1px solid #f0e7e1; }`,
  `  .estimateRow { display:grid; grid-template-columns:minmax(0,1.5fr) minmax(70px,.7fr) minmax(80px,.7fr) minmax(96px,.8fr); gap:8px; align-items:center; padding:10px 0; border-bottom:1px solid #f0e7e1; text-align:left; }`,
  '概算明細を左揃えに変更'
);
replaceRequired(
  `  .estimateNumber { text-align:right; white-space:nowrap; }`,
  `  .estimateNumber { text-align:left; white-space:nowrap; }`,
  '数量・単価・金額を左揃えに変更'
);
replaceRequired(
  `  .estimateRoom h3 { margin:0; color:#514751; font-size:20px; }`,
  `  .estimateRoom h3 { margin:0; color:#514751; font-size:20px; text-align:left; }`,
  '部屋見出しを左揃えに変更'
);

// 2. スマホ用CSSも左揃えを維持
replaceRequired(
  `    .estimateRow .estimateUnit,.estimateRow .estimateRate { grid-column:1 / -1; text-align:left; color:#958896; }`,
  `    .estimateRow .estimateUnit,.estimateRow .estimateRate { grid-column:1 / -1; text-align:left; color:#958896; }
    .estimateRow .estimateNumber { text-align:left; }`,
  'スマホ表示の左揃えを固定'
);

// 3. 概算画面の処理全体を、安全に差し替える
const startMarker = `            {showEstimate ? (() => {`;
const endMarker = `            })() : showRoomManagement ? (`;
const start = s.indexOf(startMarker);
const end = s.indexOf(endMarker, start);

if (start === -1 || end === -1) {
  console.error('置換失敗: 現在の概算画面を特定できません');
  process.exit(1);
}

const newEstimateBlock = `            {showEstimate ? (() => {
              // お客様向け画面には換算率を表示せず、設定済みの案件換算率だけを計算に使用します。
              const factor = Math.max(0, Number(caseCrossFactor) || Number(pricingSettings.crossFactor) || 0)
              const estimateRows = []

              // クロスは「部屋・採寸区分・メモ」でまとめます。
              // メモなしは同じ部屋・区分で合計し、メモありはメモ内容ごとに分けます。
              rooms.forEach(roomName => {
                measurementTypes.forEach(type => {
                  const matchingRecords = records.filter(record =>
                    record.room === roomName && record.type === type
                  )
                  const groups = new Map()

                  matchingRecords.forEach(record => {
                    const memoText = String(record.memo || '').trim()
                    const key = memoText || '__NO_MEMO__'
                    const current = groups.get(key) || { memo: memoText, measured: 0 }
                    current.measured += getRecordQuantity(record)
                    groups.set(key, current)
                  })

                  groups.forEach(group => {
                    const billedQuantity = group.measured * factor
                    const rate = Number(pricingSettings.crossRates[type] || 0)
                    const typeLabel = type.startsWith('収納')
                      ? '収納 ' + type.replace('収納', '')
                      : type
                    estimateRows.push({
                      room: roomName,
                      category: 'cross',
                      label: roomName + typeLabel + (group.memo ? '（' + group.memo + '）' : ''),
                      quantity: billedQuantity,
                      unit: '㎡',
                      rate,
                      amount: billedQuantity * rate,
                    })
                  })
                })

                // CFは部屋ごとにまとめ、メモがあればメモ内容ごとに分けます。
                const cfGroups = new Map()
                cfRecords
                  .filter(record => record.room === roomName)
                  .forEach(record => {
                    const memoText = String(record.memo || '').trim()
                    const key = memoText || '__NO_MEMO__'
                    const current = cfGroups.get(key) || { memo: memoText, quantity: 0 }
                    current.quantity += getLengthQuantity(record)
                    cfGroups.set(key, current)
                  })
                cfGroups.forEach(group => {
                  const rate = Number(pricingSettings.cfRate || 0)
                  estimateRows.push({
                    room: roomName,
                    category: 'cf',
                    label: roomName + ' CF貼り' + (group.memo ? '（' + group.memo + '）' : ''),
                    quantity: group.quantity,
                    unit: '㎡',
                    rate,
                    amount: group.quantity * rate,
                  })
                })

                // ソフト巾木は部屋ごとの合計にします。
                const softQuantity = softRecords
                  .filter(record => record.room === roomName)
                  .reduce((sum, record) => sum + getSoftBaseboardQuantity(record), 0)
                if (softQuantity > 0) {
                  const rate = Number(pricingSettings.softRate || 0)
                  estimateRows.push({
                    room: roomName,
                    category: 'soft',
                    label: roomName + ' ソフト巾木',
                    quantity: softQuantity,
                    unit: '枚',
                    rate,
                    amount: softQuantity * rate,
                  })
                }
              })

              const totalAmount = estimateRows.reduce((sum, row) => sum + row.amount, 0)
              return (
                <section className="card">
                  <h2>{selectedProperty?.name} {unit}号室</h2>
                  <p className="estimateIntro">退去時にお客様へ提示するための概算です。正式見積ではありません。</p>

                  {estimateRows.length === 0 ? (
                    <p className="empty">概算できる採寸データがありません</p>
                  ) : rooms.map(roomName => {
                    const roomRows = estimateRows.filter(row => row.room === roomName)
                    if (roomRows.length === 0) return null
                    return (
                      <section className="estimateRoom" key={roomName}>
                        <h3>{roomName}</h3>
                        {roomRows.map((row, index) => (
                          <div className="estimateRow" key={row.category + '-' + row.label + '-' + index}>
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
`;

s = s.slice(0, start) + newEstimateBlock + s.slice(end);
console.log('OK: 概算明細を部屋・区分・メモ単位に集計');
console.log('OK: お客様向け画面から換算率表示を削除');
console.log('OK: 部屋の表示順を固定');

// 4. 構造チェック
const mustExist = [
  "const groups = new Map()",
  "label: roomName + typeLabel",
  "const roomRows = estimateRows.filter(row => row.room === roomName)",
  "概算合計",
];
const missing = mustExist.filter(text => !s.includes(text));
if (missing.length) {
  console.error('変更後の確認に失敗:', missing.join(', '));
  process.exit(1);
}

const mustNotExist = [
  '<span>この案件のクロス換算率</span>',
  '1mを1㎡で計算する場合は1.0',
];
const leftovers = mustNotExist.filter(text => s.includes(text));
if (leftovers.length) {
  console.error('お客様向け画面に換算率表示が残っています:', leftovers.join(', '));
  process.exit(1);
}

const backup = file + '.before-estimate-layout-refinement';
fs.writeFileSync(backup, original, 'utf8');
fs.writeFileSync(file, s, 'utf8');

console.log('\n完了');
console.log('更新:', file);
console.log('バックアップ:', backup);
console.log('次に実行: npm run build');
