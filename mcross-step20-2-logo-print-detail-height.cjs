const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.step20-2-logo-print-detail-height-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_STEP20_2_LOGO_PRINT_DETAIL_HEIGHT */'

if (s.includes(marker)) {
  console.log('STEP20.2は適用済みです')
  process.exit(0)
}

if (!s.includes('/* M-CROSS_STEP20_TEMPLATE_STYLE_FIX */')) {
  console.error('STEP20テンプレート版が見つかりません。変更しませんでした。')
  process.exit(1)
}

// 見積書テンプレートのMSロゴは、元テンプレート内の画像位置・大きさをそのまま維持します。
// 出力範囲を最下部の合計行まで1ページに収めます。
const worksheetNeedle = `      const ws = workbook.getWorksheet('見積書')
      if (!ws) throw new Error('テンプレートの「見積書」シートが見つかりません')`

if (!s.includes(worksheetNeedle)) {
  console.error('見積書シート取得位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(worksheetNeedle, `${worksheetNeedle}

      ${marker}
      // MSロゴは元テンプレートの描画オブジェクトを変更しない。
      // 印刷時は備考・小計・消費税・合計まで下端に含めて1ページ表示する。
      ws.pageSetup = {
        ...ws.pageSetup,
        orientation: 'portrait',
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        horizontalCentered: true,
        verticalCentered: false,
        margins: {
          left: 0.25,
          right: 0.25,
          top: 0.45,
          bottom: 0.35,
          header: 0.2,
          footer: 0.2,
        },
      }
      ws.pageSetup.printArea = 'B3:K57'`)

// 工事案件詳細を画面下まで白い作業面として表示する。
const anchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(anchor)) {
  console.error('CSS追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const css = `/* M-CROSS_STEP20_2_LOGO_PRINT_DETAIL_HEIGHT_STYLE */
.workOrderDetailPage{min-height:100vh!important;box-sizing:border-box!important;padding-bottom:28px!important}
.workOrderDetailPage>.workOrderDetail{min-height:calc(100vh - 44px)!important;box-sizing:border-box!important;padding-bottom:32px!important}
@media(min-width:980px){.workOrderDetailPage>.workOrderDetail{width:min(1180px,calc(100vw - 64px))!important;max-width:1180px!important}}
@media(max-width:700px){.workOrderDetailPage{padding-bottom:10px!important}.workOrderDetailPage>.workOrderDetail{min-height:calc(100vh - 16px)!important;padding-bottom:20px!important}}
`

s = s.replace(anchor, css + '\n' + anchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP20.2 ロゴ・印刷範囲・詳細画面高さ修正 OK')
console.log('MSロゴはテンプレート内の位置と大きさをそのまま維持します')
console.log('見積書はB3:K57を印刷範囲にし、合計欄まで1ページへ収めます')
console.log('工事案件詳細の白い作業面を画面下まで表示します')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
