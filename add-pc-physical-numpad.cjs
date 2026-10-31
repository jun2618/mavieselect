const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-pc-physical-numpad');
const MARKER = '/* M-CROSS_PC_PHYSICAL_NUMPAD_V1 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');

if (source.includes(MARKER)) {
  console.log('SKIP: PC物理テンキー対応はすでに適用済みです。');
  process.exit(0);
}

if (!source.includes('M-CROSS_CROSS_CF_ENTER_KEY_V2')) {
  console.error('ERROR: EnterキーV2が見つからないため中止しました。');
  process.exit(1);
}

function replaceOnce(label, oldText, newText) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) {
    console.error(`ERROR: ${label} の対象が ${count} 件でした。安全のため中止します。`);
    process.exit(1);
  }
  source = source.replace(oldText, newText);
}

const cfHook = `  useEffect(() => {
    if (countOnly || !activeInput) return undefined

    function handlePhysicalNumpad(event) {
      const target = event.target
      const isEditable = target instanceof HTMLInputElement && !target.readOnly
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || target instanceof HTMLElement && target.isContentEditable
      if (isEditable) return

      if (/^Numpad[0-9]$/.test(event.code)) {
        event.preventDefault()
        updateInput(event.code.slice(-1))
        return
      }
      if (event.code === 'NumpadDecimal' || event.key === '.') {
        event.preventDefault()
        updateInput('decimal')
        return
      }
      if (event.code === 'NumpadEnter' || event.key === 'Enter') {
        event.preventDefault()
        handleMeasurementEnter()
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        updateInput('backspace')
        return
      }
      if (event.key === 'Escape' || event.key === 'Delete') {
        event.preventDefault()
        updateInput('clear')
      }
    }

    window.addEventListener('keydown', handlePhysicalNumpad)
    return () => window.removeEventListener('keydown', handlePhysicalNumpad)
  }, [countOnly, activeInput, length, count])

`;

replaceOnce(
  'CF物理テンキー挿入位置',
  '  function addRecord(event) {\n    event.preventDefault()',
  cfHook + '  function addRecord(event) {\n    event.preventDefault()'
);

const crossHook = `  useEffect(() => {
    if (!activeInput) return undefined

    function handlePhysicalNumpad(event) {
      const target = event.target
      const isEditable = target instanceof HTMLInputElement && !target.readOnly
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || target instanceof HTMLElement && target.isContentEditable
      if (isEditable) return

      if (/^Numpad[0-9]$/.test(event.code)) {
        event.preventDefault()
        updateCrossInput(event.code.slice(-1))
        return
      }
      if (event.code === 'NumpadDecimal' || event.key === '.') {
        event.preventDefault()
        updateCrossInput('decimal')
        return
      }
      if (event.code === 'NumpadEnter' || event.key === 'Enter') {
        event.preventDefault()
        handleCrossEnter()
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        updateCrossInput('backspace')
        return
      }
      if (event.key === 'Escape' || event.key === 'Delete') {
        event.preventDefault()
        updateCrossInput('clear')
      }
    }

    window.addEventListener('keydown', handlePhysicalNumpad)
    return () => window.removeEventListener('keydown', handlePhysicalNumpad)
  }, [activeInput, height, count])

`;

replaceOnce(
  'クロス物理テンキー挿入位置',
  '  function addCrossRecord(event) {\n    event.preventDefault()',
  crossHook + '  function addCrossRecord(event) {\n    event.preventDefault()'
);

const styleAnchor = source.includes('<style>{appStyles}</style>')
  ? '<style>{appStyles}</style>'
  : (source.includes('<style>{styles}</style>') ? '<style>{styles}</style>' : null);

if (!styleAnchor) {
  console.error('ERROR: style要素を特定できないため中止しました。');
  process.exit(1);
}

source = source.replace(styleAnchor, `${styleAnchor}\n      <style>{\`${MARKER}\`}</style>`);

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: PC物理テンキー操作をクロス・CFへ追加しました。');
console.log('数字: テンキー0～9');
console.log('小数点: テンキー .');
console.log('Enter: 項目移動 / 自動登録');
console.log('Backspace: 1文字削除');
console.log('Esc または Delete: 入力クリア');
console.log('ソフト巾木・床見切りには影響しません。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev でPC確認してください。');
