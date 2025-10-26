export type AudioTranscription = {
  id: string;
  text: string;
  confidence: number;
  timestamp: number;
};

export interface AudioService {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<AudioTranscription>;
  playAudio: (audioUrl: string) => Promise<void>;
}

export interface StorageService {
  saveTranscription: (transcription: AudioTranscription) => Promise<void>;
  getTranscriptions: () => Promise<AudioTranscription[]>;
}