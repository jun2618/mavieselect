const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step9-history-nextaction-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_CASES_STEP9 */'
if (s.includes(marker)) { console.log('入居中案件 STEP9 は適用済みです'); process.exit(0) }
if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP7 */')) { console.error('STEP7が見つかりません。変更しませんでした。'); process.exit(1) }

// 共通の次アクション判定を追加
const normalizeTarget = 'function normalizeResidentCase(value) {'
if (!s.includes(normalizeTarget)) { console.error('normalizeResidentCaseが見つかりません。変更しませんでした。'); process.exit(1) }
const helper = `/* M-CROSS_RESIDENT_CASES_STEP9 */
function getResidentNextAction(status) {
  const map = {
    '未連絡': '入居者へ連絡',
    '不通': '入居者へ再連絡',
    '不通（メール送信）': '入居者からの連絡を確認',
    '連絡済（現調日確定）': '現調へ訪問',
    '連絡済（作業日確定）': '工事へ訪問',
    '連絡済（入居者のスケジュール確認待ち）': '入居者から日程回答を確認',
    '見積提出済（発注待ち）': '発注状況を確認',
    '発注（未連絡）': '入居者へ工事日を連絡',
    '発注（不通）': '入居者へ再連絡',
    '発注（工事日確定）': '工事へ訪問',
    '完了（未報告）': '管理会社へ完了報告',
    '完了': '対応完了',
  }
  return map[status] || ''
}

`
s = s.replace(normalizeTarget, helper + normalizeTarget)

