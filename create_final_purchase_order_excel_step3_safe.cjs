const fs=require('fs');
const cp=require('child_process');
const path=require('path');
const os=require('os');

function fail(message){console.error('ERROR: '+message);process.exit(1)}

const templateCandidates=[
  './public/templates/工事カードNew3.xlsm',
  './工事カードNew3.xlsm'
];
const template=templateCandidates.find(p=>fs.existsSync(p));
if(!template)fail('工事カードNew3.xlsm が見つかりません。');

const downloadDir=path.join(os.homedir(),'Downloads');
const jsonCandidates=[
  path.resolve('./mcross_purchase_order_export.json'),
  path.join(downloadDir,'mcross_purchase_order_export.json')
];
if(fs.existsSync(downloadDir)){
  fs.readdirSync(downloadDir)
    .filter(name=>/^mcross_purchase_order_export(?: \(\d+\))?\.json$/i.test(name))
    .forEach(name=>jsonCandidates.push(path.join(downloadDir,name)));
}
const jsonPath=jsonCandidates
  .filter(p=>fs.existsSync(p))
  .sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs)[0];
if(!jsonPath)fail('mcross_purchase_order_export.json が見つかりません。M-Crossで「本発注書を作成」→「転記データを出力」を先に実行してください。');

let payload;
try{payload=JSON.parse(fs.readFileSync(jsonPath,'utf8'))}catch{fail('転記データJSONを読み込めません。')}
if(!Array.isArray(payload.rows)||!payload.rows.length)fail('転記できる明細がありません。');
if(payload.rows.length>27)fail('明細が27行を超えています。現在のテンプレートは22行目から48行目までの27明細です。');

const safeName=value=>String(value||'').replace(/[\\/:*?"<>|]/g,'_').trim();
const propertyName=safeName(payload.property?.name||'物件名未設定');
const unit=safeName(payload.property?.unit||'');
const contractorName=safeName(payload.contractor?.name||'発注先未設定');
const dateText=new Date().toISOString().slice(0,10).replace(/-/g,'');
const outputName=`本発注書_${propertyName}_${unit?unit+'号室_':''}${contractorName}_${dateText}.xlsm`;
const outputDir=path.resolve('./output');
fs.mkdirSync(outputDir,{recursive:true});
const outputPath=path.join(outputDir,outputName);

// PowerShellへ安全に渡すため、一時JSONはUTF-8 BOMなしで固定。
const tempJson=path.resolve('./final_purchase_order_step3_payload.json');
fs.writeFileSync(tempJson,JSON.stringify(payload,null,2),'utf8');

const esc=p=>path.resolve(p).replace(/'/g,"''");
const ps=`$ErrorActionPreference='Stop'
$excel=$null;$book=$null;$sheet=$null
try {
  Copy-Item -LiteralPath '${esc(template)}' -Destination '${esc(outputPath)}' -Force
  $data=Get-Content -LiteralPath '${esc(tempJson)}' -Raw -Encoding UTF8 | ConvertFrom-Json
  $excel=New-Object -ComObject Excel.Application
  $excel.Visible=$false
  $excel.DisplayAlerts=$false
  $book=$excel.Workbooks.Open('${esc(outputPath)}')
  $sheet=$book.Worksheets.Item('発注書')

  # Header / contractor
  $sheet.Range('I2').Value2=(Get-Date).ToString('yyyy/MM/dd')
  $sheet.Range('A5').Value2=[string]$data.contractor.name
  $contractorAddress=@([string]$data.contractor.postalCode,[string]$data.contractor.address) -join ' '
  $contactLines=@($contractorAddress,[string]$data.contractor.contact,[string]$data.contractor.phone) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  $sheet.Range('A6').Value2=($contactLines -join [Environment]::NewLine)
  $sheet.Range('A6').WrapText=$true

  # Property
  $sheet.Range('B12').Value2=[string]$data.property.name
  $sheet.Range('E12').Value2=[string]$data.property.unit
  $sheet.Range('B13').Value2=[string]$data.property.address
  $sheet.Range('A49').Value2=('工事名: '+[string]$data.property.workName)

  # Clear old detail values but preserve formats and formulas in J.
  $sheet.Range('A22:I48').ClearContents()
  for($r=22;$r -le 48;$r++){$sheet.Cells.Item($r,10).Formula=('=SUM(G'+$r+'*I'+$r+')')}

  $rowIndex=22
  foreach($row in $data.rows){
    $itemText=[string]$row.item
    $spec=[string]$row.specification
    $sheet.Cells.Item($rowIndex,1).Value2=if([string]$data.orderMode -eq 'material'){'材料'}else{'施工'}
    $sheet.Cells.Item($rowIndex,2).Value2=if([string]::IsNullOrWhiteSpace($spec)){$itemText}else{$itemText+' '+$spec}
    $sheet.Cells.Item($rowIndex,7).Value2=[double]$row.quantity
    $sheet.Cells.Item($rowIndex,8).Value2=[string]$row.unit
    if($null -ne $row.unitPrice -and [string]$row.unitPrice -ne ''){$sheet.Cells.Item($rowIndex,9).Value2=[double]$row.unitPrice}
    $rowIndex++
  }

  # Keep template formulas for subtotal/tax/total and replace external-link cells with blanks.
  $sheet.Range('J49').Formula='=SUM(J22:J48)'
  $sheet.Range('J50').Formula='=SUM(J49*0.1)'
  $sheet.Range('J51').Formula='=SUM(J49:J50)'
  $sheet.Range('D18').Formula='=J51'
  foreach($cell in @('J14','J15','J16','J17','J18')){$sheet.Range($cell).ClearContents()}

  $book.Save()
  Write-Output 'OK: 本発注書Excelを作成しました。'
  Write-Output '${esc(outputPath)}'
}
finally{
  if($book){$book.Close($true)}
  if($excel){$excel.Quit()}
  if($sheet){[void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($sheet)}
  if($book){[void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($book)}
  if($excel){[void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)}
  [GC]::Collect();[GC]::WaitForPendingFinalizers()
}`;

const encoded=Buffer.from(ps,'utf16le').toString('base64');
try{
  cp.execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand',encoded],{stdio:'inherit'});
  console.log('');
  console.log('作成先: '+outputPath);
  console.log('確認: Invoke-Item "'+outputPath+'"');
}catch(error){
  console.error('ERROR: Excel本発注書の作成に失敗しました。テンプレート原本は変更していません。');
  process.exit(1);
}finally{
  try{fs.unlinkSync(tempJson)}catch{}
}
