import React from 'react';

type Props = {
  transcript: string;
};

function summarize(text: string): string {
  const words = text.split(/\s+/);
  const first = words.slice(0, 25).join(' ');
  return `Summary: ${first}${words.length > 25 ? ' ...' : ''}`;
}

const Summary: React.FC<Props> = ({ transcript }) => {
  return (
    <div className="card">
      <h2>Summary Only</h2>
      <div className="transcript-box">
        {summarize(transcript)}
      </div>
    </div>
  );
};

export default Summary;
