import React from 'react';
import Home from './pages/Home';
import './App.css'; // ✅ Import your modern styles

const App: React.FC = () => {
  return (
    <div className="container">
      <div className="">
        <h1>VoiceScore</h1>
        <Home />
      </div>
    </div>
  );
};

export default App;
