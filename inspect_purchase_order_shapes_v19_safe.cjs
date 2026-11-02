const fs=require('fs');
const cp=require('child_process');
const path=require('path');

const candidates=['./public/mcross-purchase-order-template.xlsm','./public/templates/工事カードNew3.xlsm','./工事カードNew3.xlsm'];
const template=candidates.find(p=>fs.existsSync(p));
if(!template){console.error('ERROR: 発注書テンプレートが見つかりません。');process.exit(1)}
const full=path.resolve(template).replace(/'/g,"''");
const out=path.resolve('./purchase_order_shapes.txt').replace(/'/g,"''");

const ps=`$ErrorActionPreference='Stop'
$excel=$null;$book=$null;$sheet=$null
try {
  $excel=New-Object -ComObject Excel.Application
  $excel.Visible=$false
  $excel.DisplayAlerts=$false
  $book=$excel.Workbooks.Open('${full}',0,$true)
  $sheet=$book.Worksheets.Item('発注書')
  $lines=New-Object System.Collections.Generic.List[string]
  $lines.Add('M-Cross 発注書 Shape確認')
  $lines.Add('Sheet: 発注書')
  $lines.Add('Shapes: '+$sheet.Shapes.Count)
  $lines.Add('')
  foreach($shape in $sheet.Shapes){
    $name=[string]$shape.Name
    $type=[string]$shape.Type
    $left=[math]::Round([double]$shape.Left,1)
    $top=[math]::Round([double]$shape.Top,1)
    $width=[math]::Round([double]$shape.Width,1)
    $height=[math]::Round([double]$shape.Height,1)
    $text=''
    try{$text=[string]$shape.TextFrame2.TextRange.Text}catch{}
    if([string]::IsNullOrWhiteSpace($text)){try{$text=[string]$shape.TextFrame.Characters().Text}catch{}}
    $lines.Add(('NAME={0}{7}TYPE={1}{7}L={2}{7}T={3}{7}W={4}{7}H={5}{7}TEXT={6}' -f $name,$type,$left,$top,$width,$height,$text,[char]9))
  }
  [System.IO.File]::WriteAllLines('${out}',$lines,[System.Text.UTF8Encoding]::new($false))
  Write-Output 'OK: テンプレートは変更していません。'
  Write-Output '${out}'
}
finally{
  if($book){$book.Close($false)}
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
  console.log('次に実行: Get-Content .\\purchase_order_shapes.txt -Encoding UTF8');
}catch(e){
  console.error('ERROR: Shape確認に失敗しました。テンプレート原本は変更していません。');
  process.exit(1)
}
