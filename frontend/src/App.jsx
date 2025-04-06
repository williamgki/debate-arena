import React, { useState, useCallback } from 'react';
import axios from 'axios';
import PromptInput from './PromptInput';
import ArgumentDisplay from './ArgumentDisplay';
import ConfigSelector from './ConfigSelector';
import './App.css';

const BACKEND_URL = 'https://debate-arena-production.up.railway.app';

function App() {
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [debateHistory, setDebateHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userJudgment, setUserJudgment] = useState(null);
  const [roundNumber, setRoundNumber] = useState(0);

  // --- Update Default State for Debater Configurations ---
  const [configA, setConfigA] = useState({
    provider: 'openai',
    model_name: 'gpt-4o-2024-08-06', // <-- Updated default model
    temperature: 0.7,
    max_tokens: 300,
    obfuscate: false
  });
  const [configB, setConfigB] = useState({
    provider: 'openai',
    model_name: 'gpt-4o-2024-08-06', // <-- Updated default model
    temperature: 0.75,
    max_tokens: 300,
    obfuscate: false
  });
  // --- End of Update ---

  const handleConfigAChange = useCallback((newConfig) => {
    setConfigA(newConfig);
  }, []);

  const handleConfigBChange = useCallback((newConfig) => {
    setConfigB(newConfig);
  }, []);

  // --- Handle INITIAL prompt submission (no change needed here) ---
  const handlePromptSubmit = async (promptText) => {
    if (debateHistory.length > 0 || isLoading) return;
    setIsLoading(true);
    setError(null);
    setDebateHistory([]);
    setUserJudgment(null);
    setOriginalPrompt(promptText);
    setRoundNumber(1);
    try {
      const response = await axios.post(`${BACKEND_URL}/generate_first_arguments/`, {
        prompt: promptText,
        config_a: configA,
        config_b: configB
      });
      const initialHistory = [
         { speaker: 'System', text: `Debate started on prompt: "${promptText}"\nConfig A: ${configA.provider}/${configA.model_name}, Obfuscate: ${configA.obfuscate}\nConfig B: ${configB.provider}/${configB.model_name}, Obfuscate: ${configB.obfuscate}` },
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

  // --- Handle judgment AND trigger the next round (no change needed here) ---
  const handleJudgment = async (judgment) => {
    setUserJudgment(judgment);
    setIsLoading(true);
    setError(null);
    const currentHistory = [ ...debateHistory ];
    try {
      const debateContext = {
        original_prompt: originalPrompt,
        history: currentHistory,
        user_judgment: judgment,
        config_a: configA,
        config_b: configB
      };
      const response = await axios.post(`${BACKEND_URL}/next_round/`, debateContext);
      const nextHistory = [
        ...currentHistory,
        { speaker: 'Debater A', text: response.data.argument_a },
        { speaker: 'Debater B', text: response.data.argument_b },
      ];
      setDebateHistory(nextHistory);
      setUserJudgment(null);
      setRoundNumber(prev => prev + 1);
    } catch (err) {
      console.error("Error fetching next round arguments:", err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch next round arguments.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Helper to get latest arguments (no change needed) ---
   const getLatestArguments = () => { /* ... same as before ... */
    const lastA = debateHistory.slice().reverse().find(turn => turn.speaker === 'Debater A');
    const lastB = debateHistory.slice().reverse().find(turn => turn.speaker === 'Debater B');
    return { argumentA: lastA ? lastA.text : '', argumentB: lastB ? lastB.text : '' };
   };

  const latestArgs = getLatestArguments();
  const debateStarted = debateHistory.length > 0;

  return (
    // --- JSX Return Block (no structural change needed, just uses updated state/handlers) ---
     <div className="App" style={{ maxWidth: '1000px', margin: '20px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Debate Arena (Round {roundNumber})</h1>
      {!debateStarted && (
          <div style={{border: '1px solid #ddd', padding: '20px', marginBottom: '20px', borderRadius: '5px'}}>
             <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                      <ConfigSelector debaterLabel="Debater A" config={configA} onChange={handleConfigAChange} disabled={isLoading || debateStarted} />
                  </div>
                  <div style={{ flex: 1 }}>
                      <ConfigSelector debaterLabel="Debater B" config={configB} onChange={handleConfigBChange} disabled={isLoading || debateStarted} />
                  </div>
              </div>
              <PromptInput onSubmit={handlePromptSubmit} isLoading={isLoading} />
          </div>
      )}
      {error && <p style={{ color: 'red', marginTop: '10px' }}>Error: {error}</p>}
      {debateStarted && ( <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}> <div style={{ flex: 1 }}> <h2>Debater A</h2> <ArgumentDisplay argument={latestArgs.argumentA} /> </div> <div style={{ flex: 1 }}> <h2>Debater B</h2> <ArgumentDisplay argument={latestArgs.argumentB} /> </div> </div> )}
      {latestArgs.argumentA && latestArgs.argumentB && !isLoading && !error && !userJudgment && debateStarted && ( <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px', textAlign: 'center' }}> <h3>Which argument is better for this round?</h3> <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}> <button onClick={() => handleJudgment('A_is_better')} style={buttonStyle}>A is Better</button> <button onClick={() => handleJudgment('B_is_better')} style={buttonStyle}>B is Better</button> <button onClick={() => handleJudgment('Tie')} style={buttonStyle}>Tie</button> <button onClick={() => handleJudgment('Both_bad')} style={buttonStyle}>Both are Bad</button> </div> </div> )}
      {isLoading && userJudgment && <p style={{textAlign: 'center', marginTop: '20px'}}>Generating next round...</p>}
      {userJudgment && !isLoading && ( <div style={{ marginTop: '20px', textAlign: 'center', fontWeight: 'bold' }}> <p>Your judgment: {userJudgment.replace('_', ' ')}</p> </div> )}
      {debateStarted && ( <div style={{marginTop: '40px', borderTop: '2px solid black', paddingTop: '20px'}}> <h2>Full Debate History</h2> {debateHistory.map((turn, index) => ( <div key={index} style={{marginBottom: '15px', padding: '10px', border: '1px dashed #eee'}}> <strong>{turn.speaker}:</strong> <p style={{whiteSpace: 'pre-wrap', margin: '5px 0 0 0'}}>{turn.text}</p> </div> ))} </div> )}
    </div>
  );
}

const buttonStyle = {
  padding: '10px 15px',
  fontSize: '1rem',
  cursor: 'pointer',
  border: '1px solid #ccc',
  borderRadius: '4px'
};

export default App;