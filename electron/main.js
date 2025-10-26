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
      nodeIntegration: false
    }
  });

  const startUrl = isDevelopment
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../renderer/dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDevelopment) {
    mainWindow.webContents.openDevTools();
  }
}

// tiny helper for clean logging sections
function logSection(title, obj) {
  console.log(`\n========== ${title} ==========\n`);
  console.log(obj);
  console.log('\n==============================\n');
}

ipcMain.handle('transcribe-audio', async (event, payload) => {
  try {
    console.log('IPC transcribe-audio called with payload keys:', Object.keys(payload || {}));

    const { audioData, mimeType } = payload || {};

    if (!audioData || !Array.isArray(audioData)) {
      console.error('No audioData array received from renderer');
      return { transcript: '(no audio data)' };
    }

    // helper: remove ANSI color codes like \x1b[38;5;71m
    function stripAnsi(str) {
      // matches ESC[...]m
      return str.replace(/\x1b\[[0-9;]*m/g, '');
    }

    // 1. rebuild Buffer from Uint8Array
    const uint8 = new Uint8Array(audioData);
    const buffer = Buffer.from(uint8);

    // 2. pick extension
    let ext = '.webm';
    if (mimeType && mimeType.includes('wav')) ext = '.wav';
    if (mimeType && (mimeType.includes('mpeg') || mimeType.includes('mp3'))) ext = '.mp3';

    // 3. write audio file into whisper folder
    const whisperFolder = path.join(__dirname, 'whisper');
    const tmpPath = path.join(whisperFolder, `voicescore_input${ext}`);
    fs.writeFileSync(tmpPath, buffer);

    console.log('Saved audio blob to:', tmpPath, '(mimeType:', mimeType, ')');

    // 4. binary + model
    const whisperBin = path.join(whisperFolder, 'whisper-cli.exe'); // we know this works
    const modelPath = path.join(whisperFolder, 'ggml-base.en.bin');

    const whisperBinExists = fs.existsSync(whisperBin);
    const modelExists = fs.existsSync(modelPath);
    const tmpExists = fs.existsSync(tmpPath);

    logSection('PATH CHECK', {
      __dirname,
      whisperFolder,
      whisperBin,
      whisperBinExists,
      modelPath,
      modelExists,
      tmpPath,
      tmpExists
    });

    if (!whisperBinExists) {
      console.error('whisper-cli.exe not found at', whisperBin);
      return { transcript: '(whisper-cli.exe not found)' };
    }
    if (!modelExists) {
      console.error('Model file missing at', modelPath);
      return { transcript: '(model not found)' };
    }
    if (!tmpExists) {
      console.error('Temp audio file not written at', tmpPath);
      return { transcript: '(temp audio not written)' };
    }

    // 5. spawn whisper-cli and collect output
    const transcript = await new Promise((resolve, reject) => {
      const args = [
        '--model', modelPath,
        '--file', tmpPath,
        '--language', 'en',
        '--print-colors', 'false',    // NOTE: some builds still color anyway
        '--print-progress', 'false'
      ];

      console.log('Spawning whisper-cli.exe with args:', args);

      const child = spawn(
        whisperBin,
        args,
        {
          cwd: whisperFolder
        }
      );

      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', chunk => {
        const text = chunk.toString();
        stdoutData += text;
        console.log('[whisper stdout]', text);
      });

      child.stderr.on('data', chunk => {
        const text = chunk.toString();
        stderrData += text;
        console.error('[whisper stderr]', text);
      });

      child.on('close', code => {
        console.log('Whisper exited with code:', code);

        if (code === 0) {
          // 1. strip ANSI colors from all stdout
          let cleanedOut = stripAnsi(stdoutData);

          // 2. break into lines
          const lines = cleanedOut
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);

          // 3. pull only spoken content
          const spokenPieces = lines.map(line => {
            // timestamp lines look like:
            // [00:00:00.000 --> 00:00:07.000]   This is a test...
            if (line.startsWith('[')) {
              const idx = line.indexOf(']');
              if (idx !== -1) {
                // everything after ']'
                return line.slice(idx + 1).trim();
              }
            }

            // ignore system chatter:
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

            // otherwise keep line
            return line;
          });

          // 4. collapse into single string
          const finalTranscript = spokenPieces
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          console.log('Final transcript to renderer:', finalTranscript);

          resolve(finalTranscript || '(no speech detected)');
        } else {
          console.error('Whisper failed with code:', code);
          console.error('Full stderr:\n', stderrData);
          console.error('Full stdout:\n', stdoutData);
          reject(new Error('Whisper failed'));
        }
      });
    });

    return { transcript };

  } catch (err) {
    console.error('transcription failed', err);
    return { transcript: '(error getting transcript)' };
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
