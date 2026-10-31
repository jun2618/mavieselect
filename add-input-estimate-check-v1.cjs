const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-input-estimate-check-v1');
const MARKER = '/* M-CROSS_INPUT_ESTIMATE_CHECK_V1 */';

if (!fs.existsSync(appPath)) { console.error('ERROR: src/App.jsx が見つかりません。'); process.exit(1); }
let s = fs.readFileSync(appPath, 'utf8');
if (s.includes(MARKER)) { console.log('SKIP: 入力・見積チェックV1は適用済みです。'); process.exit(0); }

const anchor = '  function FinalReviewPage({';
if (!s.includes(anchor)) { console.error('ERROR: FinalReviewPage を特定できません。'); process.exit(1); }

const functionAnchor = '  function addCommonWork() {';
const count = s.split(functionAnchor).length - 1;
if (count !== 1) { console.error(`ERROR: チェック処理の挿入位置が ${count} 件でした。`); process.exit(1); }

const checkCode = `  ${MARKER}\n  const estimateCheckWarnings = useMemo(() => {\n    const warnings = []\n\n    ;(additionalWorks || []).forEach((item, index) => {\n      const label = (item.room || '部屋未設定') + '・' + (item.work || '作業名未設定')\n      const quantity = Number(item.quantity || 0)\n      const unitPrice = Number(item.unitPrice || 0)\n      if (!Number.isFinite(quantity) || quantity <= 0) warnings.push('数量を確認：' + label)\n      if (!Number.isFinite(unitPrice) || unitPrice <= 0) warnings.push('単価0円：' + label)\n      if (quantity >= 1000) warnings.push('数量が大きい：' + label + '（' + quantity + (item.unit || '') + '）')\n    })\n\n    const duplicateMap = new Map()\n    ;(additionalWorks || []).forEach(item => {\n      const key = String(item.room || '').trim() + '|' + String(item.work || '').trim().toLocaleLowerCase('ja')\n      if (!String(item.work || '').trim()) return\n      duplicateMap.set(key, (duplicateMap.get(key) || 0) + 1)\n    })\n    duplicateMap.forEach((value, key) => {\n      if (value <= 1) return\n      const [duplicateRoom, duplicateWork] = key.split('|')\n      warnings.push('重複の可能性：' + (duplicateRoom || '部屋未設定') + '・' + duplicateWork + ' × ' + value + '件')\n    })\n\n    return [...new Set(warnings)]\n  }, [additionalWorks])\n\n`;
s = s.replace(functionAnchor, checkCode + functionAnchor);

const formAnchor = '        <form className="additionalWorkForm" onSubmit={addWork}>';
if (!s.includes(formAnchor)) { console.error('ERROR: 追加作業フォームを特定できません。'); process.exit(1); }
const ui = `        <section className={\`estimateCheckPanel ${estimateCheckWarnings.length ? 'hasWarnings' : 'allClear'}\`}>\n          <div className="estimateCheckHeader">\n            <strong>🧠 入力・見積チェック</strong>\n            <span>{estimateCheckWarnings.length ? estimateCheckWarnings.length + '件確認' : 'OK'}</span>\n          </div>\n          {estimateCheckWarnings.length ? (\n            <ul>\n              {estimateCheckWarnings.map((warning, index) => <li key={warning + index}>{warning}</li>)}\n            </ul>\n          ) : (\n            <p>追加作業に明らかな数量0・単価0・重複は見つかりません。</p>\n          )}\n          <small>これは確認補助です。工事内容や金額の正否を自動判断するものではありません。</small>\n        </section>\n\n`;
s = s.replace(formAnchor, ui + formAnchor);

const styleAnchor = s.includes('<style>{appStyles}</style>') ? '<style>{appStyles}</style>' : (s.includes('<style>{styles}</style>') ? '<style>{styles}</style>' : null);
if (!styleAnchor) { console.error('ERROR: style要素を特定できません。'); process.exit(1); }
const css = `\n.estimateCheckPanel{display:grid;gap:8px;margin:14px 0;padding:12px 14px;border:1px solid rgba(80,160,120,.45);border-radius:14px;background:rgba(80,160,120,.08)}\n.estimateCheckPanel.hasWarnings{border-color:rgba(232,160,70,.72);background:rgba(232,160,70,.1)}\n.estimateCheckHeader{display:flex;justify-content:space-between;align-items:center;gap:10px}.estimateCheckHeader span{font-size:12px;font-weight:900}\n.estimateCheckPanel ul{margin:0;padding-left:20px}.estimateCheckPanel li{margin:5px 0;line-height:1.45}.estimateCheckPanel p{margin:0;line-height:1.5}.estimateCheckPanel small{opacity:.7;font-size:11px;line-height:1.45}\n`;
s = s.replace(styleAnchor, styleAnchor + '\n      <style>{`' + css + '`}</style>');

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, s, 'utf8');
console.log('OK: 入力・見積チェックV1を追加しました。');
console.log('確認項目: 追加作業の数量0以下・単価0円・同一部屋/同一作業の重複・数量1000以上。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
