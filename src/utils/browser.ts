/**
 * 本地无头 Chromium 浏览器寻址与连接池管理
 * 自动复用系统已安装的 Chrome 或 Edge，零额外浏览器二进制下载开销。
 */
import fs from 'node:fs';
import { chromium, type Browser, type BrowserContext, type BrowserContextOptions } from 'playwright-core';

const CANDIDATE_PATHS = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter(Boolean) as string[];

export function findLocalChromiumExecutable(): string {
  for (const p of CANDIDATE_PATHS) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  throw new Error(
    '未检测到本地 Chrome 或 Edge 浏览器可执行文件，请设置环境变量 CHROME_PATH 指向浏览器路径。'
  );
}

let sharedBrowser: Browser | null = null;

export async function acquireBrowser(): Promise<Browser> {
  if (sharedBrowser && sharedBrowser.isConnected()) {
    return sharedBrowser;
  }
  const executablePath = findLocalChromiumExecutable();
  sharedBrowser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none',
    ],
  });
  return sharedBrowser;
}

export async function createFastHeadlessContext(
  browser: Browser,
  options: BrowserContextOptions = {}
): Promise<BrowserContext> {
  const ctx = await browser.newContext(options);
  // 拦截慢速远程字体请求，防止 Playwright screenshot() 卡在 waiting for fonts to load
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  return ctx;
}

export async function closeBrowserPool(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close().catch(() => {});
    sharedBrowser = null;
  }
}
