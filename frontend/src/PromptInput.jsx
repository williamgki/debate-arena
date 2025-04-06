import React, { useState } from 'react';

// Pass the onSubmit function as a prop
function PromptInput({ onSubmit, isLoading }) {
  const [promptText, setPromptText] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault(); // Prevent default form submission
    if (!promptText.trim()) return; // Don't submit empty prompts
    onSubmit(promptText); // Call the function passed from App.jsx
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <label htmlFor="prompt-input" style={{ fontWeight: 'bold' }}>Enter Debate Prompt:</label>
      <textarea
        id="prompt-input"
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
        placeholder="e.g., Should AI development be paused?"
        rows={4}
        style={{ padding: '10px', fontSize: '1rem', border: '1px solid #ccc' }}
        disabled={isLoading} // Disable input while loading
      />
      <button
        type="submit"
        style={{ padding: '10px 15px', fontSize: '1rem', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        disabled={isLoading} // Disable button while loading
      >
        {isLoading ? 'Generating...' : 'Generate Argument'}
      </button>
    </form>
  );
}

export default PromptInput;