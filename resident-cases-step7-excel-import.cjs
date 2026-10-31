const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-cases-step7-excel-import-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_CASES_STEP7 */'
if (s.includes(marker)) {
  console.log('入居中案件 STEP7 はすでに適用済みです')
  process.exit(0)
}
if (!s.includes('/* M-CROSS_RESIDENT_CASES_STEP6 */')) {
  console.error('STEP6が見つかりません。変更しませんでした。')
  process.exit(1)
}

// import用state
const stateTarget = "  const [residentHistoryMemo, setResidentHistoryMemo] = useState('')"
if (!s.includes(stateTarget)) {
  console.error('入居中案件stateが見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(stateTarget, `${stateTarget}
  /* M-CROSS_RESIDENT_CASES_STEP7 */
  const residentExcelInputRef = useRef(null)`)

// Excel読込関数をApp内へ追加
const functionTarget = '  function updateResidentCase(caseId, patch, historyStatus = \'\', historyMemo = \'\') {'
if (!s.includes(functionTarget)) {
  console.error('案件更新関数の位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const helpers = `  async function importResidentCasesExcel(fileValue) {
    if (!fileValue) return
    try {
      const { default: ExcelJS } = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await fileValue.arrayBuffer())

      const text = value => {
        if (value == null) return ''
        if (typeof value === 'object' && value.text != null) return String(value.text).trim()
        if (typeof value === 'object' && value.result != null) return String(value.result).trim()
        return String(value).trim()
      }
      const dateText = value => {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
          const pad = n => String(n).padStart(2, '0')
          return value.getFullYear() + '-' + pad(value.getMonth() + 1) + '-' + pad(value.getDate())
        }
        return text(value).replace(/\//g, '-').replace(/\./g, '-')
      }
      const normalizeHeader = value => text(value).replace(/[\s　\r\n]+/g, '')
      const findSheet = names => names.map(name => workbook.getWorksheet(name)).find(Boolean)

      const importedCases = []
      const duplicateKeys = new Set(residentCases.map(item => [item.propertyName, item.unit, item.requestDate, item.requestDetails].join('|')))

      function readCases(sheet, fallbackStatus = '') {
        if (!sheet) return 0
        let headerRowNumber = 0
        let headers = []
        const headerAliases = {
          requestDate: ['依頼日', '受付日'], company: ['管理会社'], propertyName: ['物件名', '物件'], unit: ['号室'],
          address: ['住所'], residentContact: ['連絡先', '電話番号', '入居者連絡先'], status: ['進捗', 'ステータス'],
          requestDetails: ['内容', '依頼内容'], note: ['備考'], siteVisitAt: ['現調日', '現地調査日'], workVisitAt: ['工事日', '作業日'], caution: ['注意事項']
        }
        sheet.eachRow((row, rowNumber) => {
          if (headerRowNumber) return
          const values = row.values.slice(1).map(normalizeHeader)
          const hits = values.filter(value => Object.values(headerAliases).flat().includes(value)).length
          if (hits >= 3) { headerRowNumber = rowNumber; headers = values }
        })
        if (!headerRowNumber) return 0
        const indexFor = key => {
          const aliases = headerAliases[key]
          const index = headers.findIndex(header => aliases.includes(header))
          return index >= 0 ? index + 1 : 0
        }
        let count = 0
        for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
          const row = sheet.getRow(rowNumber)
          const propertyName = text(indexFor('propertyName') ? row.getCell(indexFor('propertyName')).value : '')
          const unit = text(indexFor('unit') ? row.getCell(indexFor('unit')).value : '').replace(/号室$/u, '')
          const requestDetails = text(indexFor('requestDetails') ? row.getCell(indexFor('requestDetails')).value : '')
          if (!propertyName && !unit && !requestDetails) continue
          const requestDate = dateText(indexFor('requestDate') ? row.getCell(indexFor('requestDate')).value : '')
          const rawStatus = text(indexFor('status') ? row.getCell(indexFor('status')).value : '')
          const status = residentCaseStatuses.includes(rawStatus) ? rawStatus : (fallbackStatus || '未連絡')
          const key = [propertyName, unit, requestDate, requestDetails].join('|')
          if (duplicateKeys.has(key)) continue
          duplicateKeys.add(key)
          const now = new Date().toISOString()
          const nextActionMap = {
            '未連絡': '入居者へ連絡', '不通': '入居者へ再連絡', '不通（メール送信）': '入居者からの連絡を確認',
            '見積提出済（発注待ち）': '発注状況を確認', '発注（未連絡）': '入居者へ工事日を連絡',
            '完了（未報告）': '管理会社へ完了報告', '完了': '対応完了'
          }
          importedCases.push(normalizeResidentCase({
            id: createResidentCaseId(), requestDate,
            company: text(indexFor('company') ? row.getCell(indexFor('company')).value : ''),
            propertyName, unit,
            address: text(indexFor('address') ? row.getCell(indexFor('address')).value : ''),
            residentContact: text(indexFor('residentContact') ? row.getCell(indexFor('residentContact')).value : ''),
            requestDetails,
            note: text(indexFor('note') ? row.getCell(indexFor('note')).value : ''),
            status, nextAction: nextActionMap[status] || '',
            siteVisitAt: dateText(indexFor('siteVisitAt') ? row.getCell(indexFor('siteVisitAt')).value : ''),
            workVisitAt: dateText(indexFor('workVisitAt') ? row.getCell(indexFor('workVisitAt')).value : ''),
            caution: text(indexFor('caution') ? row.getCell(indexFor('caution')).value : ''),
            completed: status === '完了',
            history: [{ id: createResidentCaseId(), at: now, status: 'Excel移行', memo: sheet.name + 'から移行' }],
            createdAt: now, updatedAt: now,
          }))
          count += 1
        }
        return count
      }

      const activeCount = readCases(findSheet(['依頼一覧']), '')
      const orderCount = readCases(findSheet(['発注待ち一覧']), '見積提出済（発注待ち）')
      const completedCount = readCases(findSheet(['完了一覧']), '完了')

      if (importedCases.length === 0) {
        window.alert('取り込める案件が見つかりませんでした。シート名と見出しをご確認ください。')
        return
      }

      const message = 'Excelから ' + importedCases.length + '件を検出しました。\\n\\n依頼一覧: ' + activeCount + '件\\n発注待ち一覧: ' + orderCount + '件\\n完了一覧: ' + completedCount + '件\\n\\nM-Crossへ登録しますか？'
      if (!window.confirm(message)) return

      setResidentCases(previous => [...importedCases, ...previous])
      window.alert(importedCases.length + '件をM-Crossへ登録しました。')
    } catch (error) {
      console.error(error)
      window.alert('Excelを読み込めませんでした。元の入居中案件Excelをご確認ください。')
    } finally {
      if (residentExcelInputRef.current) residentExcelInputRef.current.value = ''
    }
  }

