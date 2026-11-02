$path = ".\src\App.jsx"
$backup = ".\src\App.jsx.before_material_add_top_v48.bak"

Copy-Item $path $backup -Force

$text = Get-Content $path -Raw

$marker = "{/* M-CROSS_MATERIAL_ORDER_LIKE_SERVICE_V45_SAFE */}"

$insert = @'
{/* M-CROSS_MATERIAL_ADD_TOP_V48_SAFE */}
<button
  type="button"
  className="materialAddTopButton"
  onClick={() => {
    const id =
      'material-free-' +
      Date.now() +
      '-' +
      Math.random().toString(36).slice(2, 7)

    setMaterialOrderItems(previous => [
      ...previous,
      {
        id,
        materialType:'other',
        productCode:'',
        description:'',
        quantity:1,
        unit:''
      }
    ])
  }}
>
  ＋ 材料行を追加
</button>

{/* M-CROSS_MATERIAL_ORDER_LIKE_SERVICE_V45_SAFE */}
'@

if (-not $text.Contains($marker)) {
    Write-Host "対象が見つかりません。App.jsxは変更していません。" -ForegroundColor Yellow
    exit 1
}

$text = $text.Replace($marker, $insert)
Set-Content $path $text -Encoding UTF8

Write-Host "材料行追加ボタン 上部追加: OK" -ForegroundColor Green