import React, { useState, useRef } from "react";

type Props = {
  onTranscriptReady: (t: string) => void;
};

const AudioRecorder: React.FC<Props> = ({ onTranscriptReady }) => {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [chunks, setChunks] = useState<BlobPart[]>([]);
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
      setChunks([]);
    };

    mr.start();
    setMediaRecorder(mr);
    setChunks(localChunks);
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
      console.warn("No audio to analyse");
      return;
    }

    // @ts-ignore - voicescoreAPI is injected by preload.js
    const result = await window.voicescoreAPI.transcribeAudio(
      await audioBlob.arrayBuffer(),
      audioBlob.type || "audio/webm"
    );

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