`
s = s.replace(functionTarget, helpers + functionTarget)

// トップバーにExcel取込ボタンとhidden inputを追加
const buttonTarget = `<button className="primary residentNewCaseButton" type="button" onClick={() => { setResidentCaseFormError(''); setShowResidentCaseForm(true) }}>＋ 新規案件</button>`
if (!s.includes(buttonTarget)) {
  console.error('新規案件ボタンが見つかりません。変更しませんでした。')
  process.exit(1)
}
const buttons = `<div className="residentImportActions">
                    ${buttonTarget}
                    <button className="secondaryButton residentImportButton" type="button" onClick={() => residentExcelInputRef.current?.click()}>📥 Excelから取り込む</button>
                    <input ref={residentExcelInputRef} type="file" accept=".xlsx,.xlsm" hidden onChange={event => importResidentCasesExcel(event.target.files?.[0])} />
                  </div>`
s = s.replace(buttonTarget, buttons)

const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) {
  console.error('CSS追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
const css = `/* M-CROSS_RESIDENT_CASES_STEP7_STYLE */
.residentImportActions{display:flex;align-items:center;gap:8px}.residentImportActions .residentNewCaseButton,.residentImportActions .residentImportButton{width:auto;margin:0}@media(max-width:620px){.residentCasesTopbar{align-items:stretch}.residentImportActions{display:grid;grid-template-columns:1fr}.residentImportActions .residentNewCaseButton,.residentImportActions .residentImportButton{width:100%}}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('入居中案件 STEP7 OK')
console.log('依頼一覧 / 発注待ち一覧 / 完了一覧 のExcel取込を追加しました')
console.log('重複候補は 物件名＋号室＋依頼日＋依頼内容 でスキップします')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
