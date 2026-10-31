const fs=require('fs');
const cp=require('child_process');
const path=require('path');

const candidates=[
  './public/templates/工事カードNew3.xlsm',
  './工事カードNew3.xlsm'
];
const template=candidates.find(p=>fs.existsSync(p));
if(!template){
  console.error('ERROR: 工事カードNew3.xlsm が見つかりません。');
  process.exit(1);
}

const full=path.resolve(template).replace(/'/g,"''");
const out=path.resolve('./purchase_order_template_cells.txt').replace(/'/g,"''");
const ps=`
$ErrorActionPreference='Stop'
$excel=$null
$book=$null
try {
  $excel=New-Object -ComObject Excel.Application
  $excel.Visible=$false
  $excel.DisplayAlerts=$false
  $book=$excel.Workbooks.Open('${full}',0,$true)
  $sheet=$book.Worksheets.Item('発注書')
  $used=$sheet.UsedRange
  $lines=New-Object System.Collections.Generic.List[string]
  $lines.Add('M-Cross 発注書テンプレート セル確認')
  $lines.Add('Sheet: 発注書')
  $lines.Add('UsedRange: '+$used.Address())
  $lines.Add('')
  for($r=1;$r -le $used.Rows.Count;$r++){
    for($c=1;$c -le $used.Columns.Count;$c++){
      $cell=$used.Cells.Item($r,$c)
      $text=[string]$cell.Text
      if(-not [string]::IsNullOrWhiteSpace($text)){
        $address=$cell.Address($false,$false)
        $lines.Add($address+[char]9+$text)
      }
    }
  }
  [System.IO.File]::WriteAllLines('${out}',$lines,[System.Text.UTF8Encoding]::new($false))
  Write-Host 'OK: テンプレートは変更していません。'
  Write-Host '発注書シートの使用セルを出力しました。'
  Write-Host '${out}'
}
finally {
  if($book){$book.Close($false)}
  if($excel){$excel.Quit()}
  if($sheet){[void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($sheet)}
  if($book){[void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($book)}
  if($excel){[void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)}
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
`;

const psPath=path.resolve('./inspect_purchase_order_template_step3_tmp.ps1');
fs.writeFileSync(psPath,ps,'utf8');
try{
  cp.execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',psPath],{stdio:'inherit'});
} finally {
  try{fs.unlinkSync(psPath)}catch{}
}
