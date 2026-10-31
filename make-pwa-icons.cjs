const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const root = process.cwd()
const source = path.join(root, 'm-cross-logo.png')
const publicDir = path.join(root, 'public')

if (!fs.existsSync(source)) {
  console.error('m-cross-logo.png が見つかりません')
  process.exit(1)
}

fs.mkdirSync(publicDir, { recursive: true })

async function main() {
  await sharp(source)
    .resize(192, 192, {
      fit: 'contain',
    })
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'))

  await sharp(source)
    .resize(512, 512, {
      fit: 'contain',
    })
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'))

  await sharp(source)
    .resize(180, 180, {
      fit: 'contain',
    })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'))

  console.log('OK: pwa-192x192.png')
  console.log('OK: pwa-512x512.png')
  console.log('OK: apple-touch-icon.png')
  console.log('保存先: public フォルダー')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})