const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile, exec } = require('child_process');

// Track all open windows
const windows = new Map();
let windowCounter = 0;

// Load config: private (~/.config/diff-reviewer/config.json) overrides public (./config.json)
function loadConfig() {
  const publicConfigPath = path.join(__dirname, 'config.json');
  const privateConfigPath = path.join(app.getPath('home'), '.config', 'diff-reviewer', 'config.json');

  const defaults = {
    aiCommand: 'hermes',
    aiSendArgs: ['send', '--to'],
    aiChatId: null,
    aiTagPrefix: '@Hermes',
    reviewSaveDir: '',  // Will default to app userData/reviews
    prFilter: { reviewRequested: true, titleContains: '' },
    repoOwner: '',
    repoName: '',
    imageUpload: {
      enabled: false,
      provider: 's3',
      s3Bucket: '',
      s3Prefix: '',
      s3Acl: 'public-read',
      awsProfile: 'default',
      awsRegion: 'us-east-1'
    }
  };

  let config = { ...defaults };

  try {
    const raw = fs.readFileSync(publicConfigPath, 'utf8');
    const parsed = JSON.parse(raw);
    config = { ...config, ...parsed };
    if (parsed.imageUpload) config.imageUpload = { ...config.imageUpload, ...parsed.imageUpload };
    if (parsed.prFilter) config.prFilter = { ...config.prFilter, ...parsed.prFilter };
  } catch {}

  try {
    const raw = fs.readFileSync(privateConfigPath, 'utf8');
    const parsed = JSON.parse(raw);
    config = { ...config, ...parsed };
    if (parsed.imageUpload) config.imageUpload = { ...config.imageUpload, ...parsed.imageUpload };
    if (parsed.prFilter) config.prFilter = { ...config.prFilter, ...parsed.prFilter };
  } catch {}

  return config;
}

const appConfig = loadConfig();

// Parse CLI args
let aiChatId = appConfig.aiChatId;
let cliPrNumber = null;
const rawArgs = process.argv.slice(2);
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--chat-id' && rawArgs[i + 1]) {
    aiChatId = rawArgs[++i];
  } else if (rawArgs[i] === '--pr-number' && rawArgs[i + 1]) {
    cliPrNumber = rawArgs[++i];
  }
}

const positionalArgs = rawArgs.filter((_, i) => {
  const prev = rawArgs[i - 1];
  return rawArgs[i] !== '--chat-id' && rawArgs[i] !== '--pr-number'
    && prev !== '--chat-id' && prev !== '--pr-number';
});

function sendAiMessage(message) {
  if (!aiChatId) {
    // No chat-id specified — send without --to (creates new session)
    console.log('[ai] No chat-id configured, sending to new session');
    const args = [appConfig.aiSendArgs[0], message]; // Just "send" without "--to"
    execFile(appConfig.aiCommand, args, (err) => {
      if (err) console.error(`[${appConfig.aiCommand}] send failed:`, err.message);
      else console.log(`[${appConfig.aiCommand}] message sent to new session`);
    });
    return;
  }
  const args = [...appConfig.aiSendArgs, aiChatId, message];
  execFile(appConfig.aiCommand, args, (err) => {
    if (err) console.error(`[${appConfig.aiCommand}] send failed:`, err.message);
    else console.log(`[${appConfig.aiCommand}] message sent`);
  });
}

function expandPath(p) {
  if (p && p.startsWith('~')) {
    return path.join(app.getPath('home'), p.slice(1));
  }
  return p;
}

// Get the app's data directory for reviews, drafts, images, etc.
function getAppDataDir() {
  return app.getPath('userData');
}