// normalize時、既存nextActionが空ならstatusから自動設定
const nextActionLine = "    nextAction: source.nextAction || '',"
if (!s.includes(nextActionLine)) { console.error('nextAction項目が見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(nextActionLine, "    nextAction: source.nextAction || getResidentNextAction(source.status || '未連絡'),")

// quick status内の重複mapを共通関数へ変更
const mapStart = s.indexOf('    const nextActionMap = {', s.indexOf('function applyResidentQuickStatus'))
const mapEnd = s.indexOf('    updateResidentCase(caseId, {', mapStart)
if (mapStart !== -1 && mapEnd !== -1) {
  const chunk = s.slice(mapStart, mapEnd)
  s = s.replace(chunk, '')
  s = s.replace("      nextAction: nextActionMap[status] || '',", "      nextAction: getResidentNextAction(status),")
}

// STEP7 import関数を拡張: LogDataを既存/新規案件に紐付ける
const importStart = s.indexOf('  async function importResidentCasesExcel(fileValue) {')
const importEnd = s.indexOf('\n  function updateResidentCase(', importStart)
if (importStart === -1 || importEnd === -1) { console.error('STEP7取込関数範囲が見つかりません。変更しませんでした。'); process.exit(1) }
let block = s.slice(importStart, importEnd)

// import内nextActionMapを共通関数へ
const localMapStart = block.indexOf('          const nextActionMap = {')
const importedPush = block.indexOf('          importedCases.push(', localMapStart)
if (localMapStart !== -1 && importedPush !== -1) {
  block = block.slice(0, localMapStart) + block.slice(importedPush)
  block = block.replace("            status, nextAction: nextActionMap[status] || '',", "            status, nextAction: getResidentNextAction(status),")
}

const countsTarget = `      const activeCount = readCases(findSheet(['依頼一覧']), '')
      const orderCount = readCases(findSheet(['発注待ち一覧']), '見積提出済（発注待ち）')
      const completedCount = readCases(findSheet(['完了一覧']), '完了')`
if (!block.includes(countsTarget)) { console.error('STEP7シート読込位置が見つかりません。変更しませんでした。'); process.exit(1) }
const logCode = `${countsTarget}

      // LogData の対応履歴を物件名＋号室で紐付けます。
      let historyCount = 0
      const logSheet = findSheet(['LogData', 'ログデータ'])
      if (logSheet) {
        let logHeaderRow = 0
        let logHeaders = []
        logSheet.eachRow((row, rowNumber) => {
          if (logHeaderRow) return
          const values = row.values.slice(1).map(normalizeHeader)
          const hits = values.filter(value => ['日時', '日付', '物件名', '物件', '号室', 'ステータス', '進捗', 'メモ', '内容'].includes(value)).length
          if (hits >= 3) { logHeaderRow = rowNumber; logHeaders = values }
        })
        if (logHeaderRow) {
          const logIndex = aliases => {
            const index = logHeaders.findIndex(header => aliases.includes(header))
            return index >= 0 ? index + 1 : 0
          }
          const dateIndex = logIndex(['日時', '日付'])
          const propertyIndex = logIndex(['物件名', '物件'])
          const unitIndex = logIndex(['号室'])
          const statusIndex = logIndex(['ステータス', '進捗'])
          const memoIndex = logIndex(['メモ', '内容', '備考'])

          for (let rowNumber = logHeaderRow + 1; rowNumber <= logSheet.rowCount; rowNumber += 1) {
            const row = logSheet.getRow(rowNumber)
            const propertyName = text(propertyIndex ? row.getCell(propertyIndex).value : '')
            const unit = text(unitIndex ? row.getCell(unitIndex).value : '').replace(/号室$/u, '')
            const statusText = text(statusIndex ? row.getCell(statusIndex).value : '')
            const memoText = text(memoIndex ? row.getCell(memoIndex).value : '')
            if (!propertyName && !unit && !statusText && !memoText) continue
            const rawDate = dateIndex ? row.getCell(dateIndex).value : null
            let at = new Date().toISOString()
            if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) at = rawDate.toISOString()
            else {
              const parsed = new Date(text(rawDate))
              if (!Number.isNaN(parsed.getTime())) at = parsed.toISOString()
            }
            const match = importedCases.find(item => item.propertyName === propertyName && item.unit === unit)
            if (!match) continue
            match.history = [...(match.history || []), {
              id: createResidentCaseId(), at, status: statusText || '対応履歴', memo: memoText,
            }]
            historyCount += 1
          }
        }
      }`
block = block.replace(countsTarget, logCode)
block = block.replace("'件\\n\\nM-Crossへ登録しますか？'", "'件\\n対応履歴: ' + historyCount + '件\\n\\nM-Crossへ登録しますか？'")
s = s.slice(0, importStart) + block + s.slice(importEnd)

// 期限未設定警告を案件カードへ追加
const dueLine = `{item.actionDueDate && <small>期限：{item.actionDueDate}</small>}`
if (!s.includes(dueLine)) { console.error('期限表示位置が見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(dueLine, `{item.actionDueDate ? <small>期限：{item.actionDueDate}</small> : (!item.completed && item.status !== '完了' && <small className="residentNoDue">⚠ 次回対応日が未設定</small>)}`)

const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) { console.error('CSS位置が見つかりません。変更しませんでした。'); process.exit(1) }
const css = `/* M-CROSS_RESIDENT_CASES_STEP9_STYLE */
.residentNoDue{display:inline-flex;width:fit-content;padding:4px 8px;border:1px solid rgba(211,132,35,.35);border-radius:999px;background:rgba(255,184,67,.12);color:#a96610!important;font-weight:850}.theme-dark .residentNoDue,.theme-cyber .residentNoDue,.theme-luxury .residentNoDue,.theme-retro .residentNoDue,.theme-galaxy .residentNoDue{color:#ffd27d!important}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('入居中案件 STEP9 OK')
console.log('進捗→次にやること自動設定 / LogData履歴取込 / 次回対応日未設定警告を追加しました')
console.log('既に取り込んだ46件へLogDataを反映するには、同じExcelを再取込してください')
console.log('案件本体の重複はスキップし、今回の履歴取込は新規importedCasesへの紐付けです')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
