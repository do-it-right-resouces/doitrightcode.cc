const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 8080;
const ROOT = process.cwd();

function createStaticServer(root, port) {
  return http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    const fsPath = path.join(root, reqPath);
    fs.readFile(fsPath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(fsPath).toLowerCase();
      const types = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml'
      };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      res.end(data);
    });
  }).listen(port);
}

(async () => {
  const server = createStaticServer(ROOT, PORT);
  console.log(`Static server started on http://localhost:${PORT}`);

  let browser;
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], timeout: 30000 });
  } catch (e) {
    console.warn('Default launch failed, trying system Chrome... ', e.message);
    // Try system Chrome (macOS path)
    const chromePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];
    for (const p of chromePaths) {
      try {
        browser = await puppeteer.launch({ executablePath: p, args: ['--no-sandbox', '--disable-setuid-sandbox'], timeout: 30000 });
        console.log('Launched system chrome at', p);
        break;
      } catch (err) {
        console.warn('Failed to launch at', p, err.message);
      }
    }
    if (!browser) throw e;
  }
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push({ type: 'console', text });
    console.log('PAGE:', text);
  });
  page.on('pageerror', err => {
    logs.push({ type: 'pageerror', text: err.message });
    console.error('PAGE ERROR:', err.message);
  });

  try {
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for init to run
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Run tests
    console.log('Invoking runTests() in the page...');
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          if (typeof runTests !== 'function') {
            resolve({ ok: false, reason: 'runTests function not found' });
            return;
          }
          // Replace console output capture to include results
          const oldLog = console.log;
          const out = [];
          console.log = (...args) => { out.push(args.join(' ')); oldLog.apply(console, args); };

          // run tests and resolve in 12s (allows all 10 tests including CA 2017 and FL 2020 IDEMIA compliance tests to complete)
          runTests();
          setTimeout(() => { console.log = oldLog; resolve({ ok: true, output: out }); }, 12000);
        } catch (e) {
          resolve({ ok: false, reason: e.message });
        }
      });
    });

    if (!result.ok) {
      console.error('runTests failed to start:', result.reason);
    } else {
      console.log('runTests output (collected):');
      result.output.forEach(l => console.log('  ', l));
    }

  } catch (e) {
    console.error('E2E ERROR:', e.message);
  } finally {
    await browser.close();
    server.close();
    // Write collected logs to file for inspection
    fs.writeFileSync(path.join(ROOT, 'e2e_logs.json'), JSON.stringify(logs, null, 2));
    console.log('E2E finished; logs written to e2e_logs.json');
  }
})();