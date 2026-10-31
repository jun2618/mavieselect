const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-ui-enter-fix-backup'
if (!fs.existsSync(file)) throw new Error('src/App.jsx が見つかりません')

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_CF_UI_ENTER_FIX_V1 */'
if (s.includes(marker)) {
  console.log('CF UI / Enter修正は適用済みです')
  process.exit(0)
}

const start = s.indexOf('function LengthMeasurementPage({')
const end = s.indexOf('\nfunction FloorTrimSection(', start)
if (start < 0 || end < 0) throw new Error('LengthMeasurementPage の範囲を確認できません。変更していません')

let c = s.slice(start, end)

// Enter動作を安定化: 長さ -> 本数 -> 登録後に長さへ戻す。
const enterStart = c.indexOf('  function handleMeasurementEnter() {')
const enterEnd = c.indexOf('\n  useEffect(() => {', enterStart)
if (enterStart < 0 || enterEnd < 0) throw new Error('handleMeasurementEnter を確認できません。変更していません')

const newEnter = `  ${marker}\n  function handleMeasurementEnter() {
    if (countOnly) return

    if (activeInput === 'length') {
      const numericLength = Number(String(length).replace(/[。．]/g, '.'))
      if (!Number.isFinite(numericLength) || numericLength <= 0) return

      setActiveInput('count')
      requestAnimationFrame(() => {
        lengthInputAreaRef.current
          ?.querySelector('input[aria-label="CF本数入力"], input[data-length-count="count"]')
          ?.focus()
      })
      return
    }

    if (activeInput === 'count') {
      const numericLength = Number(String(length).replace(/[。．]/g, '.'))
      const numericCount = Number(String(count).replace(/[。．]/g, '.'))
      if (!Number.isFinite(numericLength) || numericLength <= 0) return
      if (!Number.isFinite(numericCount) || numericCount <= 0) return

      addRecord({ preventDefault() {} })
      requestAnimationFrame(() => setActiveInput('length'))
    }
  }
`
c = c.slice(0, enterStart) + newEnter + c.slice(enterEnd)

// 2つの入力を識別できるように属性を追加。
c = c.replace(
  'readOnly value={length} onFocus={() => setActiveInput(\'length\')}',
  'readOnly data-length-count="length" aria-label="CF長さ入力" value={length} onFocus={() => setActiveInput(\'length\')}'
)
c = c.replace(
  'readOnly value={count} onFocus={() => setActiveInput(\'count\')}',
  'readOnly data-length-count="count" aria-label="CF本数入力" value={count} onFocus={() => setActiveInput(\'count\')}'
)

s = s.slice(0, start) + c + s.slice(end)

// CF材料割当の見た目を整える。既存CSSより後段に入るため安全に上書き。
const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) throw new Error('CSS追加位置を確認できません。変更していません')

const css = `/* M-CROSS_CF_UI_POLISH_V1 */
.cfMaterialPanel{margin-top:18px;padding:16px;border:1px solid rgba(89,130,210,.28);border-radius:20px;background:linear-gradient(180deg,rgba(248,251,255,.98),rgba(239,245,255,.94));box-shadow:0 8px 24px rgba(34,74,130,.08)}
.cfMaterialPanel>h2{margin:0 0 6px;font-size:20px}.cfMaterialPanel>h3{margin:16px 0 8px;font-size:15px}
.cfMaterialAllocationSummary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0 16px}
.cfMaterialAllocationSummary .summaryLine{display:grid;gap:3px;padding:10px;border-radius:12px;background:rgba(255,255,255,.85);text-align:center}.cfMaterialAllocationSummary .summaryLine span{font-size:11px}.cfMaterialAllocationSummary .summaryLine strong{font-size:18px}
.cfMaterialChoices{display:grid;gap:8px}.cfMaterialChoice{display:flex;align-items:center;gap:12px;padding:12px 13px;border:1px solid rgba(95,130,190,.24);border-radius:14px;background:#fff;cursor:pointer}.cfMaterialChoice:has(input:checked){border-color:#688ee8;background:#eef4ff;box-shadow:0 0 0 2px rgba(104,142,232,.12)}
.cfMaterialChoice input{width:22px;height:22px;accent-color:#688ee8}.cfMaterialChoice span{display:grid;gap:2px}.cfMaterialChoice strong{font-size:15px}.cfMaterialChoice small{color:#687386}
.cfMaterialCreate,.cfMaterialGroup{display:grid;gap:10px;margin-top:12px;padding:14px;border:1px solid rgba(95,130,190,.25);border-radius:16px;background:rgba(255,255,255,.9)}
.cfMaterialGroupHeader{display:flex;align-items:center;justify-content:space-between}.cfMaterialGroupHeader strong{font-size:17px}.cfMaterialGroupHeader button{width:34px;height:34px;border:1px solid #e7a9ad;border-radius:50%;background:#fff2f3;color:#b33d47;font-size:19px;font-weight:900}
.cfMaterialGroup .summaryGrand,.cfMaterialCreate .summaryGrand{padding-top:8px;border-top:1px dashed rgba(90,120,170,.3)}
@media(max-width:520px){.cfMaterialPanel{padding:12px}.cfMaterialAllocationSummary{gap:6px}.cfMaterialAllocationSummary .summaryLine{padding:8px 4px}.cfMaterialAllocationSummary .summaryLine strong{font-size:16px}.cfMaterialChoice{padding:11px}.cfMaterialCreate,.cfMaterialGroup{padding:12px}}
.theme-dark .cfMaterialPanel,.theme-cyber .cfMaterialPanel,.theme-luxury .cfMaterialPanel,.theme-retro .cfMaterialPanel,.theme-galaxy .cfMaterialPanel{background:rgba(5,12,24,.9);color:inherit}.theme-dark .cfMaterialChoice,.theme-dark .cfMaterialCreate,.theme-dark .cfMaterialGroup,.theme-cyber .cfMaterialChoice,.theme-cyber .cfMaterialCreate,.theme-cyber .cfMaterialGroup,.theme-luxury .cfMaterialChoice,.theme-luxury .cfMaterialCreate,.theme-luxury .cfMaterialGroup,.theme-retro .cfMaterialChoice,.theme-retro .cfMaterialCreate,.theme-retro .cfMaterialGroup,.theme-galaxy .cfMaterialChoice,.theme-galaxy .cfMaterialCreate,.theme-galaxy .cfMaterialGroup{background:rgba(9,17,30,.88);color:inherit}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('CF UI / Enter修正 OK')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