function getReviewDir() {
  const configured = appConfig.reviewSaveDir;
  if (configured) {
    return expandPath(configured);
  }
  // Default to app's userData/reviews
  const dir = path.join(getAppDataDir(), 'reviews');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getDraftsDir() {
  const dir = path.join(getAppDataDir(), 'drafts');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getGeneratedDir() {
  const dir = path.join(getAppDataDir(), 'generated');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Draft management
function getDraftPath(diffFilePath) {
  const draftDir = getDraftsDir();
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(diffFilePath || 'unsaved').digest('hex').slice(0, 12);
  return path.join(draftDir, `draft-${hash}.json`);
}

function saveDraft(diffFilePath, draft) {
  try {
    const draftPath = getDraftPath(diffFilePath);
    fs.writeFileSync(draftPath, JSON.stringify(draft, null, 2));
    return draftPath;
  } catch (err) {
    console.error('[draft] save failed:', err.message);
    return null;
  }
}

function loadDraft(diffFilePath) {
  try {
    const draftPath = getDraftPath(diffFilePath);
    if (fs.existsSync(draftPath)) {
      const raw = fs.readFileSync(draftPath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[draft] load failed:', err.message);
  }
  return null;
}

function deleteDraft(diffFilePath) {
  try {
    const draftPath = getDraftPath(diffFilePath);
    if (fs.existsSync(draftPath)) {
      fs.unlinkSync(draftPath);
    }
  } catch (err) {
    console.error('[draft] delete failed:', err.message);
  }
}

// S3 upload
function uploadImageToS3(imageDataUrl, fileName) {
  return new Promise((resolve, reject) => {
    const upload = appConfig.imageUpload || {};
    if (!upload.enabled || !upload.s3Bucket) {
      return reject(new Error('S3 image upload not configured'));
    }

    const tmpPath = path.join(getGeneratedDir(), fileName);
    const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(tmpPath, Buffer.from(base64, 'base64'));

    const bucket = upload.s3Bucket;
    const prefix = upload.s3Prefix || '';
    const acl = upload.s3Acl || 'public-read';
    const profile = upload.awsProfile || 'default';
    const region = upload.awsRegion || 'us-east-1';
    const s3Key = prefix ? `${prefix}/${fileName}` : fileName;

    const cmd = `aws --profile ${profile} --region ${region} s3 cp "${tmpPath}" "s3://${bucket}/${s3Key}" --acl ${acl}`;

    exec(cmd, { timeout: 30000 }, (err) => {
      try { fs.unlinkSync(tmpPath); } catch {}

      if (err) {
        console.error('[s3] upload failed:', err.message);
        return reject(new Error(`S3 upload failed: ${err.message}`));
      }

      const url = `https://${bucket}.s3.amazonaws.com/${encodeURIComponent(fileName)}`;
      console.log('[s3] uploaded:', url);
      resolve(url);
    });
  });
}

// Generate diff for a PR
function generateDiff(prNumber) {
  return new Promise((resolve, reject) => {
    const repoPath = path.join(app.getPath('home'), 'Website-Toolbox');
    const owner = appConfig.repoOwner || 'webtoolbox';
    const repo = appConfig.repoName || 'Website-Toolbox';

    exec(`gh api repos/${owner}/${repo}/pulls/${prNumber} --jq '.base.sha, .head.sha'`, { cwd: repoPath }, (err, stdout) => {
      if (err) return reject(new Error(`Failed to get PR info: ${err.message}`));
      const [baseSha, headSha] = stdout.trim().split('\n');
      if (!baseSha || !headSha) return reject(new Error('Could not parse PR SHAs'));

      const cmd = `git diff ${baseSha}..${headSha} -- '*.pm' '*.cgi' '*.js' '*.tpl' '*.css' '*.less' '*.json'`;
      exec(cmd, { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 }, (err2, diffOut) => {
        if (err2) return reject(new Error(`Failed to generate diff: ${err2.message}`));
        const tmpPath = path.join(getGeneratedDir(), `pr-${prNumber}-clean.diff`);
        fs.writeFileSync(tmpPath, diffOut);
        resolve({ diffPath: tmpPath, baseSha, headSha });
      });
    });
  });
}

// Create application menu with "New Window" option
function createMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow()
        },
        {
          label: 'Open Diff...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused) focused.webContents.send('trigger-open-file');
          }
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Create a new window
function createWindow(options = {}) {
  const windowId = ++windowCounter;

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Diff Reviewer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  windows.set(windowId, win);

  win.loadFile('index.html');

  win.webContents.on('did-finish-load', () => {
    // Load file from options or CLI args
    if (options.filePath && fs.existsSync(options.filePath)) {
      const diffContent = fs.readFileSync(options.filePath, 'utf8');
      const fileName = path.basename(options.filePath);
      win.webContents.send('load-diff', { content: diffContent, fileName, filePath: path.resolve(options.filePath) });
    } else if (options.diffContent) {
      win.webContents.send('load-diff', { content: options.diffContent, fileName: options.fileName || '', filePath: options.filePath || '' });
    }
  });

  win.on('closed', () => {
    windows.delete(windowId);
  });

  return win;
}

// App lifecycle
app.whenReady().then(() => {
  createMenu();

  // Create initial window with CLI args
  const firstWindowOptions = {};
  if (positionalArgs[0] && fs.existsSync(positionalArgs[0])) {
    firstWindowOptions.filePath = positionalArgs[0];
  }
  createWindow(firstWindowOptions);
});

// macOS: handle file open via double-click or drag onto app icon
let pendingOpenFile = null;

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (windows.size > 0) {
    const win = Array.from(windows.values())[0];
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    win.webContents.send('load-diff', { content, fileName, filePath: path.resolve(filePath) });
  } else {
    pendingOpenFile = filePath;
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

// IPC handlers

ipcMain.handle('open-file', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'Diff Files', extensions: ['diff', 'patch'] }]
  });
  if (!result.canceled && result.filePaths[0]) {
    const content = fs.readFileSync(result.filePaths[0], 'utf8');
    const fileName = path.basename(result.filePaths[0]);
    const filePath = path.resolve(result.filePaths[0]);
    return { content, fileName, filePath };
  }
  return null;
});

