const fs = require('fs')
const path = require('path')
const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-extra-works-estimate-display')
if (!fs.existsSync(file)) { console.error('見つかりません: ' + file); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
if (!s.includes('additionalWorks') || !s.includes('additionalWorkTotal')) {
  console.error('先に最終確認と追加作業の単価・金額機能を追加してください。変更せず終了しました。')
  process.exit(1)
}
const original = s

const oldEmpty = `{estimateRows.length === 0 ? (
                    <p className="empty">概算できる採寸データがありません</p>
                  ) : [`
const newEmpty = `{estimateRows.length === 0 && additionalWorks.length === 0 ? (
                    <p className="empty">概算できる採寸データがありません</p>
                  ) : [`
if (!s.includes(oldEmpty)) { console.error('概算の空表示判定が見つかりません。'); process.exit(1) }
s = s.replace(oldEmpty, newEmpty)

const oldSections = `                    { title: '床見切り', key: '__FLOOR_TRIM__', rows: estimateRows.filter(row => row.room === '__FLOOR_TRIM__') },
                  ].map(section => {`
const newSections = `                    { title: '床見切り', key: '__FLOOR_TRIM__', rows: estimateRows.filter(row => row.room === '__FLOOR_TRIM__') },
                    {
                      title: '内装工事以外',
                      key: '__ADDITIONAL_WORKS__',
                      rows: additionalWorks.map(item => ({
                        category: 'additionalWork',
                        label: [item.room, item.work].filter(Boolean).join(' '),
                        memo: item.memo || '',
                        quantity: Number(item.quantity || 0),
                        unit: item.unit || '式',
                        rate: Number(item.unitPrice || 0),
                        amount: Number(item.amount || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
                      })),
                    },
                  ].map(section => {`
if (!s.includes(oldSections)) { console.error('概算の表示セクションが見つかりません。'); process.exit(1) }
s = s.replace(oldSections, newSections)

if (s === original) { console.error('変更がありません。'); process.exit(1) }
fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('OK: バックアップ作成 ' + backup)
console.log('OK: 概算画面の最後に「内装工事以外」を追加')
console.log('OK: 部屋・作業内容・メモ・数量・単価・金額を表示')
console.log('OK: 概算合計には追加作業金額を含む現在の計算を維持')
console.log('完了: npm run build を実行してください。')
