import http from 'node:http';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const DIST_DIR = path.join(process.cwd(), 'dist', process.env.BROWSER ?? 'chrome');
const REPORT_DIR = path.join(process.cwd(), 'artifacts', 'lighthouse');
const PORT = Number.parseInt(process.env.LIGHTHOUSE_PORT ?? '3333', 10);
const DEFAULT_ENTRY = 'options.html';
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

async function ensureDistPresent() {
  const optionsPath = path.join(DIST_DIR, DEFAULT_ENTRY);
  if (!fs.existsSync(optionsPath)) {
    console.error(
      `${path.relative(process.cwd(), optionsPath)} missing. Run \`pnpm run build:chrome\` before auditing.`,
    );
    process.exitCode = 1;
    process.exit();
  }
}

function resolveFilePath(requestUrl) {
  const url = new URL(requestUrl, `http://localhost:${PORT}`);
  const rawPath = url.pathname === '/' ? `/${DEFAULT_ENTRY}` : url.pathname;
  const normalizedPath = path.normalize(rawPath).replace(/^([\\/])+/, '');
  const absolutePath = path.join(DIST_DIR, normalizedPath);
  const relativePath = path.relative(DIST_DIR, absolutePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }
  return absolutePath;
}

async function serveStaticFile(res, filePath) {
  try {
    const stats = await fsp.stat(filePath);
    if (stats.isDirectory()) {
      return serveStaticFile(res, path.join(filePath, 'index.html'));
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

async function createServer() {
  await ensureDistPresent();

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const filePath = resolveFilePath(req.url ?? '/');
      if (!filePath || !(await serveStaticFile(res, filePath))) {
        res.statusCode = 404;
        res.end('Not found');
      }
    });

    server.on('error', reject);
    server.listen(PORT, () => resolve(server));
  });
}

async function runAudit() {
  const server = await createServer();
  let chrome;

  try {
    chrome = await launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    const url = `http://localhost:${PORT}/${DEFAULT_ENTRY}`;
    const options = {
      logLevel: 'info',
      output: ['html', 'json'],
      onlyCategories: ['performance', 'accessibility', 'best-practices'],
      port: chrome.port,
    };

    const runnerResult = await lighthouse(url, options);
    const reports = Array.isArray(runnerResult.report)
      ? runnerResult.report
      : [runnerResult.report];

    await fsp.mkdir(REPORT_DIR, { recursive: true });

    const [htmlReport, jsonReport] = reports.length === 2 ? reports : [reports[0], null];
    if (htmlReport) {
      await fsp.writeFile(path.join(REPORT_DIR, 'options-report.html'), htmlReport, 'utf8');
    }
    if (jsonReport) {
      await fsp.writeFile(
        path.join(REPORT_DIR, 'options-report.json'),
        typeof jsonReport === 'string' ? jsonReport : JSON.stringify(jsonReport, null, 2),
        'utf8',
      );
    }

    const {
      performance,
      accessibility,
      'best-practices': bestPractices,
    } = runnerResult.lhr.categories;
    const fmt = (value) => Math.round((value.score ?? 0) * 100);
    const scores = {
      performance: fmt(performance),
      accessibility: fmt(accessibility),
      bestPractices: fmt(bestPractices),
    };
    console.info(
      `Lighthouse – performance: ${scores.performance} / accessibility: ${scores.accessibility} / best practices: ${scores.bestPractices}`,
    );
    const thresholds = { performance: 90, accessibility: 95, bestPractices: 95 };
    const failures = Object.entries(thresholds).filter(([key, minimum]) => scores[key] < minimum);
    if (failures.length) {
      throw new Error(
        `Lighthouse thresholds failed: ${failures
          .map(([key, minimum]) => `${key} ${scores[key]} < ${minimum}`)
          .join(', ')}`,
      );
    }
  } finally {
    await chrome?.kill();
    await new Promise((resolve) => server.close(resolve));
  }
}

runAudit().catch((error) => {
  console.error('Lighthouse audit failed:', error);
  process.exitCode = 1;
});
