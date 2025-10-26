const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const isDevelopment = process.env.NODE_ENV !== 'production';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startUrl = isDevelopment
    ? 'http://localhost:5173' // Vite dev server in dev mode
    : `file://${path.join(__dirname, '../renderer/dist/index.html')}`; // built renderer in prod

  mainWindow.loadURL(startUrl);

  if (isDevelopment) {
    mainWindow.webContents.openDevTools();
  }
}

// Small helper for nicer debug sections in console
function logSection(title, obj) {
  console.log(`\n========== ${title} ==========\n`);
  console.log(obj);
  console.log('\n==============================\n');
}

// Strip ANSI color codes like \x1b[38;5;71m from Whisper output
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// IPC handler: renderer calls this when user clicks "Analyse"
ipcMain.handle('transcribe-audio', async (event, payload) => {
  try {
    console.log('IPC transcribe-audio called with payload keys:', Object.keys(payload || {}));

    const { audioData, mimeType } = payload || {};

    if (!audioData || !Array.isArray(audioData)) {
      console.error('No audioData array received from renderer');
      return { transcript: '(no audio data)' };
    }

    // 1. Convert Uint8Array -> Buffer
    const uint8 = new Uint8Array(audioData);
    const buffer = Buffer.from(uint8);

    // 2. Decide file extension based on mimetype
    let ext = '.webm';
    if (mimeType && mimeType.includes('wav')) {
      ext = '.wav';
    }
    if (mimeType && (mimeType.includes('mpeg') || mimeType.includes('mp3'))) {
      ext = '.mp3';
    }

    // 3. Save audio to electron/whisper so Whisper CLI can read it
    const whisperFolder = path.join(__dirname, 'whisper');
    const tmpPath = path.join(whisperFolder, `voicescore_input${ext}`);
    fs.writeFileSync(tmpPath, buffer);

    console.log('Saved audio blob to:', tmpPath, '(mimeType:', mimeType, ')');

    // 4. Figure out which whisper binary to run
    //
    // Windows build from CI will ship whisper-cli.exe
    // macOS build from CI will ship whisper-cli (no .exe)
    const whisperBinWin = path.join(whisperFolder, 'whisper-cli.exe');
    const whisperBinUnix = path.join(whisperFolder, 'whisper-cli');

    let whisperBin = whisperBinUnix;
    if (process.platform === 'win32') {
      whisperBin = whisperBinWin;
    }

    // 5. Model path (we download ggml-base.en.bin into whisper/ in CI)
    const modelPath = path.join(whisperFolder, 'ggml-base.en.bin');

    const pathsCheck = {
      platform: process.platform,
      whisperFolder,
      whisperBin,
      whisperBinExists: fs.existsSync(whisperBin),
      modelPath,
      modelExists: fs.existsSync(modelPath),
      tmpPath,
      tmpExists: fs.existsSync(tmpPath),
    };

    logSection('PATH CHECK', pathsCheck);

    if (!pathsCheck.whisperBinExists) {
      console.error('No whisper-cli binary found for this platform at', whisperBin);
      return { transcript: '(no whisper-cli available in build)' };
    }

    if (!pathsCheck.modelExists) {
      console.error('Model file missing at', modelPath);
      return { transcript: '(model not found)' };
    }

    if (!pathsCheck.tmpExists) {
      console.error('Temp audio file not written at', tmpPath);
      return { transcript: '(temp audio not written)' };
    }

    // 6. Spawn whisper-cli / whisper-cli.exe
    const transcript = await new Promise((resolve, reject) => {
      const args = [
        '--model', modelPath,
        '--file', tmpPath,
        '--language', 'en',
        '--print-colors', 'false',
        '--print-progress', 'false',
      ];

      console.log('Spawning whisper with args:', args);

      // cwd is whisperFolder so the binary finds its DLLs / libs
      const child = spawn(
        whisperBin,
        args,
        {
          cwd: whisperFolder,
        }
      );

      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        stdoutData += text;
        console.log('[whisper stdout]', text);
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderrData += text;
        console.error('[whisper stderr]', text);
      });

      child.on('close', (code) => {
        console.log('Whisper exited with code:', code);

        if (code !== 0) {
          console.error('Whisper failed with code:', code);
          console.error('Full stderr:\n', stderrData);
          console.error('Full stdout:\n', stdoutData);
          reject(new Error('Whisper failed'));
          return;
        }

        // 7. Clean the output to get just the spoken text
        //
        // Typical stdout contains lines like:
        // [00:00:00.000 --> 00:00:07.000]   This is a test recording with numbers 3, 7, 10, 50.
        // plus timing info and ANSI color codes.
        //
        // We'll:
        //   - strip ANSI color codes
        //   - split into lines, trim
        //   - from lines starting with `[` extract text after the `]`
        //   - ignore timing / diagnostic lines
        //   - join spoken text back into one sentence

        let cleanedOut = stripAnsi(stdoutData);

        const lines = cleanedOut
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

        const spokenPieces = lines.map((line) => {
          // Timestamped speech lines:
          // [00:00:00.000 --> 00:00:07.000]   This is a test...
          if (line.startsWith('[')) {
            const idx = line.indexOf(']');
            if (idx !== -1) {
              return line.slice(idx + 1).trim();
            }
          }

          // Ignore internal chatter lines
          if (
            line.startsWith('whisper_') ||
            line.startsWith('system_info:') ||
            line.startsWith('main: processing') ||
            line.toLowerCase().includes('whisper_print_timings') ||
            line.toLowerCase().includes('load time =') ||
            line.toLowerCase().includes('total time =') ||
            line.toLowerCase().includes('fallbacks =') ||
            line.toLowerCase().includes('encode time =') ||
            line.toLowerCase().includes('decode time =') ||
            line === '>>'
          ) {
            return '';
          }

          // Otherwise keep the line
          return line;
        });

        const finalTranscript = spokenPieces
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        console.log('Final transcript to renderer:', finalTranscript);

        resolve(finalTranscript || '(no speech detected)');
      });
    });

    // 8. Send cleaned transcript back to renderer
    return { transcript };

  } catch (err) {
    console.error('transcription failed', err);
    return { transcript: '(error getting transcript)' };
  }
});

// Standard Electron lifecycle
app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', () => {
  // On macOS apps often stay open until Cmd+Q.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // Re-open window on macOS when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
