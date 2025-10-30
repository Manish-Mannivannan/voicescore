const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('voicescoreAPI', {
  transcribeAudio: async (audioBuffer) => {
    const result = await ipcRenderer.invoke('transcribe-audio', audioBuffer);
    return result;
  }
});
