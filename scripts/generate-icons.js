const { app, nativeImage } = require('electron')
const fs = require('fs')
const path = require('path')

app.whenReady().then(async () => {
  const pngToIco = (await import('png-to-ico')).default
  const rootDir = path.resolve(__dirname, '..')
  const srcPath = path.join(rootDir, 'resources/icons/1ICON.png')
  const outDir = path.join(rootDir, 'resources/icons')

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const src = nativeImage.createFromPath(srcPath)
  if (src.isEmpty()) {
    console.error('ERROR: TRANSPARENCY.png could not be loaded')
    app.quit()
    process.exit(1)
  }

  const srcSize = src.getSize()
  console.log(`Source: TRANSPARENCY.png (${srcSize.width}x${srcSize.height})`)

  const sizes = [16, 32, 48, 64, 128, 256, 512]
  const icoPngBuffers = []

  for (const size of sizes) {
    const resized = src.resize({ width: size, height: size, quality: 'good' })
    const png = resized.toPNG()
    const outPath = path.join(outDir, `icon-${size}.png`)
    fs.writeFileSync(outPath, png)
    console.log(`  icon-${size}.png  ${(png.length / 1024).toFixed(1)} KB`)

    if (size <= 256) {
      icoPngBuffers.push(png)
    }
  }

  // Generate ICO (multi-res)
  try {
    const icoBuf = await pngToIco(icoPngBuffers)
    fs.writeFileSync(path.join(outDir, 'icon.ico'), icoBuf)
    console.log(`  icon.ico       ${(icoBuf.length / 1024).toFixed(1)} KB (${icoPngBuffers.length} layers)`)
  } catch (err) {
    console.error('ICO generation failed:', err.message)
    // Fallback: single-layer ICO
    console.log('  Falling back to single-layer ICO...')
    const header = Buffer.alloc(6)
    header.writeUInt16LE(0, 0)     // reserved
    header.writeUInt16LE(1, 2)     // ICO type
    header.writeUInt16LE(1, 4)     // 1 image

    const png = icoPngBuffers[icoPngBuffers.length - 1]  // largest PNG
    const entry = Buffer.alloc(16)
    entry.writeUInt8(0, 0)    // width (0=256)
    entry.writeUInt8(0, 1)    // height (0=256)
    entry.writeUInt8(0, 2)    // colors
    entry.writeUInt8(0, 3)    // reserved
    entry.writeUInt16LE(1, 4) // planes
    entry.writeUInt16LE(32, 6)// bpp
    entry.writeUInt32LE(png.length, 8)  // size
    entry.writeUInt32LE(22, 12) // offset (6 + 16)

    fs.writeFileSync(path.join(outDir, 'icon.ico'), Buffer.concat([header, entry, png]))
    console.log(`  icon.ico       ${((22 + png.length) / 1024).toFixed(1)} KB (fallback)`)
  }

  console.log('\nDone \u2014 all icons generated in resources/icons/')
  app.quit()
})