ipcMain.handle('save-draft', async (event, { filePath, draft }) => saveDraft(filePath, draft));
ipcMain.handle('load-draft', async (event, filePath) => loadDraft(filePath));
ipcMain.handle('delete-draft', async (event, filePath) => { deleteDraft(filePath); return true; });

ipcMain.handle('save-image', async (event, { reviewDir, imageDataUrl, fileName }) => {
  try {
    const dir = reviewDir || getReviewDir();
    const imagesDir = path.join(dir, 'images');
    fs.mkdirSync(imagesDir, { recursive: true });
    const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    const filePath = path.join(imagesDir, fileName);
    fs.writeFileSync(filePath, buffer);
  } catch (err) {
    console.error('[image] local save failed:', err.message);
  }

  const upload = appConfig.imageUpload || {};
  if (upload.enabled && upload.s3Bucket) {
    try {
      const url = await uploadImageToS3(imageDataUrl, fileName);
      return { localPath: `images/${fileName}`, url };
    } catch (err) {
      console.error('[image] S3 upload failed:', err.message);
      return { localPath: `images/${fileName}`, url: null };
    }
  }

  return { localPath: `images/${fileName}`, url: null };
});

// Open PR in a new window
ipcMain.handle('open-pr-new-window', async (event, prNumber) => {
  try {
    const { diffPath } = await generateDiff(prNumber);
    const content = fs.readFileSync(diffPath, 'utf8');
    const fileName = `pr-${prNumber}-clean.diff`;
    createWindow({ diffContent: content, fileName, filePath: diffPath });
    return { success: true };
  } catch (err) {
    console.error('[pr-new-window] failed:', err.message);
    return { error: err.message };
  }
});

ipcMain.handle('load-pr', async (event, prNumber) => {
  try {
    const { diffPath } = await generateDiff(prNumber);
    const content = fs.readFileSync(diffPath, 'utf8');
    const fileName = `pr-${prNumber}-clean.diff`;
    return { content, fileName, filePath: diffPath, prNumber };
  } catch (err) {
    console.error('[pr] load failed:', err.message);
    return { error: err.message };
  }
});

