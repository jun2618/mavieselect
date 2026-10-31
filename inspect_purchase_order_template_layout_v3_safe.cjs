const fs=require('fs');
const cp=require('child_process');
const path=require('path');
const candidates=['./public/templates/工事カードNew3.xlsm','./工事カードNew3.xlsm'];
const template=candidates.find(p=>fs.existsSync(p));
if(!template){console.error('ERROR: 工事カードNew3.xlsm が見つかりません。');process.exit(1)}
const full=path.resolve(template).replace(/'/g,"''");
const out=path.resolve('./purchase_order_template_layout.txt').replace(/'/g,"''");
const ps=`$ErrorActionPreference='Stop'
$excel=$null;$book=$null;$sheet=$null
try {
  $excel=New-Object -ComObject Excel.Application
  $excel.Visible=$false;$excel.DisplayAlerts=$false
  $book=$excel.Workbooks.Open('${full}',0,$true)
  $sheet=$book.Worksheets.Item('発注書')
  $lines=New-Object System.Collections.Generic.List[string]
  $lines.Add('M-Cross Purchase Order Template Layout')
  $lines.Add('Sheet: '+$sheet.Name)
  $lines.Add('')
  $seen=@{}
  foreach($cell in $sheet.UsedRange.Cells){
    if($cell.MergeCells){
      $area=$cell.MergeArea.Address($false,$false)
      if(-not $seen.ContainsKey($area)){
        $seen[$area]=$true
        $value=[string]$cell.MergeArea.Cells.Item(1,1).Text
        $lines.Add('MERGE'+[char]9+$area+[char]9+$value)
      }
    }
  }
  $lines.Add('')
  for($r=1;$r -le 52;$r++){
    $parts=New-Object System.Collections.Generic.List[string]
    for($c=1;$c -le 17;$c++){
      $cell=$sheet.Cells.Item($r,$c)
      $address=$cell.Address($false,$false)
      $text=[string]$cell.Text
      $formula=[string]$cell.Formula
      if($text -or ($formula -and $formula -ne $text)){
        $parts.Add($address+'='+$text + $(if($formula -and $formula -ne $text){' [F:'+ $formula +']'}else{''}))
      }
    }
    if($parts.Count -gt 0){$lines.Add('ROW '+$r+[char]9+($parts -join ' | '))}
  }
  [System.IO.File]::WriteAllLines('${out}',$lines,[System.Text.UTF8Encoding]::new($false))
  Write-Output 'OK: template unchanged'
  Write-Output '${out}'
}
finally{
  if($book){$book.Close($false)};if($excel){$excel.Quit()}
  if($sheet){[void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($sheet)}
  if($book){[void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($book)}
  if($excel){[void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)}
  [GC]::Collect();[GC]::WaitForPendingFinalizers()
}`;
const encoded=Buffer.from(ps,'utf16le').toString('base64');
try{cp.execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand',encoded],{stdio:'inherit'});console.log('Next: Get-Content .\\purchase_order_template_layout.txt -Encoding UTF8');}
catch(e){console.error('ERROR: layout inspection failed. Template unchanged.');process.exit(1)}
