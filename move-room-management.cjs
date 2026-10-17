const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'App.jsx');
if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file);
  process.exit(1);
}

let s = fs.readFileSync(file, 'utf8');
const original = s;

function replaceOnce(oldText, newText, label) {
  const count = s.split(oldText).length - 1;
  if (count !== 1) {
    console.error(`置換失敗: ${label} (一致数: ${count})`);
    process.exit(1);
  }
  s = s.replace(oldText, newText);
  console.log('OK:', label);
}

// 1) LengthMeasurementPage から部屋管理用propsを外す
replaceOnce(
`function LengthMeasurementPage({
  title,
  rooms,
  onAddRoom,
  onRenameRoom,
  onDeleteRoom,
  roomHasData,
  records,`,
`function LengthMeasurementPage({
  title,
  rooms,
  records,`,
'LengthMeasurementPageのprops整理'
);

// 2) LengthMeasurementPage内の部屋管理UIを削除
replaceOnce(
`      <RoomManagementControls
        rooms={rooms}
        onAddRoom={onAddRoom}
        onRenameRoom={onRenameRoom}
        onDeleteRoom={onDeleteRoom}
        roomHasData={roomHasData}
      />
`,
``,
'CF・ソフト巾木画面から部屋管理UIを削除'
);

// 3) 専用ページ表示stateを追加
replaceOnce(
`  const [showMeasurementCheck, setShowMeasurementCheck] = useState(false)
  const [returnToMeasurementCheck, setReturnToMeasurementCheck] = useState(false)`,
`  const [showMeasurementCheck, setShowMeasurementCheck] = useState(false)
  const [showRoomManagement, setShowRoomManagement] = useState(false)
  const [returnToMeasurementCheck, setReturnToMeasurementCheck] = useState(false)`,
'部屋管理ページstateを追加'
);

// 4) 最後の1部屋を削除不可にする
replaceOnce(
`  function deleteRoom(roomName) {
    const roomIndex = rooms.indexOf(roomName)`,
`  function deleteRoom(roomName) {
    if (rooms.length <= 1) {
      window.alert('部屋をすべて削除することはできません')
      return
    }

    const roomIndex = rooms.indexOf(roomName)`,
'最後の1部屋の削除を防止'
);

// 5) タイトルに部屋管理を追加
replaceOnce(
`              {showMeasurementCheck
                ? '採寸チェック'
                : activePage === 'cross'`,
`              {showRoomManagement
                ? '部屋管理'
                : showMeasurementCheck
                  ? '採寸チェック'
                  : activePage === 'cross'`,
'部屋管理タイトルを追加'
);

// 6) 採寸カテゴリボタンは部屋管理・採寸チェック中は隠す
replaceOnce(
`            <div className="measurementTypes" aria-label="採寸機能">
              <button type="button" className={activePage === 'cross' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('cross')}>クロス採寸</button>
              <button type="button" className={activePage === 'cf' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('cf')}>CF採寸</button>
              <button type="button" className={activePage === 'soft' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('soft')}>ソフト巾木</button>
            </div>`,
`            {!showRoomManagement && !showMeasurementCheck && (
              <div className="measurementTypes" aria-label="採寸機能">
                <button type="button" className={activePage === 'cross' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('cross')}>クロス採寸</button>
                <button type="button" className={activePage === 'cf' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('cf')}>CF採寸</button>
                <button type="button" className={activePage === 'soft' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('soft')}>ソフト巾木</button>
              </div>
            )}`,
'部屋管理中は採寸カテゴリを非表示'
);

// 7) 採寸チェックボタンを部屋管理中は隠し、部屋管理ボタンを追加
replaceOnce(
`            <button
              className="measurementCheckButton"
              type="button"
              onClick={() => {
                setShowMeasurementCheck(previous => !previous)
                setReturnToMeasurementCheck(false)
              }}
            >
              {showMeasurementCheck
                ? '採寸画面へ戻る'
                : returnToMeasurementCheck
                  ? '採寸チェックへ戻る'
                  : '採寸チェック'}
            </button>

            {showMeasurementCheck ? (`,
`            {!showRoomManagement && (
              <button
                className="measurementCheckButton"
                type="button"
                onClick={() => {
                  setShowMeasurementCheck(previous => !previous)
                  setReturnToMeasurementCheck(false)
                }}
              >
                {showMeasurementCheck
                  ? '採寸画面へ戻る'
                  : returnToMeasurementCheck
                    ? '採寸チェックへ戻る'
                    : '採寸チェック'}
              </button>
            )}

            {!showMeasurementCheck && (
              <button
                className="measurementCheckButton"
                type="button"
                onClick={() => setShowRoomManagement(previous => !previous)}
              >
                {showRoomManagement ? '← 採寸画面へ戻る' : '⚙ 部屋管理'}
              </button>
            )}

            {showRoomManagement ? (
              <section className="card">
                <h2>部屋管理</h2>
                <RoomManagementControls
                  rooms={rooms}
                  onAddRoom={addCustomRoom}
                  onRenameRoom={renameRoom}
                  onDeleteRoom={deleteRoom}
                  roomHasData={roomHasData}
                />
              </section>
            ) : showMeasurementCheck ? (`,
'部屋管理ボタンと専用ページを追加'
);

// 8) クロス画面に直置きされている部屋管理UIを削除
replaceOnce(
`                <RoomManagementControls
                  rooms={rooms}
                  onAddRoom={addCustomRoom}
                  onRenameRoom={renameRoom}
                  onDeleteRoom={deleteRoom}
                  roomHasData={roomHasData}
                />
`,
``,
'クロス画面から部屋管理UIを削除'
);

// 9) CF呼び出しから不要propsを削除
replaceOnce(
`                rooms={rooms}
                onAddRoom={addCustomRoom}
                onRenameRoom={renameRoom}
                onDeleteRoom={deleteRoom}
                roomHasData={roomHasData}
                records={cfRecords}`,
`                rooms={rooms}
                records={cfRecords}`,
'CF呼び出しのprops整理'
);

// 10) ソフト巾木呼び出しから不要propsを削除
replaceOnce(
`                rooms={rooms}
                onAddRoom={addCustomRoom}
                onRenameRoom={renameRoom}
                onDeleteRoom={deleteRoom}
                roomHasData={roomHasData}
                records={softRecords}`,
`                rooms={rooms}
                records={softRecords}`,
'ソフト巾木呼び出しのprops整理'
);

// 11) 案件を開く/開始する時は部屋管理画面を閉じる（2箇所）
s = s.replaceAll(
`    setShowMeasurementCheck(false)
    setReturnToMeasurementCheck(false)`,
`    setShowMeasurementCheck(false)
    setShowRoomManagement(false)
    setReturnToMeasurementCheck(false)`
);

if (s === original) {
  console.error('変更がありませんでした');
  process.exit(1);
}

const backup = file + '.before-room-management';
fs.writeFileSync(backup, original, 'utf8');
fs.writeFileSync(file, s, 'utf8');
console.log('\n完了');
console.log('更新:', file);
console.log('バックアップ:', backup);
console.log('次に実行: npm run build');
