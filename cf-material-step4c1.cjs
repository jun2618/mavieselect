const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-step4c1-backup'

let s = fs.readFileSync(file, 'utf8')

const marker = '/* M-CROSS_CF_MATERIAL_STEP4C1 */'

if (s.includes(marker)) {
  console.log('STEP4-C1はすでに適用済みです')
  process.exit(0)
}

const componentStart = s.indexOf('function LengthMeasurementPage({')
const componentEnd = s.indexOf('\nfunction FloorTrimSection(', componentStart)

if (componentStart === -1 || componentEnd === -1) {
  console.error('LengthMeasurementPageの範囲が見つかりません。変更しませんでした。')
  process.exit(1)
}

const component = s.slice(componentStart, componentEnd)

const target = "  const [activeInput, setActiveInput] = useState('')"

const targetCount = component.split(target).length - 1

if (targetCount !== 1) {
  console.error(
    'LengthMeasurementPage内のactiveInputが' +
    targetCount +
    '件でした。変更しませんでした。'
  )
  process.exit(1)
}

const addition = `${target}

  ${marker}
  const [selectedMaterialRecordIds, setSelectedMaterialRecordIds] = useState([])
  const [materialOrderLength, setMaterialOrderLength] = useState('')
  const [materialProductCode, setMaterialProductCode] = useState('')

  const groupedMaterialRecordIds = new Set(
    materialGroups.flatMap(group =>
      Array.isArray(group.recordIds) ? group.recordIds : []
    )
  )

  const availableMaterialRecords = records.filter(
    record => !groupedMaterialRecordIds.has(record.id)
  )

  const selectedMaterialRecords = records.filter(
    record => selectedMaterialRecordIds.includes(record.id)
  )

  const selectedMaterialLength = selectedMaterialRecords.reduce(
    (sum, record) => sum + getLengthQuantity(record),
    0
  )

  function toggleMaterialRecord(recordId) {
    setSelectedMaterialRecordIds(previous =>
      previous.includes(recordId)
        ? previous.filter(id => id !== recordId)
        : [...previous, recordId]
    )
  }

  function createMaterialGroup() {
    if (!setMaterialGroups || selectedMaterialRecordIds.length === 0) return

    const validSelectedIds = selectedMaterialRecordIds.filter(
      id => records.some(record => record.id === id)
        && !groupedMaterialRecordIds.has(id)
    )

    if (validSelectedIds.length === 0) return

    const calculatedLength = records
      .filter(record => validSelectedIds.includes(record.id))
      .reduce((sum, record) => sum + getLengthQuantity(record), 0)

    const numericOrderLength = Number(
      String(materialOrderLength).replace(/[。．]/g, '.')
    )

    const nextOrderLength =
      Number.isFinite(numericOrderLength) && numericOrderLength > 0
        ? numericOrderLength
        : calculatedLength

    setMaterialGroups(previous => [
      ...previous,
      {
        id: createRecordId(),
        recordIds: validSelectedIds,
        orderLength: nextOrderLength,
        productCode: materialProductCode.trim(),
      },
    ])

    setSelectedMaterialRecordIds([])
    setMaterialOrderLength('')
    setMaterialProductCode('')
    onMaterialGroupsChanged?.()
  }

  function updateMaterialGroup(groupId, patch) {
    if (!setMaterialGroups) return

    setMaterialGroups(previous =>
      previous.map(group =>
        group.id === groupId
          ? { ...group, ...patch }
          : group
      )
    )

    onMaterialGroupsChanged?.()
  }

  function deleteMaterialGroup(groupId) {
    if (!setMaterialGroups) return

    setMaterialGroups(previous =>
      previous.filter(group => group.id !== groupId)
    )

    onMaterialGroupsChanged?.()
  }`

const updatedComponent = component.replace(target, addition)

fs.copyFileSync(file, backup)

s =
  s.slice(0, componentStart) +
  updatedComponent +
  s.slice(componentEnd)

fs.writeFileSync(file, s, 'utf8')

console.log('STEP4-C1 OK')
console.log('CF材料の選択・合算・登録・編集・削除処理を追加しました')
console.log('バックアップ:', backup)