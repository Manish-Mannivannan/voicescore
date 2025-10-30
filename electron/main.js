const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

function getWhisperExe() {
  const exe = process.platform === "win32" ? "whisper-cli.exe" : "whisper-cli";
  // In dev, your files live next to main.js; in prod, inside process.resourcesPath/whisper
  const base = app.isPackaged
    ? path.join(process.resourcesPath, "whisper")   // <-- from extraResources.to
    : path.join(__dirname, "whisper");              // <-- electron/whisper during dev
  return path.join(base, exe);
}


function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  if (!app.isPackaged) {
    // Dev: Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Prod: load built index.html from renderer/dist
    const indexPath = path.join(__dirname, '../renderer/dist/index.html');
    mainWindow.loadFile(indexPath);

    // optional while debugging prod build:
    mainWindow.webContents.openDevTools();
  }
}

// ------ whisper stuff unchanged ------
function getWhisperPath() {
  const exeName = process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli';
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'whisper', exeName);
  }
  return path.join(__dirname, 'whisper', exeName);
}

ipcMain.handle('transcribe-audio', async (event, arrayBuffer) => {
  const whisperPath = getWhisperPath();
  const tempFilePath = path.join(os.tmpdir(), `voicescore-audio-${Date.now()}.wav`);
  const audioBuffer = Buffer.from(arrayBuffer);

  try {
    fs.writeFileSync(tempFilePath, audioBuffer);

    if (!fs.existsSync(whisperPath)) {
      console.error('Whisper CLI not found at:', whisperPath);
      return {
        transcript:
          'Whisper CLI not found. Using fallback: Hello this is a sample recording with number seven and nineteen and 2025 deadline thank you',
      };
    }

    const modelPath = path.join(path.dirname(whisperPath), 'ggml-base.en.bin');
    const args = ['-m', modelPath, '-f', tempFilePath];

    if (!fs.existsSync(modelPath)) {
      console.error('Whisper model not found at:', modelPath);
      return {
        transcript:
          'Whisper model file not found. Please add it to the electron/whisper directory.',
      };
    }

    const child = spawn(whisperPath, args, { windowsHide: true });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    const exitCode = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', resolve);
    });

    if (exitCode !== 0) {
      throw new Error(`whisper-cli exited with code ${exitCode}: ${stderr}`);
    }

    const transcriptText =
      stdout.trim() ||
      stderr.split('] ')[1]?.trim() ||
      'Transcription produced no parsable output.';
    return { transcript: transcriptText };
  } catch (err) {
    console.error('transcribe-audio error:', err);
    return {
      transcript: `Transcription failed: ${err.message}. Using fallback.`,
    };
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
});

app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
