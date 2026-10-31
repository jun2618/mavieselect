const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backupPath = appPath + '.before-work-name-v7'
const marker = 'M-CROSS_WORK_NAME_V7_EXACT'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}
function replaceOnce(text, regex, replacement, label) {
  const matches = [...text.matchAll(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g'))]
  if (matches.length !== 1) throw new Error(label + 'の一致数が ' + matches.length + ' 件です。')
  return text.replace(regex, replacement)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let source = fs.readFileSync(appPath, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: 工事名V7は適用済みです。')
  process.exit(0)
}

const unitState = "  const [unit, setUnit] = useState('')"
const unitInputRegex = /<input\s+value=\{unit\}\s+onChange=\{event\s*=>\s*setUnit\(event\.target\.value\)\}\s+placeholder="例：501"\s*\/>/
const getSaveKeyRegex = /function getSaveKey\(company,\s*property,\s*unit\)\s*\{[\s\S]*?\n\}/
const saveDataRegex = /const saveData = \{\s*company,\s*propertyName:\s*selectedProperty\.name,\s*address:\s*selectedProperty\.address,\s*unit:\s*unit\.trim\(\),\s*siteMemo:\s*siteMemo\.trim\(\),/
const draftRegex = /const draft = \{\s*company,\s*propertyName:\s*selectedProperty\.name\s*\|\|\s*'',\s*address:\s*selectedProperty\.address\s*\|\|\s*'',\s*unit:\s*unit\.trim\(\),\s*siteMemo:\s*siteMemo\.trim\(\),/
const normalizeRegex = /company:\s*value\.company,\s*propertyName:\s*value\.propertyName,\s*address:\s*value\.address,\s*unit:\s*value\.unit\.trim\(\),/
const overwriteRegex = /company:\s*entry\.company\s*\|\|\s*'',\s*propertyName:\s*entry\.propertyName\s*\|\|\s*'',\s*address:\s*entry\.address\s*\|\|\s*'',\s*unit:\s*entry\.unit\s*\|\|\s*'',\s*siteMemo:\s*entry\.siteMemo\s*\|\|\s*'',/

if (!source.includes(unitState)) fail('unit stateが見つかりません。')
for (const [regex, label] of [
  [unitInputRegex, '新規登録の号室欄'],
  [getSaveKeyRegex, 'getSaveKey関数'],
  [saveDataRegex, 'saveData実コード'],
  [draftRegex, 'working draft実コード'],
  [normalizeRegex, 'import正規化実コード'],
  [overwriteRegex, '上書き保存実コード'],
]) {
  const count = [...source.matchAll(new RegExp(regex.source, 'g'))].length
  if (count !== 1) fail(label + 'の一致数が ' + count + ' 件です。変更していません。')
}

fs.copyFileSync(appPath, backupPath)

try {
  // 1) State
  source = source.replace(
    unitState,
    `${unitState}\n  /* ${marker} */\n  const [workName, setWorkName] = useState('原状回復工事')`
  )

  // 2) getSaveKey: 既存3引数呼び出しも壊さない任意第4引数。
  source = replaceOnce(source, getSaveKeyRegex, `function getSaveKey(company, property, unit, workName = '') {
  return \`\${storagePrefix}\${JSON.stringify([
    company,
    property?.name || '',
    property?.address || '',
    unit.trim(),
    String(workName || '').trim(),
  ])}\`
}`, 'getSaveKey置換')

  // 3) 号室欄のlabel直後へ工事名UI。
  const unitMatch = source.match(unitInputRegex)
  const inputIndex = unitMatch.index
  const labelEnd = source.indexOf('</label>', inputIndex)
  if (labelEnd < 0) throw new Error('号室labelの終了位置が見つかりません。')
  const insertAt = labelEnd + '</label>'.length
  const workNameUi = `

              <label className="workNameField">
                <span>工事名 *</span>
                <input
                  list="mcross-work-name-options"
                  value={workName}
                  onChange={event => { setWorkName(event.target.value); setSaveStatus('') }}
                  placeholder="例：原状回復工事"
                />
                <datalist id="mcross-work-name-options">
                  <option value="原状回復工事" />
                  <option value="内装工事" />
                  <option value="修繕工事" />
                  <option value="設備工事" />
                </datalist>
                <small>同じ物件・号室でも、工事名が違えば別案件として保存します。</small>
              </label>`
  source = source.slice(0, insertAt) + workNameUi + source.slice(insertAt)

  // 4) 保存・下書き・インポート・上書き保存へworkName。
  source = replaceOnce(source, saveDataRegex, `const saveData = {
      company,
      propertyName: selectedProperty.name,
      address: selectedProperty.address,
      unit: unit.trim(),
      workName: String(workName || '').trim() || '原状回復工事',
      siteMemo: siteMemo.trim(),`, 'saveData追加')

  source = replaceOnce(source, draftRegex, `const draft = {
      company,
      propertyName: selectedProperty.name || '',
      address: selectedProperty.address || '',
      unit: unit.trim(),
      workName: String(workName || '').trim() || '原状回復工事',
      siteMemo: siteMemo.trim(),`, 'draft追加')

  source = replaceOnce(source, normalizeRegex, `company: value.company, propertyName: value.propertyName, address: value.address, unit: value.unit.trim(),
    workName: typeof value.workName === 'string' && value.workName.trim() ? value.workName.trim() : '原状回復工事',`, 'import正規化追加')

  source = replaceOnce(source, overwriteRegex, `company: entry.company || '',
        propertyName: entry.propertyName || '',
        address: entry.address || '',
        unit: entry.unit || '',
        workName: entry.workName || '原状回復工事',
        siteMemo: entry.siteMemo || '',`, '上書き保存追加')

  // 5) 現案件の保存キーに工事名を追加。
  let keyCallCount = 0
  source = source.replace(/getSaveKey\(company,\s*selectedProperty,\s*unit\)/g, () => {
    keyCallCount += 1
    return 'getSaveKey(company, selectedProperty, unit, workName)'
  })
  source = source.replace(/getSaveKey\(company,\s*\{\s*name:\s*selectedProperty\?\.name,\s*address:\s*selectedProperty\?\.address\s*\},\s*unit\)/g, () => {
    keyCallCount += 1
    return 'getSaveKey(company, { name: selectedProperty?.name, address: selectedProperty?.address }, unit, workName)'
  })
  if (keyCallCount < 1) throw new Error('現在案件のgetSaveKey呼び出しが見つかりません。')

  // 6) 読込ファイルの保存キー。
  source = source.replace(
    /getSaveKey\(imported\.company,\s*\{\s*name:\s*imported\.propertyName,\s*address:\s*imported\.address\s*\},\s*imported\.unit\)/g,
    "getSaveKey(imported.company, { name: imported.propertyName, address: imported.address }, imported.unit, imported.workName || '原状回復工事')"
  )

  // 7) 保存済み案件・下書き復元。
  const savedLoad = "    setUnit(entry.unit || '')"
  if (!source.includes(savedLoad)) throw new Error('保存案件の号室復元位置が見つかりません。')
  source = source.replace(savedLoad, `${savedLoad}\n    setWorkName(entry.workName || '原状回復工事')`)

  const draftLoad = "    setUnit(draft.unit || '')"
  if (source.includes(draftLoad)) {
    source = source.replace(draftLoad, `${draftLoad}\n    setWorkName(draft.workName || '原状回復工事')`)
  }

  // 8) 採寸開始前の必須チェック。
  const startFn = '  function startMeasurement() {'
  if (!source.includes(startFn)) throw new Error('startMeasurement関数が見つかりません。')
  source = source.replace(startFn, `${startFn}\n    if (!String(workName || '').trim()) { window.alert('工事名を入力してください。'); return }`)

  // 9) 新規登録へ戻る主要処理だけ初期化。
  for (const functionName of ['resetForNewRegistration', 'showNewPropertyScreen']) {
    const start = source.indexOf('function ' + functionName + '(')
    if (start < 0) continue
    const next = source.indexOf('\n  function ', start + 10)
    const end = next > start ? next : source.length
    let block = source.slice(start, end)
    if (block.includes("setUnit('')") && !block.includes("setWorkName('原状回復工事')")) {
      block = block.replace("setUnit('')", "setUnit('')\n    setWorkName('原状回復工事')")
      source = source.slice(0, start) + block + source.slice(end)
    }
  }

  // 10) 採寸画面上部にも工事名。
  const propertyLine = '<p className="propertyLine">{selectedProperty?.name}　{unit}号室</p>'
  if (source.includes(propertyLine)) {
    source = source.replace(propertyLine, '<p className="propertyLine">{selectedProperty?.name}　{unit}号室　{workName}</p>')
  }

  fs.writeFileSync(appPath, source, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 実コード対応の工事名V7を適用し、ビルド成功を確認しました。')
  console.log('  - saveData / draft / import / overwriteへ工事名を保存')
  console.log('  - 同じ物件・号室でも工事名違いを別保存')
  console.log('  - 既存データは原状回復工事として復元')
  console.log('BACKUP: ' + backupPath)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, appPath)
  process.exit(1)
}
