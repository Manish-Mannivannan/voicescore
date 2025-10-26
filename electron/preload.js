const { contextBridge, ipcRenderer } = require('electron');

// We'll send the recorded audio blob (as ArrayBuffer) + its mimeType
contextBridge.exposeInMainWorld('voicescoreAPI', {
  transcribeAudio: async (blobArrayBuffer, mimeType) => {
    const result = await ipcRenderer.invoke('transcribe-audio', {
      audioData: Array.from(new Uint8Array(blobArrayBuffer)), // serialize to normal array so IPC can carry it
      mimeType
    });
    return result; // { transcript: string }
  }
});
