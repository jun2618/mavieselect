const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'App.jsx');
const marker = 'M-CROSS_DIRECT_LEGACY_EXCEL_PICKER_V1_SAFE';

if (!fs.existsSync(file)) {
  console.error('ERROR: src/App.jsx not found');
  process.exit(1);
}

let source = fs.readFileSync(file, 'utf8');
if (source.length < 100000) {
  console.error('ERROR: App.jsx size is unexpectedly small. No changes made.');
  process.exit(1);
}
if (source.includes(marker)) {
  console.log('ALREADY APPLIED');
  process.exit(0);
}

const backup = file + '.before-direct-legacy-picker-v1-' + Date.now() + '.bak';
const nl = source.includes('\r\n') ? '\r\n' : '\n';

function replaceOnce(label, oldText, newText) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) {
    console.error(`ERROR: ${label} MATCH=${count}. No changes made.`);
    process.exit(1);
  }
  source = source.replace(oldText, newText);
}

const functionStartCandidates = [
  'async function downloadEstimateExcel(entry, rows, format, additionalWorks = [], legacyNotes = []) {' + nl + '  try {',
  'async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {' + nl + '  try {'
];
const functionStart = functionStartCandidates.find(x => source.includes(x));
if (!functionStart) {
  console.error('ERROR: downloadEstimateExcel start not found. No changes made.');
  process.exit(1);
}

const pickerBlock = [
  functionStart,
  `    /* ${marker} */`,
  `    const legacyFile = await new Promise(resolve => {`,
  `      const input = document.createElement('input')`,
  `      input.type = 'file'`,
  `      input.accept = '.xlsm,.xlsx,application/vnd.ms-excel.sheet.macroEnabled.12,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'`,
  `      input.onchange = () => resolve(input.files?.[0] || null)`,
  `      input.click()`,
  `    })`,
  `    if (!legacyFile) return`
].join(nl);
replaceOnce('file picker', functionStart, pickerBlock);

const xlsxAnchor = "    if (!XlsxPopulate?.fromDataAsync) throw new Error('xlsx-populateブラウザ版を初期化できません')";
const xlsxBlock = [
  xlsxAnchor,
  `    const legacyWorkbook = await XlsxPopulate.fromDataAsync(await legacyFile.arrayBuffer())`
].join(nl);
replaceOnce('legacy workbook load', xlsxAnchor, xlsxBlock);

const sheetAnchor = "    if (!ws) throw new Error('「見積書」シートが見つかりません')";
const copyBlock = [
  sheetAnchor,
  `    const legacyWs = legacyWorkbook.sheet('見積書')`,
  `    if (!legacyWs) throw new Error('元工事カードに「見積書」シートが見つかりません')`,
  `    let legacyNoteCount = 0`,
  `    for (let rowNumber = 22; rowNumber <= 56; rowNumber += 1) {`,
  `      for (const column of ['L', 'M', 'N', 'O', 'P', 'Q']) {`,
  `        const value = legacyWs.cell(column + rowNumber).value()`,
  `        if (value !== undefined && value !== null && String(value).trim()) {`,
  `          ws.cell(column + rowNumber).value(value)`,
  `          legacyNoteCount += 1`,
  `        }`,
  `      }`,
  `    }`,
  `    for (const column of ['L', 'M', 'N', 'O', 'P', 'Q']) {`,
  `      try { ws.column(column).width(legacyWs.column(column).width()) } catch {}`,
  `    }`,
  `    if (!legacyNoteCount) throw new Error('元工事カードのL～Q列・22～56行に文章が見つかりません')`
].join(nl);
replaceOnce('copy L-Q notes', sheetAnchor, copyBlock);

fs.copyFileSync(file, backup);
fs.writeFileSync(file, source, 'utf8');
console.log('OK: direct legacy note merge added');
console.log('BACKUP:', backup);

const build = cp.spawnSync('npm', ['run', 'build'], { shell: true, stdio: 'inherit' });
if (build.status !== 0) {
  fs.copyFileSync(backup, file);
  console.error('ERROR: Build failed. App.jsx restored from backup.');
  process.exit(build.status || 1);
}
console.log('OK: BUILD SUCCESS');
console.log('Usage: Click estimate Excel export, then choose the original work-card XLSM/XLSX file.');
