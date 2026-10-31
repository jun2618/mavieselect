const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-additional-work-tap-edit-v3');
const MARKER = '/* M-CROSS_ADDITIONAL_WORK_TAP_EDIT_V3 */';

if (!fs.existsSync(appPath)) { console.error('ERROR: src/App.jsx が見つかりません。'); process.exit(1); }
let s = fs.readFileSync(appPath, 'utf8');
if (s.includes(MARKER)) { console.log('SKIP: 追加作業タップ編集V3は適用済みです。'); process.exit(0); }

// 1) FinalReviewPageのstateへ編集IDを追加
const stateRe = /(function FinalReviewPage\([\s\S]*?const \[memo, setMemo\] = useState\(''\))/;
if (!stateRe.test(s)) { console.error('ERROR: FinalReviewPageのstate位置を特定できません。'); process.exit(1); }
s = s.replace(stateRe, `$1\n  const [editingAdditionalWorkId, setEditingAdditionalWorkId] = useState('')\n\n  ${MARKER}`);

// 2) 現在のaddWork関数だけを置換
const addStart = s.indexOf('  function addWork(event) {', s.indexOf('function FinalReviewPage('));
const addEnd = s.indexOf('\n  /* M-CROSS_AUTO_FREQUENT_WORK_SUGGESTIONS_V3 */', addStart);
if (addStart < 0 || addEnd < 0) { console.error('ERROR: addWork関数の範囲を特定できません。'); process.exit(1); }

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
      id: editingAdditionalWorkId || createRecordId(),
      room,
      work: work.trim(),
      quantity: numericQuantity,
      unit,
      unitPrice: numericUnitPrice,
      amount: numericQuantity * numericUnitPrice,
      memo: memo.trim(),
    }

    setAdditionalWorks(previous => editingAdditionalWorkId
      ? previous.map(item => item.id === editingAdditionalWorkId ? nextItem : item)
      : [...previous, nextItem]
    )
    resetAdditionalWorkEditor()
    onChanged()
    onRegistered?.()
  }
`;

s = s.slice(0, addStart) + newAddWork + s.slice(addEnd);

// 3) フォーム先頭へ編集通知
const formAnchor = '        <form className="additionalWorkForm" onSubmit={addWork}>';
if ((s.split(formAnchor).length - 1) !== 1) { console.error('ERROR: 追加作業フォームを一意に特定できません。'); process.exit(1); }
s = s.replace(formAnchor, `${formAnchor}
          {editingAdditionalWorkId && (
            <div className="additionalWorkEditNotice">
              <strong>✏️ 追加作業を編集中</strong>
              <button type="button" onClick={resetAdditionalWorkEditor}>編集をキャンセル</button>
            </div>
          )}`);

// 4) 登録ボタン表示を更新対応へ
const submitRe = /<button className="add" type="submit">[^<]*追加作業[^<]*<\/button>/;
if (!submitRe.test(s)) { console.error('ERROR: 追加作業登録ボタンを特定できません。'); process.exit(1); }
s = s.replace(submitRe, `<button className="add" type="submit">
            {editingAdditionalWorkId ? '✓ 追加作業を更新' : '＋ 追加作業を登録'}
          </button>`);

// 5) 登録済み追加作業の行へタップ編集を追加
const listStart = s.indexOf('{additionalWorks.length === 0 ?', s.indexOf('function FinalReviewPage('));
const itemStart = s.indexOf('<div className="additionalWorkItem" key={item.id}>', listStart);
if (itemStart < 0) { console.error('ERROR: 追加作業一覧行を特定できません。'); process.exit(1); }
s = s.slice(0, itemStart) + `<div
              className={\`additionalWorkItem additionalWorkEditable \${editingAdditionalWorkId === item.id ? 'editing' : ''}\`}
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
            >` + s.slice(itemStart + '<div className="additionalWorkItem" key={item.id}>'.length);

// 6) 削除ボタンだけ親タップを止める
const afterItem = s.indexOf('className={\`additionalWorkItem additionalWorkEditable', listStart);
const deleteButtonStart = s.indexOf('<button', afterItem);
const deleteButtonEnd = s.indexOf('</button>', deleteButtonStart);
if (deleteButtonStart < 0 || deleteButtonEnd < 0) { console.error('ERROR: 追加作業削除ボタンを特定できません。'); process.exit(1); }
let deleteButton = s.slice(deleteButtonStart, deleteButtonEnd + 9);
if (!deleteButton.includes('record.id !== item.id')) { console.error('ERROR: 検出したボタンが削除ボタンではありません。'); process.exit(1); }
deleteButton = deleteButton.replace(/onClick=\{\(\) => \{/, "onClick={event => { event.stopPropagation(); if (editingAdditionalWorkId === item.id) resetAdditionalWorkEditor();");
s = s.slice(0, deleteButtonStart) + deleteButton + s.slice(deleteButtonEnd + 9);

// 7) CSS
const styleAnchor = s.includes('<style>{appStyles}</style>') ? '<style>{appStyles}</style>' : (s.includes('<style>{styles}</style>') ? '<style>{styles}</style>' : null);
if (!styleAnchor) { console.error('ERROR: style要素を特定できません。'); process.exit(1); }
const css = `
.additionalWorkEditable{cursor:pointer;border-radius:11px;padding-left:8px;padding-right:8px;transition:background .16s,outline-color .16s}
.additionalWorkEditable:hover,.additionalWorkEditable:focus-visible{background:rgba(110,145,232,.09);outline:2px solid rgba(110,145,232,.42);outline-offset:2px}
.additionalWorkEditable.editing{background:rgba(99,190,161,.13);outline:2px solid rgba(99,190,161,.62);outline-offset:2px}
.additionalWorkEditNotice{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;padding:10px 12px;border:1px solid rgba(99,190,161,.55);border-radius:12px;background:rgba(99,190,161,.11)}
.additionalWorkEditNotice button{min-height:38px;padding:6px 10px;border:1px solid rgba(99,190,161,.55);border-radius:9px;background:rgba(255,255,255,.84);color:inherit;font:inherit;font-weight:800;cursor:pointer}
.theme-dark .additionalWorkEditNotice button,.theme-cyber .additionalWorkEditNotice button,.theme-luxury .additionalWorkEditNotice button,.theme-retro .additionalWorkEditNotice button,.theme-galaxy .additionalWorkEditNotice button{background:rgba(5,12,24,.82)}
`;
s = s.replace(styleAnchor, styleAnchor + '\n      <style>{`' + css + '`}</style>');

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, s, 'utf8');
console.log('OK: 追加作業のタップ編集V3を追加しました。');
console.log('登録済み行をタップ → 入力欄で修正 → 更新ボタンで上書きできます。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
