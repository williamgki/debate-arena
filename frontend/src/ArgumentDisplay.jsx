import React from 'react';

function ArgumentDisplay({ argument }) {
  return (
    <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '15px', minHeight: '100px', backgroundColor: '#f9f9f9' }}>
      <h2>Generated Argument:</h2>
      {argument ? (
        <p style={{ whiteSpace: 'pre-wrap' }}>{argument}</p> // pre-wrap preserves whitespace/newlines
      ) : (
        <p><i>Submit a prompt to see the AI's argument here...</i></p>
      )}
    </div>
  );
}

export default ArgumentDisplay;