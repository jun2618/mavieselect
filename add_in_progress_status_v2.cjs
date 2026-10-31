const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'App.jsx');
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-in-progress-v2.bak');

if (!fs.existsSync(file)) {
  console.error('ERROR: src/App.jsx が見つかりません。crossmeasureフォルダで実行してください。');
  process.exit(1);
}

let src = fs.readFileSync(file, 'utf8');
if (src.includes("'進行中'")) {
  console.log('OK: すでに「進行中」が追加されています。変更は不要です。');
  process.exit(0);
}

fs.copyFileSync(file, backup);
let count = 0;

function replaceOnce(search, replacement, label) {
  if (!src.includes(search)) {
    console.error('ERROR: ' + label + ' の対象が見つかりません。App.jsxは変更しません。');
    process.exit(2);
  }
  src = src.replace(search, replacement);
  count++;
}

// 1. ステータス一覧へ追加
replaceOnce(
  "  '発注（工事日確定）',\n  '完了（未報告）',",
  "  '発注（工事日確定）',\n  '進行中',\n  '完了（未報告）',",
  'ステータス一覧'
);

// 2. 次にやることの表示を追加
replaceOnce(
  "    '発注（工事日確定）': '工事へ訪問',\n    '完了（未報告）': '管理会社へ完了報告',",
  "    '発注（工事日確定）': '工事へ訪問',\n    '進行中': '工事を進める',\n    '完了（未報告）': '管理会社へ完了報告',",
  '次にやること'
);

// 3. 一覧集計を追加
replaceOnce(
  "                  const orderCases = activeCases.filter(item => item.status === '見積提出済（発注待ち）')\n                  const unreportedCases = activeCases.filter(item => item.status === '完了（未報告）')",
  "                  const orderCases = activeCases.filter(item => item.status === '見積提出済（発注待ち）')\n                  const inProgressCases = activeCases.filter(item => item.status === '進行中')\n                  const unreportedCases = activeCases.filter(item => item.status === '完了（未報告）')",
  '進行中の集計'
);

// 4. フィルター条件を追加
replaceOnce(
  "                    if (residentCaseFilter === 'order' && item.status !== '見積提出済（発注待ち）') return false\n                    if (residentCaseFilter === 'unreported' && item.status !== '完了（未報告）') return false",
  "                    if (residentCaseFilter === 'order' && item.status !== '見積提出済（発注待ち）') return false\n                    if (residentCaseFilter === 'inProgress' && item.status !== '進行中') return false\n                    if (residentCaseFilter === 'unreported' && item.status !== '完了（未報告）') return false",
  '進行中フィルター'
);

// 5. ダッシュボードカードを追加
replaceOnce(
  "                      <button type=\"button\" className={`residentDashboardCard order${residentCaseFilter === 'order' ? ' active' : ''}`} onClick={() => { setResidentCaseFilter('order'); setResidentCaseVisibleCount(10) }}><span>発注待ち</span><strong>{orderCases.length}</strong></button>\n                      <button type=\"button\" className={`residentDashboardCard report${residentCaseFilter === 'unreported' ? ' active' : ''}`} onClick={() => { setResidentCaseFilter('unreported'); setResidentCaseVisibleCount(10) }}><span>完了・未報告</span><strong>{unreportedCases.length}</strong></button>",
  "                      <button type=\"button\" className={`residentDashboardCard order${residentCaseFilter === 'order' ? ' active' : ''}`} onClick={() => { setResidentCaseFilter('order'); setResidentCaseVisibleCount(10) }}><span>発注待ち</span><strong>{orderCases.length}</strong></button>\n                      <button type=\"button\" className={`residentDashboardCard progress${residentCaseFilter === 'inProgress' ? ' active' : ''}`} onClick={() => { setResidentCaseFilter('inProgress'); setResidentCaseVisibleCount(10) }}><span>進行中</span><strong>{inProgressCases.length}</strong></button>\n                      <button type=\"button\" className={`residentDashboardCard report${residentCaseFilter === 'unreported' ? ' active' : ''}`} onClick={() => { setResidentCaseFilter('unreported'); setResidentCaseVisibleCount(10) }}><span>完了・未報告</span><strong>{unreportedCases.length}</strong></button>",
  'ダッシュボードカード'
);

// 6. 案件カードのクイック操作を追加
replaceOnce(
  "                          <button type=\"button\" onClick={() => applyResidentQuickStatus(item.id, '見積提出済（発注待ち）')}>発注待ち</button>\n                          <button type=\"button\" onClick={() => applyResidentQuickStatus(item.id, '完了（未報告）')}>完了・未報告</button>",
  "                          <button type=\"button\" onClick={() => applyResidentQuickStatus(item.id, '見積提出済（発注待ち）')}>発注待ち</button>\n                          <button type=\"button\" onClick={() => applyResidentQuickStatus(item.id, '進行中')}>進行中</button>\n                          <button type=\"button\" onClick={() => applyResidentQuickStatus(item.id, '完了（未報告）')}>完了・未報告</button>",
  'クイック操作ボタン'
);

fs.writeFileSync(file, src, 'utf8');
console.log('OK: 「進行中」を追加しました。変更箇所: ' + count);
console.log('Backup: src/App.jsx.before-in-progress-v2.bak');
console.log('次に npm run build を実行してください。');
