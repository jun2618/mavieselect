const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step12-duplicate-fix-backup'
const functionName = 'function parseResidentRequestText(rawText, propertyMaster) {'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const positions = []
let searchFrom = 0

while (true) {
  const position = s.indexOf(functionName, searchFrom)
  if (position === -1) break
  positions.push(position)
  searchFrom = position + functionName.length
}

if (positions.length === 1) {
  console.log('parseResidentRequestText は1件だけです。修正不要です。')
  process.exit(0)
}

if (positions.length !== 2) {
  console.error('parseResidentRequestText が ' + positions.length + '件ありました。安全のため変更しませんでした。')
  process.exit(1)
}

function findFunctionEnd(text, start) {
  const openBrace = text.indexOf('{', start)
  if (openBrace === -1) return -1

  let depth = 0
  let quote = ''
  let escaped = false
  let lineComment = false
  let blockComment = false

  for (let index = openBrace; index < text.length; index += 1) {
    const current = text[index]
    const next = text[index + 1]

    if (lineComment) {
      if (current === '\n') lineComment = false
      continue
    }

    if (blockComment) {
      if (current === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }

    if (quote) {
      if (escaped) {
        escaped = false
        continue
      }
      if (current === '\\') {
        escaped = true
        continue
      }
      if (current === quote) quote = ''
      continue
    }

    if (current === '/' && next === '/') {
      lineComment = true
      index += 1
      continue
    }

    if (current === '/' && next === '*') {
      blockComment = true
      index += 1
      continue
    }

    if (current === "'" || current === '"' || current === '`') {
      quote = current
      continue
    }

    if (current === '{') depth += 1
    if (current === '}') {
      depth -= 1
      if (depth === 0) return index + 1
    }
  }

  return -1
}

// 古い先頭側だけ削除し、完全版として後から追加した2件目を残します。
const firstStart = positions[0]
const firstEnd = findFunctionEnd(s, firstStart)

if (firstEnd === -1 || firstEnd >= positions[1]) {
  console.error('最初の解析関数の終了位置を安全に確認できません。変更しませんでした。')
  process.exit(1)
}

fs.copyFileSync(file, backup)

let removeEnd = firstEnd
while (removeEnd < s.length && (s[removeEnd] === '\r' || s[removeEnd] === '\n')) {
  removeEnd += 1
}

s = s.slice(0, firstStart) + s.slice(removeEnd)
fs.writeFileSync(file, s, 'utf8')

const remainingCount = s.split(functionName).length - 1
if (remainingCount !== 1) {
  fs.copyFileSync(backup, file)
  console.error('修正後も解析関数が ' + remainingCount + '件でした。バックアップへ戻しました。')
  process.exit(1)
}

console.log('STEP12 重複関数修正 OK')
console.log('古い parseResidentRequestText を削除し、完全版を1件だけ残しました')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
