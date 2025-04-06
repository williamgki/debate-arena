import React, { useState } from 'react';
import axios from 'axios';
import PromptInput from './PromptInput';
import ArgumentDisplay from './ArgumentDisplay';
import './App.css';

// Define the structure for a debate turn (matches Pydantic model)
// interface DebateTurn {
//   speaker: string; // "Debater A", "Debater B", "System", "Judge"
//   text: string;
// }

// --- Define Backend Base URL ---
// Use your deployed Railway URL here
const BACKEND_URL = 'https://debate-arena-production.up.railway.app';


function App() {
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [debateHistory, setDebateHistory] = useState([]); // State for history
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userJudgment, setUserJudgment] = useState(null);
  const [roundNumber, setRoundNumber] = useState(0);

  // Function to handle the INITIAL prompt submission
  const handlePromptSubmit = async (promptText) => {
    setIsLoading(true);
    setError(null);
    setDebateHistory([]);
    setUserJudgment(null);
    setOriginalPrompt(promptText);
    setRoundNumber(1);

    try {
      // Use the deployed backend URL
      const response = await axios.post(`${BACKEND_URL}/generate_first_arguments/`, {
        prompt: promptText,
      });

      const initialHistory = [
        { speaker: 'System', text: `Debate started on prompt: "${promptText}"` },
        { speaker: 'Debater A', text: response.data.argument_a },
        { speaker: 'Debater B', text: response.data.argument_b },
      ];
      setDebateHistory(initialHistory);

    } catch (err) {
      console.error("Error fetching first arguments:", err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch first arguments.');
      setRoundNumber(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle the judgment AND trigger the next round
  const handleJudgment = async (judgment) => {
    setUserJudgment(judgment);
    setIsLoading(true);
    setError(null);

    const currentHistory = [ ...debateHistory ];
    // Optionally add judge's turn to history before sending
    // currentHistory.push({ speaker: 'Judge', text: `Judged: ${judgment.replace('_', ' ')}` });

    try {
      const debateContext = {
        original_prompt: originalPrompt,
        history: currentHistory,
        user_judgment: judgment
      };

      // Use the deployed backend URL
      const response = await axios.post(`${BACKEND_URL}/next_round/`, debateContext);

      const nextHistory = [
        ...currentHistory, // Keep previous turns
        // Add judge's turn here if you want it displayed in history
        // { speaker: 'Judge', text: `Judged: ${judgment.replace('_', ' ')}` },
        { speaker: 'Debater A', text: response.data.argument_a },
        { speaker: 'Debater B', text: response.data.argument_b },
      ];
      setDebateHistory(nextHistory);
      setUserJudgment(null); // Reset judgment UI for the new round
      setRoundNumber(prev => prev + 1);

    } catch (err) {
      console.error("Error fetching next round arguments:", err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch next round arguments.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get the latest arguments for display
  const getLatestArguments = () => {
    const lastA = debateHistory.slice().reverse().find(turn => turn.speaker === 'Debater A');
    const lastB = debateHistory.slice().reverse().find(turn => turn.speaker === 'Debater B');
    return {
        argumentA: lastA ? lastA.text : '',
        argumentB: lastB ? lastB.text : ''
    };
  };

  const latestArgs = getLatestArguments();

  return (
    // Keep the JSX return block exactly the same as the previous version
    // It renders the PromptInput, latest arguments, judging buttons,
    // loading state, errors, and the full history display.
     <div className="App" style={{ maxWidth: '1000px', margin: '20px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Debate Arena (Round {roundNumber})</h1>
      {debateHistory.length === 0 && (
          <PromptInput onSubmit={handlePromptSubmit} isLoading={isLoading} />
      )}

      {error && <p style={{ color: 'red', marginTop: '10px' }}>Error: {error}</p>}

      {debateHistory.length > 0 && (
         <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
           <div style={{ flex: 1 }}>
             <h2>Debater A</h2>
             <ArgumentDisplay argument={latestArgs.argumentA} />
           </div>
           <div style={{ flex: 1 }}>
             <h2>Debater B</h2>
             <ArgumentDisplay argument={latestArgs.argumentB} />
           </div>
         </div>
      )}

      {/* --- Judging Section --- */}
      {latestArgs.argumentA && latestArgs.argumentB && !isLoading && !error && !userJudgment && ( // Only show if no judgment *for this round* is made
        <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px', textAlign: 'center' }}>
          <h3>Which argument is better for this round?</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => handleJudgment('A_is_better')} style={buttonStyle}>A is Better</button>
            <button onClick={() => handleJudgment('B_is_better')} style={buttonStyle}>B is Better</button>
            <button onClick={() => handleJudgment('Tie')} style={buttonStyle}>Tie</button>
            <button onClick={() => handleJudgment('Both_bad')} style={buttonStyle}>Both are Bad</button>
          </div>
        </div>
      )}

       {/* Loading indicator for next round */}
       {isLoading && userJudgment && <p style={{textAlign: 'center', marginTop: '20px'}}>Generating next round...</p>}


      {/* --- Full History (Optional Display) --- */}
      <div style={{marginTop: '40px', borderTop: '2px solid black', paddingTop: '20px'}}>
          <h2>Full Debate History</h2>
          {debateHistory.map((turn, index) => (
              <div key={index} style={{marginBottom: '15px', padding: '10px', border: '1px dashed #eee'}}>
                  <strong>{turn.speaker}:</strong>
                  <p style={{whiteSpace: 'pre-wrap', margin: '5px 0 0 0'}}>{turn.text}</p>
              </div>
          ))}
      </div>

    </div>
  );
}

// Basic styling for buttons
const buttonStyle = {
  padding: '10px 15px',
  fontSize: '1rem',
  cursor: 'pointer',
  border: '1px solid #ccc',
  borderRadius: '4px'
};

export default App;