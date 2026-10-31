const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-input-estimate-check-v3');
const MARKER = '/* M-CROSS_INPUT_ESTIMATE_CHECK_V3 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');
if (source.includes(MARKER)) {
  console.log('SKIP: 入力・見積チェックV3は適用済みです。');
  process.exit(0);
}

function findExactlyOnce(label, needle) {
  const count = source.split(needle).length - 1;
  if (count !== 1) {
    console.error(`ERROR: ${label} の対象が ${count} 件でした。安全のため中止しました。`);
    process.exit(1);
  }
}

// FinalReviewPage内で一意の addCommonWork の直前にチェック処理を追加。
const functionAnchor = '  function addCommonWork() {';
findExactlyOnce('addCommonWork関数', functionAnchor);

const checkCode = `  ${MARKER}
  const estimateCheckWarnings = useMemo(() => {
    const warnings = []

    ;(additionalWorks || []).forEach(item => {
      const label = (item.room || '部屋未設定') + '・' + (item.work || '作業名未設定')
      const quantity = Number(item.quantity || 0)
      const unitPriceValue = Number(item.unitPrice || 0)

      if (!Number.isFinite(quantity) || quantity <= 0) {
        warnings.push('数量を確認：' + label)
      }
      if (!Number.isFinite(unitPriceValue) || unitPriceValue <= 0) {
        warnings.push('単価0円：' + label)
      }
      if (quantity >= 1000) {
        warnings.push('数量が大きい：' + label + '（' + quantity + (item.unit || '') + '）')
      }
    })

    const duplicateMap = new Map()
    ;(additionalWorks || []).forEach(item => {
      const workName = String(item.work || '').trim()
      if (!workName) return
      const key = String(item.room || '').trim() + '|' + workName.toLocaleLowerCase('ja')
      duplicateMap.set(key, (duplicateMap.get(key) || 0) + 1)
    })

    duplicateMap.forEach((value, key) => {
      if (value <= 1) return
      const separatorIndex = key.indexOf('|')
      const duplicateRoom = key.slice(0, separatorIndex)
      const duplicateWork = key.slice(separatorIndex + 1)
      warnings.push('重複の可能性：' + (duplicateRoom || '部屋未設定') + '・' + duplicateWork + ' × ' + value + '件')
    })

    return [...new Set(warnings)]
  }, [additionalWorks])

`;
source = source.replace(functionAnchor, checkCode + functionAnchor);

// 追加作業フォームの直前にチェック結果を表示。
const formAnchor = '        <form className="additionalWorkForm" onSubmit={addWork}>';
findExactlyOnce('追加作業フォーム', formAnchor);

const checkUi = `        <section className={\`estimateCheckPanel \${estimateCheckWarnings.length ? 'hasWarnings' : 'allClear'}\`}>
          <div className="estimateCheckHeader">
            <strong>🧠 入力・見積チェック</strong>
            <span>{estimateCheckWarnings.length ? estimateCheckWarnings.length + '件確認' : 'OK'}</span>
          </div>
          {estimateCheckWarnings.length > 0 ? (
            <ul>
              {estimateCheckWarnings.map((warning, index) => (
                <li key={warning + index}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p>追加作業に明らかな数量0・単価0・重複は見つかりません。</p>
          )}
          <small>確認補助です。工事内容や金額の正否を自動決定するものではありません。</small>
        </section>

`;
source = source.replace(formAnchor, checkUi + formAnchor);

const styleAnchor = source.includes('<style>{appStyles}</style>')
  ? '<style>{appStyles}</style>'
  : (source.includes('<style>{styles}</style>') ? '<style>{styles}</style>' : null);

if (!styleAnchor) {
  console.error('ERROR: style要素を特定できません。');
  process.exit(1);
}

const css = `
.estimateCheckPanel{display:grid;gap:8px;margin:14px 0;padding:12px 14px;border:1px solid rgba(80,160,120,.45);border-radius:14px;background:rgba(80,160,120,.08)}
.estimateCheckPanel.hasWarnings{border-color:rgba(232,160,70,.72);background:rgba(232,160,70,.1)}
.estimateCheckHeader{display:flex;justify-content:space-between;align-items:center;gap:10px}
.estimateCheckHeader span{font-size:12px;font-weight:900}
.estimateCheckPanel ul{margin:0;padding-left:20px}
.estimateCheckPanel li{margin:5px 0;line-height:1.45}
.estimateCheckPanel p{margin:0;line-height:1.5}
.estimateCheckPanel small{opacity:.7;font-size:11px;line-height:1.45}
.theme-dark .estimateCheckPanel,.theme-cyber .estimateCheckPanel,.theme-luxury .estimateCheckPanel,.theme-retro .estimateCheckPanel,.theme-galaxy .estimateCheckPanel{background:rgba(5,12,24,.76)}
`;

source = source.replace(styleAnchor, styleAnchor + '\n      <style>{`' + css + '`}</style>');

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: 入力・見積チェックV3を追加しました。');
console.log('確認項目: 数量0以下・単価0円・同一部屋/同一作業の重複・数量1000以上。');
console.log('警告のみ表示し、データは自動修正しません。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
