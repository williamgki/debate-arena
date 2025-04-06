import React, { useState } from 'react';
import axios from 'axios';
import PromptInput from './PromptInput';
// We'll reuse ArgumentDisplay for each turn's text
import ArgumentDisplay from './ArgumentDisplay';
import './App.css';

// Define the structure for a debate turn (matches Pydantic model)
// interface DebateTurn {
//   speaker: string; // "Debater A", "Debater B", "System", "Judge"
//   text: string;
// }

function App() {
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [debateHistory, setDebateHistory] = useState([]); // <-- State for history (array of DebateTurn objects)
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userJudgment, setUserJudgment] = useState(null);
  const [roundNumber, setRoundNumber] = useState(0);

  // Function to handle the INITIAL prompt submission
  const handlePromptSubmit = async (promptText) => {
    setIsLoading(true);
    setError(null);
    setDebateHistory([]); // Clear history
    setUserJudgment(null);
    setOriginalPrompt(promptText); // Store the original prompt
    setRoundNumber(1); // Start at round 1

    try {
      // Call the endpoint for the FIRST round
      const response = await axios.post('http://127.0.0.1:8000/generate_first_arguments/', {
        prompt: promptText,
      });

      // Initialize history with the first arguments
      const initialHistory = [
        { speaker: 'System', text: `Debate started on prompt: "${promptText}"` }, // Optional system message
        { speaker: 'Debater A', text: response.data.argument_a },
        { speaker: 'Debater B', text: response.data.argument_b },
      ];
      setDebateHistory(initialHistory);

    } catch (err) {
      console.error("Error fetching first arguments:", err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch first arguments.');
      setRoundNumber(0); // Reset round if initial fetch fails
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle the judgment AND trigger the next round
  const handleJudgment = async (judgment) => {
    setUserJudgment(judgment); // Record judgment locally first
    setIsLoading(true);
    setError(null);

    const currentHistory = [
        ...debateHistory,
        // Optionally add the judgment itself to the history sent to backend
        // { speaker: 'Judge', text: `Judged: ${judgment.replace('_', ' ')}` }
    ];

    try {
      // Prepare context for the backend
      const debateContext = {
        original_prompt: originalPrompt,
        history: currentHistory, // Send the history up to this point
        user_judgment: judgment // Send the latest judgment
      };

      // Call the endpoint for the NEXT round
      const response = await axios.post('http://127.0.0.1:8000/next_round/', debateContext);

      // Append new arguments to history
      const nextHistory = [
        ...currentHistory, // Keep previous turns
        // You might want a "Judge" turn added here if not above
        { speaker: 'Debater A', text: response.data.argument_a },
        { speaker: 'Debater B', text: response.data.argument_b },
      ];
      setDebateHistory(nextHistory);
      setUserJudgment(null); // Reset judgment UI for the new round
      setRoundNumber(prev => prev + 1); // Increment round number

    } catch (err) {
      console.error("Error fetching next round arguments:", err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch next round arguments.');
      // Keep userJudgment set so they don't get stuck trying again if backend fails
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
    <div className="App" style={{ maxWidth: '1000px', margin: '20px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Debate Arena (Round {roundNumber})</h1>
      {/* Show prompt input only if debate hasn't started */}
      {debateHistory.length === 0 && (
          <PromptInput onSubmit={handlePromptSubmit} isLoading={isLoading} />
      )}

      {error && <p style={{ color: 'red', marginTop: '10px' }}>Error: {error}</p>}

      {/* --- Debate Display --- */}
      {/* Render the latest arguments side-by-side */}
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
      {/* Show buttons only if arguments are present for the current round AND not currently loading/error */}
      {latestArgs.argumentA && latestArgs.argumentB && !isLoading && !error && (
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
      {/* You might want to hide this behind a toggle later */}
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