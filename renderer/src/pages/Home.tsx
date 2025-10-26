import React, { useState } from 'react';
import { AudioRecorder, AnalysisPanel, Transcript } from '../components';

const Home: React.FC = () => {
  const [transcript, setTranscript] = useState("");

  return (
    <div className="layout">
      <AudioRecorder onTranscriptReady={setTranscript} />
      <AnalysisPanel transcript={transcript} />
      <Transcript transcript={transcript} />
    </div>
  );
};

export default Home;
