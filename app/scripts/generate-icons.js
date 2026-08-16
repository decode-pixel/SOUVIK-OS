import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const svgPath = path.resolve('public/favicon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  console.log('Generating PWA icons from favicon.svg...');

  // 1. 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.resolve('public/pwa-192x192.png'));
  console.log('✔ Generated public/pwa-192x192.png');

  // 2. 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.resolve('public/pwa-512x512.png'));
  console.log('✔ Generated public/pwa-512x512.png');

  // 3. 180x180 Apple Touch Icon
  await sharp(svgBuffer)
    .resize(180, 180, { fit: 'contain', background: { r: 245, g: 244, b: 242, alpha: 1 } }) // #f5f4f2 background for iOS icon
    .png()
    .toFile(path.resolve('public/apple-touch-icon-180x180.png'));
  console.log('✔ Generated public/apple-touch-icon-180x180.png');

  // 4. 512x512 Maskable PNG (with 10% safe margin on dark background #0a0a0c)
  const innerIcon = await sharp(svgBuffer)
    .resize(410, 410, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 10, g: 10, b: 12, alpha: 1 } // #0a0a0c
    }
  })
    .composite([{ input: innerIcon, gravity: 'center' }])
    .png()
    .toFile(path.resolve('public/maskable-icon-512x512.png'));
  console.log('✔ Generated public/maskable-icon-512x512.png');

  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
