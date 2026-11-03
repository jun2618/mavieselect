const fs=require('fs');
const p='src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const marker='M-CROSS_ESTIMATE_SAVE_VERSION_DECISION_V1_SAFE';
if(s.includes(marker)){console.log('OK: 見積版保存判定は反映済みです');process.exit(0)}
const helper=`  /* ${marker} */
  function normalizeEstimateRowsForVersion(rows = []) {
    return (Array.isArray(rows) ? rows : []).map((row, index) => ({
      id: String(row.sourceKey || row.exclusionKey || row.id || index),
      name: String(row.name || (Array.isArray(row.parts) ? row.parts.filter(Boolean).join(' ') : row.label || '')).replace(/[　 ]+/g, ' ').trim(),
      spec: String(row.spec ?? row.productCode ?? '').trim(),
      quantity: Math.round((Number(row.quantity) || 0) * 100) / 100,
      unit: String(row.unit || '').trim(),
      rate: row.rate === '' || row.rate == null ? '' : Math.round(Number(row.rate) || 0),
    }))
  }

  function chooseEstimateSaveMode() {
    const current = normalizeEstimateRowsForVersion(currentEstimateRows)
    const baseline = normalizeEstimateRowsForVersion(estimateBaselineRows)
    if (!current.length || JSON.stringify(current) === JSON.stringify(baseline)) return { mode: 'none' }
    const maxVersion = Math.max(1, ...estimateVersions.map(item => Number(item.version) || 0))
    const nextVersion = maxVersion + 1
    const nextMark = estimateVersionMark(nextVersion)
    const propertyLabel = [selectedProperty?.name || '', unit ? String(unit).replace(/号室$/,'') + '号室' : ''].filter(Boolean).join(' ')
    if (window.confirm(propertyLabel + ' お見積り' + nextMark + 'を作成しますか？\\n\\nOK：現在の見積を残して新しい版を作成\\nキャンセル：上書きまたは保存中止を選択')) return { mode: 'new', version: nextVersion }
    if (window.confirm('現在のお見積りを上書きしますか？\\n\\nOK：現在版を上書き\\nキャンセル：保存を中止')) {
      const target = Number(openedEstimateVersion) || Math.max(1, ...estimateVersions.map(item => Number(item.version) || 0))
      return { mode: 'overwrite', version: target }
    }
    return { mode: 'cancel' }
  }

  function commitEstimateSaveMode(decision) {
    if (!decision || decision.mode === 'none') return
    const rows = normalizeEstimateRowsForVersion(currentEstimateRows).map(row => ({ ...row, amount: (Number(row.quantity) || 0) * (Number(row.rate) || 0) }))
    const totalAmount = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
    const now = new Date().toISOString()
    const snapshot = { id: 'estimate-version-' + Date.now() + '-' + Math.random().toString(36).slice(2,8), version: decision.version, createdAt: now, updatedAt: now, totalAmount, rows: JSON.parse(JSON.stringify(rows)), additionalWorks: [], copyFormat: estimateCopyFormat }
    const next = decision.mode === 'new' ? [...estimateVersions, snapshot] : (estimateVersions.some(item => Number(item.version) === Number(decision.version)) ? estimateVersions.map(item => Number(item.version) === Number(decision.version) ? { ...item, ...snapshot, id: item.id || snapshot.id, createdAt: item.createdAt || now } : item) : [...estimateVersions, snapshot])
    localStorage.setItem(estimateVersionStorageKey, JSON.stringify(next))
    setEstimateVersions(next)
    setOpenedEstimateVersion(decision.version)
    setOpenedEstimateRows(rows)
    setEstimateBaselineRows(rows)
  }

`;
const fn='  function saveCurrentData() {';
const pos=s.indexOf(fn);
if(pos<0)throw new Error('saveCurrentData位置なし');
s=s.slice(0,pos)+helper+s.slice(pos);
const start=s.indexOf(fn,pos+helper.length);
const validationEnd=`    const storageKey = currentStorageKey || getSaveKey(company, selectedProperty, unit, workName)`;
const ve=s.indexOf(validationEnd,start);
if(ve<0)throw new Error('storageKey位置なし');
s=s.slice(0,ve)+`    const estimateSaveDecision = chooseEstimateSaveMode()\n    if (estimateSaveDecision.mode === 'cancel') return false\n\n`+s.slice(ve);
const tryStart=s.indexOf('    try {',ve);
const saveLine='      localStorage.setItem(storageKey, serialized)';
const savePos=s.indexOf(saveLine,tryStart);
if(savePos<0)throw new Error('案件保存位置なし');
const after=savePos+saveLine.length;
s=s.slice(0,after)+`\n      commitEstimateSaveMode(estimateSaveDecision)`+s.slice(after);
fs.copyFileSync(p,p+'.bak_estimate_version_save_v1');
fs.writeFileSync(p,s,'utf8');
console.log('OK: 案件保存時に見積②③④の作成・上書きを選べるようにしました');
