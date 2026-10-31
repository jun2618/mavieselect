const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backupPath = appPath + '.before-work-name-v5'
const marker = 'M-CROSS_WORK_NAME_V5_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let source = fs.readFileSync(appPath, 'utf8')

if (source.includes(marker)) {
  console.log('SKIP: 工事名V5は適用済みです。')
  process.exit(0)
}

const unitState = "  const [unit, setUnit] = useState('')"
const unitInputRegex = /<input\s+value=\{unit\}\s+onChange=\{event\s*=>\s*setUnit\(event\.target\.value\)\}\s+placeholder="例：501"\s*\/>/
const getSaveKeyRegex = /function getSaveKey\(company,\s*property,\s*unit\)\s*\{\s*return\s+`\$\{storagePrefix\}\$\{JSON\.stringify\(\[\s*company,\s*property\?\.name\s*\|\|\s*'',\s*property\?\.address\s*\|\|\s*'',\s*unit\.trim\(\),\s*\]\)\}`\s*\}/

if (!source.includes(unitState)) fail('unit stateが見つかりません。変更していません。')
const unitMatches = source.match(new RegExp(unitInputRegex.source, 'g')) || []
if (unitMatches.length !== 1) fail('新規登録の号室入力欄の一致数が ' + unitMatches.length + ' 件です。変更していません。')
const keyMatches = source.match(new RegExp(getSaveKeyRegex.source, 'g')) || []
if (keyMatches.length !== 1) fail('getSaveKey実コードの一致数が ' + keyMatches.length + ' 件です。変更していません。')

fs.copyFileSync(appPath, backupPath)

try {
  // 1. 工事名state
  source = source.replace(
    unitState,
    unitState + "\n  /* " + marker + " */\n  const [workName, setWorkName] = useState('原状回復工事')"
  )

  // 2. getSaveKeyを第4引数workName対応へ変更。既存3引数呼び出しは互換維持。
  source = source.replace(getSaveKeyRegex, `function getSaveKey(company, property, unit, workName = '') {
  return \`\${storagePrefix}\${JSON.stringify([
    company,
    property?.name || '',
    property?.address || '',
    unit.trim(),
    String(workName || '').trim(),
  ])}\`
}`)

  // 3. 号室labelの直後へ工事名入力欄を追加。
  const unitInputMatch = source.match(unitInputRegex)
  const inputIndex = unitInputMatch.index
  const labelCloseIndex = source.indexOf('</label>', inputIndex)
  if (labelCloseIndex < 0) throw new Error('号室labelの終了位置が見つかりません。')
  const insertIndex = labelCloseIndex + '</label>'.length
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
  source = source.slice(0, insertIndex) + workNameUi + source.slice(insertIndex)

  // 4. 現案件の保存キーへworkNameを渡す。
  let currentKeyChanges = 0
  source = source.replace(/getSaveKey\(company,\s*selectedProperty,\s*unit\)/g, () => {
    currentKeyChanges += 1
    return 'getSaveKey(company, selectedProperty, unit, workName)'
  })
  source = source.replace(/getSaveKey\(company,\s*\{\s*name:\s*selectedProperty\?\.name,\s*address:\s*selectedProperty\?\.address\s*\},\s*unit\)/g, () => {
    currentKeyChanges += 1
    return 'getSaveKey(company, { name: selectedProperty?.name, address: selectedProperty?.address }, unit, workName)'
  })
  if (currentKeyChanges < 1) throw new Error('現在案件のgetSaveKey呼び出しが見つかりません。')

  // 5. M-Crossファイル読込時は保存済みworkNameを使う。
  source = source.replace(
    /getSaveKey\(imported\.company,\s*\{\s*name:\s*imported\.propertyName,\s*address:\s*imported\.address\s*\},\s*imported\.unit\)/g,
    "getSaveKey(imported.company, { name: imported.propertyName, address: imported.address }, imported.unit, imported.workName || '原状回復工事')"
  )

  // 6. 保存データへworkNameを追加。
  const payloadNeedle = "      unit,\n      siteMemo,"
  if (!source.includes(payloadNeedle)) throw new Error('保存データのunit/siteMemo位置が見つかりません。')
  source = source.replace(
    payloadNeedle,
    "      unit,\n      workName: String(workName || '').trim() || '原状回復工事',\n      siteMemo,"
  )

  // 7. 保存案件を開くときに工事名を復元。
  const loadNeedle = "    setUnit(entry.unit || '')"
  if (!source.includes(loadNeedle)) throw new Error('保存案件の号室復元位置が見つかりません。')
  source = source.replace(
    loadNeedle,
    loadNeedle + "\n    setWorkName(entry.workName || '原状回復工事')"
  )

  // 8. 採寸開始時の必須確認。
  const startNeedle = '  function startMeasurement() {'
  if (!source.includes(startNeedle)) throw new Error('startMeasurement関数が見つかりません。')
  source = source.replace(
    startNeedle,
    startNeedle + "\n    if (!String(workName || '').trim()) { window.alert('工事名を入力してください。'); return }"
  )

  // 9. 新規登録へ戻る主要処理で既定値へ戻す。関数内のunitリセット直後だけに限定。
  const resetFunctions = ['resetForNewRegistration', 'showNewPropertyScreen']
  for (const functionName of resetFunctions) {
    const start = source.indexOf('function ' + functionName + '(')
    if (start < 0) continue
    const nextFunction = source.indexOf('\n  function ', start + 10)
    const end = nextFunction > start ? nextFunction : source.length
    const block = source.slice(start, end)
    if (block.includes("setUnit('')") && !block.includes("setWorkName('原状回復工事')")) {
      const updated = block.replace("setUnit('')", "setUnit('')\n    setWorkName('原状回復工事')")
      source = source.slice(0, start) + updated + source.slice(end)
    }
  }

  // 10. 採寸画面上部に工事名を表示。
  const propertyLine = '<p className="propertyLine">{selectedProperty?.name}　{unit}号室</p>'
  if (source.includes(propertyLine)) {
    source = source.replace(propertyLine, '<p className="propertyLine">{selectedProperty?.name}　{unit}号室　{workName}</p>')
  }

  fs.writeFileSync(appPath, source, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: getSaveKey実コード基準の工事名V5を適用し、ビルド成功を確認しました。')
  console.log('  - 新規登録時に工事名を入力')
  console.log('  - 同じ物件・号室でも工事名が違えば別案件')
  console.log('  - 既存データは工事名未設定として従来キーのまま保持')
  console.log('BACKUP: ' + backupPath)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, appPath)
  process.exit(1)
}