ipcMain.handle('list-prs', async () => {
  const owner = appConfig.repoOwner;
  const repo = appConfig.repoName;
  if (!owner || !repo) {
    return { prs: [], error: 'Set repoOwner and repoName in config' };
  }

  const filter = appConfig.prFilter || {};

  return new Promise((resolve) => {
    let cmd = `gh api 'repos/${owner}/${repo}/pulls?state=open&per_page=50' --jq '[.[] | {number, title, author: .user.login, created: .created_at, reviewers: [.requested_reviewers[].login], draft}]'`;
    exec(cmd, { maxBuffer: 5 * 1024 * 1024 }, (err, stdout) => {
      if (err) {
        console.error('[list-prs] failed:', err.message);
        resolve({ prs: [], error: err.message });
        return;
      }

      let prs = [];
      try {
        prs = JSON.parse(stdout);
      } catch (e) {
        resolve({ prs: [], error: 'Failed to parse PR list' });
        return;
      }

      if (filter.reviewRequested) {
        prs = prs.filter(pr => pr.reviewers && pr.reviewers.includes(owner));
      }

      if (filter.titleContains) {
        const needle = filter.titleContains.toLowerCase();
        prs = prs.filter(pr => pr.title.toLowerCase().includes(needle));
      }

      prs.sort((a, b) => new Date(b.created) - new Date(a.created));
      resolve({ prs });
    });
  });
});

ipcMain.handle('save-review', async (event, review) => {
  const aiTag = (appConfig.aiTagPrefix || '@Hermes').toLowerCase();
  const aiComments = [];
  const prComments = [];
  for (const c of review.comments || []) {
    if (c.text.toLowerCase().startsWith(aiTag)) {
      aiComments.push(c);
    } else {
      prComments.push(c);
    }
  }

  for (const c of aiComments) {
    const level = c.level || 'line';
    let msg = '';
    if (level === 'file') {
      msg = `[File comment: ${c.file}]\n${c.text.replace(aiTag, '').trim()}`;
    } else {
      const side = c.side || 'RIGHT';
      const codeContext = c.codeContext || '';
      msg = `[${c.file} line ${c.line} (${side})]${codeContext ? '\n```' + codeContext + '```' : ''}\n${c.text.replace(aiTag, '').trim()}`;
    }
    sendAiMessage(msg);
  }

  const reviewToSave = { ...review, comments: prComments };
  const reviewDir = getReviewDir();
  fs.mkdirSync(reviewDir, { recursive: true });
  const filename = `review-${Date.now()}.json`;
  const outputPath = path.join(reviewDir, filename);
  fs.writeFileSync(outputPath, JSON.stringify(reviewToSave, null, 2));

  if (review.filePath) deleteDraft(review.filePath);

  const prNum = review.prNumber || cliPrNumber;
  const prCount = prComments.length;
  const aiCount = aiComments.length;
  let summary = `Review submitted for PR #${prNum || '?'}: ${review.type}`;
  if (prCount > 0) summary += ` with ${prCount} line comment${prCount !== 1 ? 's' : ''}`;
  if (aiCount > 0) summary += ` (${aiCount} sent to AI)`;
  sendAiMessage(summary);

  return outputPath;
});

ipcMain.handle('export-markdown', async (event, { markdown, defaultName }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(win, {
    title: 'Export Review as Markdown',
    defaultPath: defaultName || 'review.md',
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  });
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, markdown);
    return result.filePath;
  }
  return null;
});

ipcMain.handle('get-config', async () => ({
  chatId: aiChatId,
  prNumber: cliPrNumber,
  aiTagPrefix: appConfig.aiTagPrefix || '@Hermes',
  aiCommand: appConfig.aiCommand,
  prFilter: appConfig.prFilter || {},
  repoOwner: appConfig.repoOwner || '',
  repoName: appConfig.repoName || '',
  imageUploadEnabled: (appConfig.imageUpload || {}).enabled || false
}));
