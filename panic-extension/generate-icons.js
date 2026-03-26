const Jimp = require('jimp').Jimp;

async function createIcon(size, filename) {
  const image = new Jimp({ width: size, height: size, color: 0xEF4444FF }); // Red background

  // Add white border
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const borderSize = Math.max(1, Math.floor(size * 0.05));
      if (x < borderSize || x >= size - borderSize || y < borderSize || y >= size - borderSize) {
        image.setPixelColor(0xFFFFFFFF, x, y);
      }
    }
  }

  // Draw exclamation mark (white pixels)
  const cx = Math.floor(size / 2);
  const dotY = Math.floor(size * 0.75);
  const barTop = Math.floor(size * 0.2);
  const barBottom = Math.floor(size * 0.62);
  const thickness = Math.max(2, Math.floor(size * 0.15));

  for (let x = cx - thickness; x <= cx + thickness; x++) {
    // Bar
    for (let y = barTop; y <= barBottom; y++) {
      if (x >= 0 && x < size && y >= 0 && y < size) {
        image.setPixelColor(0xFFFFFFFF, x, y);
      }
    }
    // Dot
    for (let y = dotY - thickness; y <= dotY + thickness; y++) {
      if (x >= 0 && x < size && y >= 0 && y < size) {
        image.setPixelColor(0xFFFFFFFF, x, y);
      }
    }
  }

  await image.write(filename);
  console.log(`Created ${filename}`);
}

(async () => {
  await createIcon(16, 'icon16.png');
  await createIcon(48, 'icon48.png');
  await createIcon(128, 'icon128.png');
  console.log('All icons created!');
})();
