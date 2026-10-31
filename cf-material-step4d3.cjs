const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-step4d3-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')

const marker = '/* M-CROSS_CF_MATERIAL_STEP4D3 */'

if (s.includes(marker)) {
  console.log('STEP4-D3はすでに適用済みです')
  process.exit(0)
}

const requiredMarkers = [
  '/* M-CROSS_CF_MATERIAL_STEP4D1 */',
  '/* M-CROSS_CF_MATERIAL_STEP4D2 */',
  '/* M-CROSS_CF_MATERIAL_STEP4C1 */',
  '/* M-CROSS_CF_MATERIAL_STEP4C2 */',
]

for (const requiredMarker of requiredMarkers) {
  if (!s.includes(requiredMarker)) {
    console.error(requiredMarker + ' が見つかりません。変更しませんでした。')
    process.exit(1)
  }
}

const componentStart = s.indexOf('function LengthMeasurementPage({')
const componentEnd = s.indexOf('\nfunction FloorTrimSection(', componentStart)

if (componentStart === -1 || componentEnd === -1) {
  console.error('LengthMeasurementPageの範囲が見つかりません。変更しませんでした。')
  process.exit(1)
}

let component = s.slice(componentStart, componentEnd)

/* 旧STEP4-C1の処理部分を1本単位処理へ置換 */
const oldLogicStart = component.indexOf('  /* M-CROSS_CF_MATERIAL_STEP4C1 */')
const oldLogicEnd = component.indexOf('  const memoInputRef = useRef(null)', oldLogicStart)

if (oldLogicStart === -1 || oldLogicEnd === -1) {
  console.error('STEP4-C1の処理範囲が見つかりません。変更しませんでした。')
  process.exit(1)
}

const newLogic = `  /* M-CROSS_CF_MATERIAL_STEP4D3 */
  const [selectedMaterialPieceKeys, setSelectedMaterialPieceKeys] = useState([])
  const [materialOrderLength, setMaterialOrderLength] = useState('')
  const [materialProductCode, setMaterialProductCode] = useState('')

  const normalizedMaterialGroups = normalizeCfMaterialGroups(
    materialGroups,
    records
  )

  const materialSummary = getCfMaterialAllocationSummary(
    records,
    normalizedMaterialGroups
  )

  const availableMaterialPieces = materialSummary.unallocatedPieces
  const selectedMaterialPieces = availableMaterialPieces.filter(piece =>
    selectedMaterialPieceKeys.includes(piece.pieceKey)
  )

  const selectedMaterialLength = roundCfMaterialNumber(
    selectedMaterialPieces.reduce(
      (sum, piece) => sum + piece.pieceLength,
      0
    )
  )

  useEffect(() => {
    if (!setMaterialGroups) return
    if (areCfMaterialGroupsEqual(materialGroups, normalizedMaterialGroups)) return

    setMaterialGroups(normalizedMaterialGroups)
    onMaterialGroupsChanged?.()
  }, [records, materialGroups, setMaterialGroups])

  useEffect(() => {
    const availableKeys = new Set(
      availableMaterialPieces.map(piece => piece.pieceKey)
    )

    setSelectedMaterialPieceKeys(previous => {
      const next = previous.filter(key => availableKeys.has(key))
      return next.length === previous.length ? previous : next
    })
  }, [records, materialGroups])

  function toggleMaterialPiece(pieceKey) {
    setSelectedMaterialPieceKeys(previous =>
      previous.includes(pieceKey)
        ? previous.filter(key => key !== pieceKey)
        : [...previous, pieceKey]
    )
  }

  function createMaterialGroup() {
    if (!setMaterialGroups || selectedMaterialPieces.length === 0) return

    const allocations = selectedMaterialPieces.map(piece => ({
      recordId: piece.recordId,
      pieceIndex: piece.pieceIndex,
      quantity: piece.quantity,
    }))

    const numericOrderLength = Number(
      String(materialOrderLength).replace(/[。．]/g, '.')
    )

    const nextOrderLength =
      Number.isFinite(numericOrderLength) && numericOrderLength > 0
        ? numericOrderLength
        : selectedMaterialLength

    setMaterialGroups(previous => [
      ...normalizeCfMaterialGroups(previous, records),
      {
        id: createRecordId(),
        allocations,
        orderLength: nextOrderLength,
        productCode: materialProductCode.trim(),
      },
    ])

    setSelectedMaterialPieceKeys([])
    setMaterialOrderLength('')
    setMaterialProductCode('')
    onMaterialGroupsChanged?.()
  }

  function updateMaterialGroup(groupId, patch) {
    if (!setMaterialGroups) return

    setMaterialGroups(previous =>
      normalizeCfMaterialGroups(previous, records).map(group =>
        group.id === groupId ? { ...group, ...patch } : group
      )
    )

    onMaterialGroupsChanged?.()
  }

  function releaseMaterialGroup(groupId) {
    if (!setMaterialGroups) return

    setMaterialGroups(previous =>
      normalizeCfMaterialGroups(previous, records).filter(
        group => group.id !== groupId
      )
    )

    onMaterialGroupsChanged?.()
  }

`

