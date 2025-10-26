import React, { useState } from 'react';

type Props = {
  transcript: string;
};

function summarize(text: string): string {
  const words = text.split(/\s+/);
  const first = words.slice(0, 25).join(' ');
  return `Summary: ${first}${words.length > 25 ? ' ...' : ''}`;
}

const Transcript: React.FC<Props> = ({ transcript }) => {
  const [mode, setMode] = useState<'transcript' | 'summary'>('transcript');

  return (
    <div className="card">
      <h2>Transcript / Summary</h2>
      <div className="row">
        <button
          onClick={() => setMode('transcript')}
          disabled={mode === 'transcript'}
        >
          Transcript
        </button>

        <button
          onClick={() => setMode('summary')}
          disabled={mode === 'summary'}
          style={{ marginLeft: '0.5rem' }}
        >
          Summary
        </button>
      </div>

      <div className="transcript-box">
        {mode === 'transcript'
          ? transcript || '(no transcript yet)'
          : summarize(transcript)}
      </div>
    </div>
  );
};

export default Transcript;
