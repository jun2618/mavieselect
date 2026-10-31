const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step16-ollama-ai-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP16_OLLAMA_AI */'

if (s.includes(marker)) {
  console.log('STEP16 Ollama AI連携は適用済みです')
  process.exit(0)
}

if (!s.includes('showResidentQuickPaste') || !s.includes('residentQuickPasteText')) {
  console.error('簡単入力機能が見つかりません。変更しませんでした。')
  process.exit(1)
}

// 1. AI処理中state
const stateTarget = "  const [residentQuickError, setResidentQuickError] = useState('')"
if (!s.includes(stateTarget)) {
  console.error('簡単入力stateが見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(stateTarget, `${stateTarget}
  ${marker}
  const [residentAiLoading, setResidentAiLoading] = useState(false)
  const [residentAiStatus, setResidentAiStatus] = useState('')`)

// 2. App内にOllama呼出関数を追加
const functionTarget = '  function updateResidentCase(caseId, patch, historyStatus = \'\', historyMemo = \'\') {'
if (!s.includes(functionTarget)) {
  console.error('関数追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const aiFunction = `  async function analyzeResidentRequestWithOllama() {
    const sourceText = String(residentQuickPasteText || '').trim()
    if (!sourceText) {
      setResidentQuickError('先に依頼文またはPDFの文字を入力してください。')
      return
    }

    setResidentAiLoading(true)
    setResidentAiStatus('ローカルAIが内容を整理しています…')
    setResidentQuickError('')

    const schema = {
      type: 'object',
      properties: {
        company: { type: 'string' },
        propertyName: { type: 'string' },
        unit: { type: 'string' },
        address: { type: 'string' },
        residentName: { type: 'string' },
        residentContact: { type: 'string' },
        requestDetails: { type: 'string' },
        note: { type: 'string' },
        caution: { type: 'string' },
        nextAction: { type: 'string' },
        priority: { type: 'string', enum: ['urgent', 'normal', 'low'] },
      },
      required: [
        'company', 'propertyName', 'unit', 'address', 'residentName',
        'residentContact', 'requestDetails', 'note', 'caution',
        'nextAction', 'priority',
      ],
    }

    const prompt = [
      'あなたは賃貸住宅の修繕依頼をM-Crossへ登録する抽出係です。',
      '推論・説明・Markdownは出力せず、指定されたJSONスキーマだけ返してください。',
      '本文に参考写真や別物件名がある場合、依頼対象の物件を優先してください。',
      '不明な項目は空文字にしてください。',
      'priorityは、漏水・施錠不能・電気設備停止など緊急性が高ければurgent、通常はnormal、時期未定ならlowです。',
      '',
      '【依頼文】',
      sourceText,
    ].join('\\n')

    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:4b',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          think: false,
          format: schema,
          options: { temperature: 0 },
        }),
      })

      if (!response.ok) {
        throw new Error('Ollama HTTP ' + response.status)
      }

      const payload = await response.json()
      const content = payload?.message?.content || payload?.response || ''
      const parsed = JSON.parse(content)

      const matchedProperty = [...mergedPropertyMaster.properties]
        .sort((left, right) => String(right.name || '').length - String(left.name || '').length)
        .find(item => {
          const normalize = value => String(value || '').normalize('NFKC').replace(/[\\s　・･]+/g, '').replace(/べ/g, 'ベ').toLocaleLowerCase('ja')
          const aiName = normalize(parsed.propertyName)
          const masterName = normalize(item.name)
          return aiName && masterName && (aiName === masterName || aiName.includes(masterName) || masterName.includes(aiName))
        })

      const companyName = matchedProperty?.company || parsed.company || ''
      const preview = {
        requestDate: new Date().toLocaleDateString('sv-SE'),
        company: companyName,
        propertyName: matchedProperty?.name || parsed.propertyName || '',
        unit: parsed.unit || '',
        address: matchedProperty?.address || parsed.address || '',
        residentContact: parsed.residentContact || '',
        requestDetails: parsed.requestDetails || '',
        note: [
          parsed.residentName ? '入居者：' + parsed.residentName : '',
          parsed.note || '',
        ].filter(Boolean).join('\\n'),
        status: '未連絡',
        nextAction: parsed.nextAction || '入居者へ連絡',
        actionDueDate: '',
        caution: parsed.caution || '',
        priority: ['urgent', 'normal', 'low'].includes(parsed.priority) ? parsed.priority : 'normal',
      }

      setResidentQuickPreview(preview)
      setResidentQuickCompanyId(
        mergedPropertyMaster.companies.find(item => item.name === companyName)?.id || ''
      )
      setResidentAiStatus('AI読取完了。内容を確認してから登録してください。')
    } catch (error) {
      console.error(error)
      const message = String(error?.message || error)
      const hint = message.includes('Failed to fetch')
        ? 'Ollamaへ接続できません。Ollamaの起動とOLLAMA_ORIGINS設定を確認してください。'
        : 'ローカルAI解析に失敗しました：' + message
      setResidentQuickError(hint)
      setResidentAiStatus('')
    } finally {
      setResidentAiLoading(false)
    }
  }

`

s = s.replace(functionTarget, aiFunction + functionTarget)

// 3. 「内容を読み取る」の直後にAIボタンを追加
const readButtonText = '>内容を読み取る</button>'
const readPos = s.indexOf(readButtonText)
if (readPos === -1) {
  console.error('「内容を読み取る」ボタンが見つかりません。変更しませんでした。')
  process.exit(1)
}
const insertAt = readPos + readButtonText.length
const aiButton = `
                    <button className="primary residentAiReadButton" type="button" disabled={residentAiLoading || !residentQuickPasteText.trim()} onClick={analyzeResidentRequestWithOllama}>
                      {residentAiLoading ? '🤖 AI解析中…' : '🤖 ローカルAIで読み取る'}
                    </button>
                    {residentAiStatus && <p className="residentAiStatus" role="status">{residentAiStatus}</p>}`
s = s.slice(0, insertAt) + aiButton + s.slice(insertAt)

// 4. 見た目
const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) {
  console.error('CSS追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
const css = `/* M-CROSS_RESIDENT_STEP16_OLLAMA_AI_STYLE */
.residentAiReadButton{width:100%;margin:0}.residentAiReadButton:disabled{opacity:.55;cursor:not-allowed}.residentAiStatus{margin:0;padding:9px 11px;border-radius:10px;background:rgba(64,145,100,.10);color:#34704c;font-size:12px;font-weight:800}.theme-dark .residentAiStatus,.theme-cyber .residentAiStatus,.theme-luxury .residentAiStatus,.theme-retro .residentAiStatus,.theme-galaxy .residentAiStatus{color:#9ce4b8}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP16 M-Cross → Ollama直接接続 OK')
console.log('簡単入力画面へ「ローカルAIで読み取る」を追加しました')
console.log('qwen3:4b / think false / JSON Schema固定で呼び出します')
console.log('物件名はAI結果をM-Cross物件マスターと再照合します')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
console.log('接続できない場合はPowerShellで OLLAMA_ORIGINS を設定します')
