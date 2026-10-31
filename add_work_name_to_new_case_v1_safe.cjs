const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backup = appPath + '.before-work-name-v1'
const marker = 'M-CROSS_WORK_NAME_V1_SAFE'

function stop(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}
function count(text, token) {
  return text.split(token).length - 1
}

if (!fs.existsSync(appPath)) stop('src/App.jsx が見つかりません。')
let app = fs.readFileSync(appPath, 'utf8')
if (app.includes(marker)) {
  console.log('SKIP: 工事名V1は適用済みです。')
  process.exit(0)
}

const unitState = "  const [unit, setUnit] = useState('')"
const siteMemoState = "  const [siteMemo, setSiteMemo] = useState('')"
const unitLabel = `              <label>
                <span>号室</span>`
const startButtonText = '採寸を開始'

if (count(app, unitState) !== 1) stop('unit stateを一意に特定できません。')
if (count(app, siteMemoState) !== 1) stop('siteMemo stateを一意に特定できません。')
if (!app.includes(startButtonText)) stop('採寸開始ボタンが見つかりません。')

// getSaveKeyは既存呼び出しを壊さないよう、第4引数を任意追加する。
const saveKeyRegex = /function getSaveKey\(company,\s*property,\s*unit\)\s*\{([\s\S]*?)\n\}/
const saveKeyMatch = app.match(saveKeyRegex)
if (!saveKeyMatch) stop('getSaveKey(company, property, unit) が見つかりません。')

fs.copyFileSync(appPath, backup)

try {
  // 1) state
  app = app.replace(unitState, `${unitState}\n  /* ${marker} */\n  const [workName, setWorkName] = useState('原状回復工事')`)

  // 2) 保存キー。元のreturn式へ工事名サフィックスを足す。
  const oldFunction = saveKeyMatch[0]
  let body = saveKeyMatch[1]
  if (!/return\s+/.test(body)) throw new Error('getSaveKeyのreturnが見つかりません。')
  body = body.replace(/return\s+([^\n]+)/, (all, expression) => {
    return `return (${expression.trim()}) + (workName ? '::work:' + String(workName).trim() : '')`
  })
  const newFunction = `function getSaveKey(company, property, unit, workName = '') {${body}\n}`
  app = app.replace(oldFunction, newFunction)

  // 3) 現在案件の保存キー呼び出しへ workName を渡す。
  const currentKeyCalls = [
    'getSaveKey(company, selectedProperty, unit)',
    'getSaveKey(company, { name: selectedProperty?.name, address: selectedProperty?.address }, unit)',
  ]
  let replacedKeyCall = false
  for (const token of currentKeyCalls) {
    if (app.includes(token)) {
      app = app.split(token).join(token.slice(0, -1) + ', workName)')
      replacedKeyCall = true
    }
  }
  if (!replacedKeyCall) throw new Error('現在案件のgetSaveKey呼び出しが見つかりません。')

  // インポート時は保存データ側の工事名を使う。
  app = app.replace(
    'getSaveKey(imported.company, { name: imported.propertyName, address: imported.address }, imported.unit)',
    'getSaveKey(imported.company, { name: imported.propertyName, address: imported.address }, imported.unit, imported.workName || \'原状回復工事\')'
  )

  // 4) 新規入力UI。号室入力labelの終了直後を構造的に探す。
  const unitStart = app.indexOf(unitLabel)
  if (unitStart < 0) throw new Error('新規登録画面の号室欄が見つかりません。')
  const unitLabelEnd = app.indexOf('              </label>', unitStart)
  if (unitLabelEnd < 0) throw new Error('号室欄の終了位置が見つかりません。')
  const unitInsert = unitLabelEnd + '              </label>'.length
  const workUi = `

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
  app = app.slice(0, unitInsert) + workUi + app.slice(unitInsert)

  // 5) 新規リセット時。unitリセットの直後へ既定工事名を戻す。
  app = app.replace(/setUnit\(''\)/g, match => `${match}\n    setWorkName('原状回復工事')`)

  // 6) 開いた保存データからworkNameを復元。
  const loadUnit = '    setUnit(entry.unit || \'\')'
  if (!app.includes(loadUnit)) throw new Error('保存案件ロード時のunit設定が見つかりません。')
  app = app.replace(loadUnit, `${loadUnit}\n    setWorkName(entry.workName || '原状回復工事')`)

  // 7) 保存オブジェクトへworkNameを追加。propertyName, address, unit の並びを限定して置換。
  const saveObjectRegex = /(propertyName:\s*selectedProperty\?\.name\s*\|\|\s*'',[\s\S]{0,180}?address:\s*selectedProperty\?\.address\s*\|\|\s*'',[\s\S]{0,120}?unit,)/
  if (!saveObjectRegex.test(app)) throw new Error('保存オブジェクトの物件・住所・号室部分が見つかりません。')
  app = app.replace(saveObjectRegex, match => `${match}\n      workName: String(workName || '').trim() || '原状回復工事',`)

  // 8) 開始前必須チェック。startMeasurement先頭へ工事名確認を追加。
  const startAnchor = '  function startMeasurement() {'
  if (!app.includes(startAnchor)) throw new Error('startMeasurement関数が見つかりません。')
  app = app.replace(startAnchor, `${startAnchor}\n    if (!String(workName || '').trim()) { window.alert('工事名を入力してください。'); return }`)

  // 9) 画面上の物件・号室表示へ工事名を追加。
  const propertyLine = `<p className="propertyLine">{selectedProperty?.name}　{unit}号室</p>`
  if (app.includes(propertyLine)) {
    app = app.replace(propertyLine, `<p className="propertyLine">{selectedProperty?.name}　{unit}号室　{workName}</p>`)
  }

  fs.writeFileSync(appPath, app, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 新規案件の工事名V1を追加し、ビルド成功を確認しました。')
  console.log('  - 新規登録時に工事名を必須入力')
  console.log('  - 同じ物件・号室でも工事名が違えば別保存キー')
  console.log('  - 保存データへworkNameを保持')
  console.log('  - 既存データは原状回復工事として読込')
  console.log('BACKUP: ' + backup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backup)) fs.copyFileSync(backup, appPath)
  process.exit(1)
}
