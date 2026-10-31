const fs=require('fs');
const cp=require('child_process');
const path=require('path');

const markerFile='./purchase_order_buttons_removed_v20.marker';
const candidates=[
  './public/mcross-purchase-order-template.xlsm',
  './public/templates/工事カードNew3.xlsm'
].filter(p=>fs.existsSync(p));

function fail(message){console.error('ERROR: '+message);process.exit(1)}
if(!candidates.length)fail('発注書テンプレートが見つかりません。');
if(fs.existsSync(markerFile))fail('ボタン削除V20はすでに適用されています。');

const targets=['Rounded Rectangle 7','Rounded Rectangle 13','Rounded Rectangle 3','Rounded Rectangle 2'];
const pictureKeep=['Picture 5','Picture 9'];
const stamp=Date.now();

function esc(value){return path.resolve(value).replace(/'/g,"''")}

for(const template of candidates){
  const backup=template+'.buttons-v20-backup-'+stamp;
  fs.copyFileSync(template,backup);

  const ps=`$ErrorActionPreference='Stop'
$excel=$null;$book=$null;$sheet=$null
try {
  $excel=New-Object -ComObject Excel.Application
  $excel.Visible=$false
  $excel.DisplayAlerts=$false
  $book=$excel.Workbooks.Open('${esc(template)}')
  $sheet=$book.Worksheets.Item('発注書')
  $deleteNames=@('Rounded Rectangle 7','Rounded Rectangle 13','Rounded Rectangle 3','Rounded Rectangle 2')
  foreach($name in $deleteNames){
    try{$sheet.Shapes.Item($name).Delete()}catch{throw ('削除対象Shapeが見つかりません: '+$name)}
  }
  foreach($name in @('Picture 5','Picture 9')){
    try{$null=$sheet.Shapes.Item($name)}catch{throw ('保持対象の画像が見つかりません: '+$name)}
  }
  $book.Save()
  Write-Output 'OK: ${esc(template)}'
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
  }catch(error){
    fs.copyFileSync(backup,template);
    fail('ボタン削除に失敗したためテンプレートを復旧しました: '+template);
  }
}

fs.writeFileSync(markerFile,JSON.stringify({appliedAt:new Date().toISOString(),deleted:targets,kept:pictureKeep,templates:candidates},null,2),'utf8');

try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  const dist='./dist/mcross-purchase-order-template.xlsm';
  if(!fs.existsSync(dist))throw new Error('distテンプレートが見つかりません。');
  console.log('');
  console.log('OK: 発注書ボタン限定削除V20を適用しました。');
  console.log('削除: 発注済スタンプ / 原価計算へ転記 / 工程表へ書出し / 数量再計算');
  console.log('保持: Picture 5 / Picture 9（MSロゴを含む画像）');
  console.log('重要: public/mcross-purchase-order-template.xlsm をGitへ追加してください。');
}catch(error){
  console.error('ERROR: build確認に失敗しました。テンプレートのバックアップは残っています。');
  console.error(error?.message||String(error));
  process.exit(1);
}
