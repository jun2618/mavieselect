const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function text(value) {
  return String(value ?? '').replace(/\r\n/g, '\n').trim();
}
function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function safeName(value) {
  return text(value).replace(/[\\/:*?"<>|]/g, '_');
}
function cell(sheet, address) {
  return sheet?.[address]?.v ?? '';
}
function normalizeSpaces(value) {
  return text(value).replace(/[\s　]+/g, ' ').trim();
}
function makeId(prefix, index) {
  return `${prefix}-${String(index + 1).padStart(3, '0')}`;
}
function splitWork(raw) {
  const value = normalizeSpaces(raw);
  let match;
  if ((match = value.match(/^浴室\s*2室用換気扇交換\s*(.*)$/))) {
    return { room: '浴室', work: '2室用換気扇交換', spec: match[1] || '' };
  }
  if ((match = value.match(/^換気扇交換施工費\s*(.*)$/))) {
    return { room: '浴室', work: '換気扇交換施工費', spec: match[1] || '' };
  }
  if ((match = value.match(/^浴室\s*(.*)$/))) {
    return { room: '浴室', work: match[1] || value, spec: '' };
  }
  if ((match = value.match(/^トイレ\s*(.*)$/))) {
    return { room: 'トイレ', work: match[1] || value, spec: '' };
  }
  if ((match = value.match(/^(キッチン|台所)\s*(.*)$/))) {
    return { room: '台所', work: match[2] || value, spec: '' };
  }
  return { room: 'その他', work: value, spec: '' };
}
function readPropertyAccess(workbook, company, propertyName, cardSheet) {
  const direct = {
    autoLock: text(cell(cardSheet, 'F3')),
    joiner: text(cell(cardSheet, 'F5')),
    keyBox: text(cell(cardSheet, 'F7')),
    myLock: text(cell(cardSheet, 'F9')),
    entranceOpen: '',
  };
  if (direct.autoLock || direct.joiner || direct.keyBox || direct.myLock) return direct;

  const candidates = [`${company}_マスター`, 'マスター', 'マスター (2)'];
  for (const sheetName of candidates) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet?.['!ref']) continue;
    const range = XLSX.utils.decode_range(sheet['!ref']);
    for (let r = 1; r <= range.e.r; r += 1) {
      const name = text(cell(sheet, XLSX.utils.encode_cell({ r, c: 0 })));
      if (name !== propertyName) continue;
      return {
        autoLock: text(cell(sheet, XLSX.utils.encode_cell({ r, c: 3 }))),
        joiner: text(cell(sheet, XLSX.utils.encode_cell({ r, c: 4 }))),
        keyBox: text(cell(sheet, XLSX.utils.encode_cell({ r, c: 5 }))),
        myLock: text(cell(sheet, XLSX.utils.encode_cell({ r, c: 6 }))),
        entranceOpen: '',
      };
    }
  }
  return direct;
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('使い方: node convert_legacy_work_card_to_mcross_v1.cjs "工事カード.xlsm"');
  process.exit(1);
}
const absoluteInput = path.resolve(inputPath);
if (!fs.existsSync(absoluteInput)) {
  console.error('ERROR: ファイルが見つかりません: ' + absoluteInput);
  process.exit(1);
}

const workbook = XLSX.readFile(absoluteInput, { bookVBA: true, cellDates: true, cellFormula: true });
const card = workbook.Sheets['工事カード'];
const estimate = workbook.Sheets['見積書'];
if (!card || !estimate) {
  console.error('ERROR: 「工事カード」または「見積書」シートがありません。');
  process.exit(1);
}

const company = text(cell(card, 'C3'));
const propertyName = text(cell(card, 'C7'));
const unit = text(cell(card, 'C9')).replace(/号室$/u, '');
const address = text(cell(card, 'C11'));
if (!company || !propertyName) {
  console.error('ERROR: 管理会社または物件名を読み取れません。');
  process.exit(1);
}

const additionalWorks = [];
for (let row = 23; row <= 56; row += 1) {
  const rawLabel = text(cell(estimate, `C${row}`));
  const quantity = number(cell(estimate, `H${row}`));
  const unitName = text(cell(estimate, `I${row}`)) || '式';
  const unitPrice = number(cell(estimate, `J${row}`));
  const memo = text(cell(estimate, `M${row}`));
  if (!rawLabel || quantity <= 0) continue;
  const parts = splitWork(rawLabel);
  additionalWorks.push({
    id: makeId('legacy-work', additionalWorks.length),
    room: parts.room,
    work: parts.work,
    spec: parts.spec,
    estimateParts: [parts.room, parts.work, parts.spec, ''],
    productCode: parts.spec.match(/[A-Z]{1,5}-[A-Z0-9-]+/i)?.[0] || '',
    quantity,
    unit: unitName,
    unitPrice,
    amount: quantity * unitPrice,
    memo,
    sourceSheet: '見積書',
    sourceRow: row,
  });
}
if (!additionalWorks.length) {
  console.error('ERROR: 金額付き明細を読み取れませんでした。');
  process.exit(1);
}

const rooms = [...new Set(additionalWorks.map(item => item.room).filter(Boolean))];
const subtotal = additionalWorks.reduce((sum, item) => sum + item.amount, 0);
const tax = Math.floor(subtotal * 0.1);
const total = subtotal + tax;
const propertyAccess = readPropertyAccess(workbook, company, propertyName, card);
const now = new Date().toISOString();
const sourceDate = cell(estimate, 'J5');
const importedDate = sourceDate instanceof Date && !Number.isNaN(sourceDate.getTime())
  ? sourceDate.toISOString()
  : now;

const entry = {
  schema: 'm-cross-legacy-import:v1',
  importMode: 'single-preview',
  source: {
    fileName: path.basename(absoluteInput),
    sheet: '工事カード / 見積書',
    importedAt: now,
  },
  entry: {
    company,
    propertyName,
    propertyId: '',
    address,
    unit,
    workName: '諸工事',
    propertyAccess,
    rooms,
    customRooms: rooms,
    records: [],
    cfRecords: [],
    cfMaterialGroups: [],
    softRecords: [],
    floorTrimRecords: [],
    additionalWorks,
    draftMemo: '',
    siteMemo: '',
    requestContent: '',
    roomConfirmations: {},
    estimateEdits: {},
    estimateVersions: [],
    pageIndex: 0,
    cfPageIndex: 0,
    softPageIndex: 0,
    activePage: 'additional',
    measurementType: '天井',
    createdAt: importedDate,
    updatedAt: importedDate,
    archived: false,
  },
  totals: { subtotal, tax, total },
  validation: {
    expectedTotal: 67650,
    totalMatches: total === 67650,
    itemCount: additionalWorks.length,
  },
};

const outputPath = path.join(path.dirname(absoluteInput), `${safeName(propertyName)}_${safeName(unit)}号室_${safeName(entry.entry.workName)}.mcross.json`);
fs.writeFileSync(outputPath, JSON.stringify(entry, null, 2), 'utf8');

console.log('OK: M-Cross取込用JSONを作成しました');
console.log('出力:', outputPath);
console.log('管理会社:', company);
console.log('物件:', propertyName, unit + '号室');
console.log('明細:', additionalWorks.length + '件');
console.log('小計:', subtotal.toLocaleString('ja-JP') + '円');
console.log('消費税:', tax.toLocaleString('ja-JP') + '円');
console.log('合計:', total.toLocaleString('ja-JP') + '円');
console.log('合計照合:', entry.validation.totalMatches ? '一致' : '不一致');
