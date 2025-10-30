import React, { useState, useRef } from "react";

declare global {
  interface Window {
    voicescoreAPI: {
      transcribeAudio: (
        audio: ArrayBuffer
      ) => Promise<{ transcript: string } | null>;
    };
  }
}

type Props = {
  onTranscriptReady: (t: string) => void;
};

const AudioRecorder: React.FC<Props> = ({ onTranscriptReady }) => {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    const localChunks: BlobPart[] = [];

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) {
        localChunks.push(e.data);
      }
    };

    mr.onstop = () => {
      const blob = new Blob(localChunks, { type: "audio/webm" });
      setAudioBlob(blob);
    };

    mr.start();
    setMediaRecorder(mr);
  }

  function stopRecording() {
    mediaRecorder?.stop();
    setMediaRecorder(null);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAudioBlob(file);
    }
  }

  async function handleAnalyse() {
    if (!audioBlob) {
      alert("Please record or upload an audio file first.");
      return;
    }
    // 1. Convert Blob to an ArrayBuffer. This is a browser-native operation.
    const arrayBuffer = await audioBlob.arrayBuffer();

    // 2. Send the ArrayBuffer directly. The main process will convert it to a Node.js Buffer.
    const result = await window.voicescoreAPI.transcribeAudio(arrayBuffer);
    const transcript = result?.transcript ?? "(no transcript returned)";
    onTranscriptReady(transcript);
  }

  return (
    <div className="card">
      <h2>Input Audio</h2>

      <div className="row">
        {mediaRecorder ? (
          <button onClick={stopRecording}>Stop ⏹</button>
        ) : (
          <button onClick={startRecording}>Record ⏺</button>
        )}

        <button onClick={() => fileInputRef.current?.click()}>
          Upload MP3/WAV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
      </div>

      {audioBlob && (
        <audio
          controls
          src={URL.createObjectURL(audioBlob)}
          style={{ marginTop: "1rem", width: "100%" }}
        />
      )}

      <div style={{ marginTop: "1rem" }}>
        <button onClick={handleAnalyse}>Analyse</button>
      </div>
    </div>
  );
};

export default AudioRecorder;
