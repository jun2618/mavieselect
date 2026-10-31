const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-additional-work-tap-edit-v2');
const MARKER = '/* M-CROSS_ADDITIONAL_WORK_TAP_EDIT_V2 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');
if (source.includes(MARKER)) {
  console.log('SKIP: 追加作業タップ編集V2は適用済みです。');
  process.exit(0);
}

function replaceOnce(label, oldText, newText) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) {
    console.error(`ERROR: ${label} の対象が ${count} 件でした。安全のため中止しました。`);
    process.exit(1);
  }
  source = source.replace(oldText, newText);
}

// 1. 編集中IDを追加
replaceOnce(
  '追加作業state',
  "  const [work, setWork] = useState('')\n  const [quantity, setQuantity] = useState('1')\n  const [unit, setUnit] = useState('式')\n  const [unitPrice, setUnitPrice] = useState('')\n  const [memo, setMemo] = useState('')",
  "  const [work, setWork] = useState('')\n  const [quantity, setQuantity] = useState('1')\n  const [unit, setUnit] = useState('式')\n  const [unitPrice, setUnitPrice] = useState('')\n  const [memo, setMemo] = useState('')\n  const [editingAdditionalWorkId, setEditingAdditionalWorkId] = useState('')\n\n  " + MARKER
);

// 2. addWorkを新規登録・更新兼用へ変更
const oldAddWork = `  function addWork(event) {
    event.preventDefault()
    const numericQuantity = Number(quantity)
    const numericUnitPrice = Math.max(0, Number(unitPrice) || 0)
    if (!room || !work.trim() || !Number.isFinite(numericQuantity) || numericQuantity <= 0) return
    setAdditionalWorks(previous => [...previous, {
      id: createRecordId(), room, work: work.trim(), quantity: numericQuantity, unit,
      unitPrice: numericUnitPrice, amount: numericQuantity * numericUnitPrice, memo: memo.trim(),
    }])
    setWork('')
    setQuantity('1')
    setUnitPrice('')
    setMemo('')
    onChanged()
    onRegistered?.()
  }`;

const newAddWork = `  function resetAdditionalWorkEditor() {
    setEditingAdditionalWorkId('')
    setRoom(rooms[0] || '')
    setWork('')
    setQuantity('1')
    setUnit('式')
    setUnitPrice('')
    setMemo('')
  }

  function startEditingAdditionalWork(item) {
    setEditingAdditionalWorkId(item.id)
    setRoom(item.room || rooms[0] || '')
    setWork(item.work || '')
    setQuantity(String(item.quantity ?? '1'))
    setUnit(item.unit || '式')
    setUnitPrice(String(item.unitPrice ?? ''))
    setMemo(item.memo || '')
    window.setTimeout(() => {
      document.querySelector('.additionalWorkForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 0)
  }

  function addWork(event) {
    event.preventDefault()
    const numericQuantity = Number(quantity)
    const numericUnitPrice = Math.max(0, Number(unitPrice) || 0)
    if (!room || !work.trim() || !Number.isFinite(numericQuantity) || numericQuantity <= 0) return

    const nextItem = {
      id: editingAdditionalWorkId || createRecordId(), room, work: work.trim(), quantity: numericQuantity, unit,
      unitPrice: numericUnitPrice, amount: numericQuantity * numericUnitPrice, memo: memo.trim(),
    }

    setAdditionalWorks(previous => editingAdditionalWorkId
      ? previous.map(item => item.id === editingAdditionalWorkId ? nextItem : item)
      : [...previous, nextItem]
    )
    resetAdditionalWorkEditor()
    onChanged()
    onRegistered?.()
  }`;
replaceOnce('addWork関数', oldAddWork, newAddWork);

// 3. フォームに編集状態を表示
const formAnchor = '        <form className="additionalWorkForm" onSubmit={addWork}>';
replaceOnce(
  '追加作業フォーム',
  formAnchor,
  `${formAnchor}
          {editingAdditionalWorkId && (
            <div className="additionalWorkEditNotice">
              <strong>✏️ 追加作業を編集中</strong>
              <button type="button" onClick={resetAdditionalWorkEditor}>編集をキャンセル</button>
            </div>
          )}`
);

// 4. 登録ボタンを更新表示に変更
replaceOnce(
  '追加作業登録ボタン',
  '<button className="add" type="submit">＋ 追加作業を登録</button>',
  `<button className="add" type="submit">
            {editingAdditionalWorkId ? '✓ 追加作業を更新' : '＋ 追加作業を登録'}
          </button>`
);