component =
  component.slice(0, oldLogicStart) +
  newLogic +
  component.slice(oldLogicEnd)

/* 旧STEP4-C2の画面部分を1本単位UIへ置換 */
const oldUiStart = component.indexOf('          {/* M-CROSS_CF_MATERIAL_STEP4C2 */}')
const oldUiEnd = component.indexOf('\n        </section>', oldUiStart)

if (oldUiStart === -1 || oldUiEnd === -1) {
  console.error('STEP4-C2の画面範囲が見つかりません。変更しませんでした。')
  process.exit(1)
}

const newUi = `          {/* M-CROSS_CF_MATERIAL_STEP4D3_UI */}
          {title === 'CF' && setMaterialGroups && (
            <div className="cfMaterialPanel">
              <h2>CF材料割当</h2>
              <p className="subtitle">
                CFを1本ずつ選び、つないで注文する組み合わせを作ります。
              </p>

              <div className="cfMaterialAllocationSummary">
                <div className="summaryLine">
                  <span>必要長合計</span>
                  <strong>{formatQuantity(materialSummary.requiredLength)}m</strong>
                </div>
                <div className="summaryLine">
                  <span>割当済み</span>
                  <strong>{formatQuantity(materialSummary.allocatedLength)}m</strong>
                </div>
                <div className="summaryLine">
                  <span>未割当</span>
                  <strong>{formatQuantity(materialSummary.unallocatedLength)}m</strong>
                </div>
              </div>

              <h3>未割当のCF</h3>

              {availableMaterialPieces.length === 0 ? (
                <p className="empty">
                  {materialSummary.allPieces.length > 0
                    ? 'すべてのCFが材料へ割り当てられています'
                    : 'CF登録がありません'}
                </p>
              ) : (
                <div className="cfMaterialChoices">
                  {availableMaterialPieces.map(piece => (
                    <label className="cfMaterialChoice" key={piece.pieceKey}>
                      <input
                        type="checkbox"
                        checked={selectedMaterialPieceKeys.includes(piece.pieceKey)}
                        onChange={() => toggleMaterialPiece(piece.pieceKey)}
                      />
                      <span>
                        <strong>{piece.room || '部屋未設定'}　{piece.label}</strong>
                        <small>
                          {piece.isFractional
                            ? formatQuantity(piece.sourceLength) + 'm × ' + formatQuantity(piece.quantity) + '本 = ' + formatQuantity(piece.pieceLength) + 'm'
                            : formatQuantity(piece.pieceLength) + 'm × 1本'}
                        </small>
                        {piece.memo && <small>メモ：{piece.memo}</small>}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {selectedMaterialPieces.length > 0 && (
                <div className="cfMaterialCreate">
                  <h3>選択中の内訳</h3>
                  {selectedMaterialPieces.map(piece => (
                    <div className="summaryLine" key={piece.pieceKey}>
                      <span>{piece.room || '部屋未設定'}　{piece.label}</span>
                      <strong>{formatQuantity(piece.pieceLength)}m</strong>
                    </div>
                  ))}

                  <div className="summaryLine summaryGrand">
                    <span>計算長</span>
                    <strong>{formatQuantity(selectedMaterialLength)}m</strong>
                  </div>

                  <label>
                    <span>注文長（m）</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={materialOrderLength}
                      onChange={event => setMaterialOrderLength(event.target.value)}
                      placeholder={formatQuantity(selectedMaterialLength)}
                    />
                  </label>

                  <label>
                    <span>品番・商品名</span>
                    <input
                      type="text"
                      value={materialProductCode}
                      onChange={event => setMaterialProductCode(event.target.value)}
                      placeholder="例：HM-12001"
                    />
                  </label>

                  <button className="add" type="button" onClick={createMaterialGroup}>
                    選択したCFを材料にする
                  </button>
                </div>
              )}

              {normalizedMaterialGroups.length > 0 && (
                <div className="cfMaterialGroupList">
                  <h3>材料発注グループ</h3>

                  {normalizedMaterialGroups.map((group, index) => {
                    const groupPieces = getCfMaterialGroupPieces(group, records)
                    const calculatedLength = getCfMaterialGroupLength(group, records)
                    const roomNames = [
                      ...new Set(groupPieces.map(piece => piece.room).filter(Boolean)),
                    ]
                    const numericOrderLength = Number(group.orderLength)
                    const hasDifference = Number.isFinite(numericOrderLength)
                      && roundCfMaterialNumber(numericOrderLength) !== calculatedLength

                    return (
                      <div className="cfMaterialGroup" key={group.id}>
                        <div className="cfMaterialGroupHeader">
                          <strong>CF材料 {index + 1}</strong>
                          <button
                            type="button"
                            onClick={() => releaseMaterialGroup(group.id)}
                            aria-label={'CF材料' + (index + 1) + 'の割当を解除'}
                          >
                            ×
                          </button>
                        </div>

                        <p>{roomNames.join(' ＋ ') || '対象データなし'}</p>

                        {groupPieces.map(piece => (
                          <div className="summaryLine" key={piece.pieceKey}>
                            <span>{piece.room || '部屋未設定'}　{piece.label}</span>
                            <strong>{formatQuantity(piece.pieceLength)}m</strong>
                          </div>
                        ))}

                        <div className="summaryLine summaryGrand">
                          <span>計算長</span>
                          <strong>{formatQuantity(calculatedLength)}m</strong>
                        </div>

                        {hasDifference && (
                          <p className="saveStatus" role="status">
                            計算長と注文長が異なります。ロス分を含む場合はそのままで問題ありません。
                          </p>
                        )}

                        <label>
                          <span>注文長（m）</span>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={group.orderLength ?? ''}
                            onChange={event => updateMaterialGroup(group.id, {
                              orderLength: event.target.value,
                            })}
                          />
                        </label>

                        <label>
                          <span>品番・商品名</span>
                          <input
                            type="text"
                            value={group.productCode || ''}
                            onChange={event => updateMaterialGroup(group.id, {
                              productCode: event.target.value,
                            })}
                            placeholder="例：HM-12001"
                          />
                        </label>

                        <button
                          className="secondaryButton"
                          type="button"
                          onClick={() => releaseMaterialGroup(group.id)}
                        >
                          この材料の割当を解除
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}`

component =
  component.slice(0, oldUiStart) +
  newUi +
  component.slice(oldUiEnd)

fs.copyFileSync(file, backup)

s =
  s.slice(0, componentStart) +
  component +
  s.slice(componentEnd)

fs.writeFileSync(file, s, 'utf8')

console.log('STEP4-D3 OK')
console.log('CF材料まとめ画面を1本単位の割当方式へ変更しました')
console.log('旧recordIds形式は画面表示時にallocationsへ自動変換されます')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
