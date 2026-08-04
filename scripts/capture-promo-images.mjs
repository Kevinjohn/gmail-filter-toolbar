/**
 * Regenerates the Chrome Web Store promo tiles in docs/screenshots/.
 *
 * Renders a small HTML template that embeds the live icon SVG (src/assets/icon-source.svg), so the
 * promo art always matches whatever the icon currently looks like.
 *
 * Usage:
 *   pnpm run promo:capture
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const ROOT = process.cwd();
const ICON_SVG = fs.readFileSync(path.join(ROOT, 'src', 'assets', 'icon-source.svg'), 'utf8');
const OUTPUT_DIR = path.join(ROOT, 'docs', 'screenshots');

const TILES = [
  {
    name: 'promo-small-440x280',
    width: 440,
    height: 280,
    iconSize: 140,
    titleSize: 48,
    subtitleSize: 17,
    showDetail: false,
  },
  {
    name: 'promo-marquee-1400x560',
    width: 1400,
    height: 560,
    iconSize: 200,
    titleSize: 72,
    subtitleSize: 30,
    detailSize: 24,
    showDetail: true,
  },
];

function html({ width, height, iconSize, titleSize, subtitleSize, detailSize, showDetail }) {
  return `<!doctype html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  }
  .tile {
    position: relative;
    width: ${width}px;
    height: ${height}px;
    background:
      linear-gradient(135deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0) 40%),
      #f7f8f9;
  }
  .bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: ${Math.round(height * 0.018) + 6}px;
    background: #e02424;
  }
  .content {
    position: absolute;
    top: 50%;
    left: ${Math.round(width * 0.1)}px;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    gap: ${Math.round(width * 0.045)}px;
  }
  .icon { width: ${iconSize}px; height: ${iconSize}px; flex: 0 0 auto; }
  .text h1 {
    font-size: ${titleSize}px;
    font-weight: 800;
    color: #1a1a1a;
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .text .subtitle {
    margin-top: ${Math.round(titleSize * 0.22)}px;
    font-size: ${subtitleSize}px;
    font-weight: 400;
    color: #5f6368;
  }
  .text .detail {
    margin-top: ${Math.round(subtitleSize * 0.5)}px;
    font-size: ${detailSize || 0}px;
    font-weight: 400;
    color: #80868b;
  }
</style>
</head>
<body>
  <div class="tile">
    <div class="bar"></div>
    <div class="content">
      <div class="icon">${ICON_SVG}</div>
      <div class="text">
        <h1>Sift</h1>
        <div class="subtitle">A Filter Toolbar for Gmail</div>
        ${showDetail ? '<div class="detail">Filter by calendar invites, attachments, starred mail, and more</div>' : ''}
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const tile of TILES) {
      const page = await browser.newPage({
        viewport: { width: tile.width, height: tile.height },
        deviceScaleFactor: 1,
      });
      await page.setContent(html(tile));
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(OUTPUT_DIR, `${tile.name}.png`) });
      await page.close();
      console.log(`✓ ${tile.name}.png`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