// 5. 登録済み行をタップ可能に。削除ボタンの操作は親へ伝播させない
const oldItem = `            <div className="additionalWorkItem" key={item.id}>
              <div><strong>{item.room}　{item.work}</strong><small>{item.memo || 'メモなし'}</small></div>
              <div><b>{formatQuantity(item.quantity)}{item.unit}</b><small>{formatYen(Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</small></div>`;
const newItem = `            <div
              className={\`additionalWorkItem additionalWorkEditable ${editingAdditionalWorkId === item.id ? 'editing' : ''}\`}
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => startEditingAdditionalWork(item)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  startEditingAdditionalWork(item)
                }
              }}
              aria-label={item.room + 'の' + item.work + 'を編集'}
            >
              <div><strong>{item.room}　{item.work}</strong><small>{item.memo || 'メモなし'}・タップして編集</small></div>
              <div><b>{formatQuantity(item.quantity)}{item.unit}</b><small>{formatYen(Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</small></div>`;
replaceOnce('追加作業一覧行', oldItem, newItem);

// 削除ボタンの既存onClickへ stopPropagation を追加
const deleteNeedle = "onClick={() => { setAdditionalWorks(previous => previous.filter(record => record.id !== item.id)); onChanged() }}";
if (source.includes(deleteNeedle)) {
  source = source.replace(deleteNeedle, "onClick={event => { event.stopPropagation(); setAdditionalWorks(previous => previous.filter(record => record.id !== item.id)); if (editingAdditionalWorkId === item.id) resetAdditionalWorkEditor(); onChanged() }}");
} else {
  const deleteRegex = /onClick=\{\(\) => \{\s*setAdditionalWorks\(previous => previous\.filter\(record => record\.id !== item\.id\)\)\s*;?\s*onChanged\(\)\s*\}\}/;
  const matches = source.match(deleteRegex) || [];
  if (matches.length !== 1) {
    console.error(`ERROR: 追加作業削除ボタンの対象が ${matches.length} 件でした。安全のため中止しました。`);
    process.exit(1);
  }
  source = source.replace(deleteRegex, "onClick={event => { event.stopPropagation(); setAdditionalWorks(previous => previous.filter(record => record.id !== item.id)); if (editingAdditionalWorkId === item.id) resetAdditionalWorkEditor(); onChanged() }}");
}

// 6. CSS
const styleAnchor = source.includes('<style>{appStyles}</style>')
  ? '<style>{appStyles}</style>'
  : (source.includes('<style>{styles}</style>') ? '<style>{styles}</style>' : null);
if (!styleAnchor) {
  console.error('ERROR: style要素を特定できません。');
  process.exit(1);
}

const css = `
.additionalWorkEditable{cursor:pointer;border-radius:11px;padding-left:8px;padding-right:8px;transition:background .16s,border-color .16s,transform .16s}
.additionalWorkEditable:hover,.additionalWorkEditable:focus-visible{background:rgba(110,145,232,.09);outline:2px solid rgba(110,145,232,.40);outline-offset:2px}
.additionalWorkEditable.editing{background:rgba(99,190,161,.13);outline:2px solid rgba(99,190,161,.58);outline-offset:2px}
.additionalWorkEditNotice{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;padding:10px 12px;border:1px solid rgba(99,190,161,.55);border-radius:12px;background:rgba(99,190,161,.11)}
.additionalWorkEditNotice button{min-height:38px;padding:6px 10px;border:1px solid rgba(99,190,161,.55);border-radius:9px;background:rgba(255,255,255,.84);color:inherit;font:inherit;font-weight:800;cursor:pointer}
.theme-dark .additionalWorkEditNotice button,.theme-cyber .additionalWorkEditNotice button,.theme-luxury .additionalWorkEditNotice button,.theme-retro .additionalWorkEditNotice button,.theme-galaxy .additionalWorkEditNotice button{background:rgba(5,12,24,.82)}
`;
source = source.replace(styleAnchor, styleAnchor + '\n      <style>{`' + css + '`}</style>');

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: 追加作業のタップ編集V2を追加しました。');
console.log('登録済み行をタップすると入力欄へ戻り、更新ボタンで上書きできます。');
console.log('編集キャンセル、キーボードEnter/Space操作にも対応しています。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
