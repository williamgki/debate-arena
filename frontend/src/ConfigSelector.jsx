import React from 'react';

// --- Updated Model Options ---
const modelOptions = {
  openai: [
    { value: 'gpt-4o-2024-08-06', label: 'OpenAI Normal (gpt-4o-2024-08-06)' },
    { value: 'o3-mini-2025-01-31', label: 'OpenAI Reasoning (o3-mini-2025-01-31)' },
    // Note: Added provider name to label for clarity
  ],
  google: [
    { value: 'gemini-2.5-pro-preview-03-25', label: 'Google Best (gemini-2.5-pro-preview-03-25)' },
    { value: 'gemini-2.0-flash-thinking-exp-1219', label: 'Google Reasoning (gemini-2.0-flash-thinking-exp-1219)' },
    { value: 'gemini-2.0-flash', label: 'Google Normal (gemini-2.0-flash)' },
  ],
  anthropic: [
    { value: 'claude-3-7-sonnet-20250219', label: 'Anthropic Best (claude-3-7-sonnet-20250219)' },
    { value: 'claude-3-5-haiku-20241022', label: 'Anthropic Normal (claude-3-5-haiku-20241022)' },
  ],
};
// --- End of Updated Model Options ---

function ConfigSelector({ debaterLabel, config, onChange, disabled }) {
  const handleProviderChange = (event) => {
    const newProvider = event.target.value;
    const defaultModel = modelOptions[newProvider]?.[0]?.value || '';
    onChange({ ...config, provider: newProvider, model_name: defaultModel });
  };

  const handleModelChange = (event) => {
    onChange({ ...config, model_name: event.target.value });
  };

  const handleObfuscateChange = (event) => {
    onChange({ ...config, obfuscate: event.target.checked });
  };

  const handleTemperatureChange = (event) => {
    const temp = Math.max(0, Math.min(2, parseFloat(event.target.value) || 0));
    onChange({ ...config, temperature: temp });
  };

  const handleMaxTokensChange = (event) => {
    const tokens = Math.max(10, parseInt(event.target.value) || 10);
    onChange({ ...config, max_tokens: tokens });
  };

  const currentModels = modelOptions[config.provider] || [];

  return (
    <div style={{ border: '1px solid #eee', padding: '15px', marginBottom: '10px', borderRadius: '5px' }}>
      <h3 style={{ marginTop: 0 }}>{debaterLabel} Configuration</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px', alignItems: 'center' }}>
        <label htmlFor={`${debaterLabel}-provider`}>Provider:</label>
        <select
          id={`${debaterLabel}-provider`}
          value={config.provider}
          onChange={handleProviderChange}
          disabled={disabled}
        >
          <option value="openai">OpenAI</option>
          <option value="google">Google</option>
          <option value="anthropic">Anthropic</option>
        </select>

        <label htmlFor={`${debaterLabel}-model`}>Model:</label>
        <select
          id={`${debaterLabel}-model`}
          value={config.model_name}
          onChange={handleModelChange}
          disabled={disabled || currentModels.length === 0}
        >
          {currentModels.map(model => (
            <option key={model.value} value={model.value}>{model.label}</option>
          ))}
          {currentModels.length === 0 && <option value="">Select Provider</option>}
        </select>

        <label htmlFor={`${debaterLabel}-temp`}>Temperature:</label>
        <input
          type="number"
          id={`${debaterLabel}-temp`}
          value={config.temperature}
          onChange={handleTemperatureChange}
          min="0" max="2" step="0.1"
          disabled={disabled}
          style={{width: '60px'}}
         />

         <label htmlFor={`${debaterLabel}-maxTokens`}>Max Tokens:</label>
         <input
           type="number"
           id={`${debaterLabel}-maxTokens`}
           value={config.max_tokens}
           onChange={handleMaxTokensChange}
           min="10" step="10"
           disabled={disabled}
           style={{width: '80px'}}
         />

        <label htmlFor={`${debaterLabel}-obfuscate`}>Obfuscate:</label>
        <input
          type="checkbox"
          id={`${debaterLabel}-obfuscate`}
          checked={config.obfuscate}
          onChange={handleObfuscateChange}
          disabled={disabled}
          style={{ justifySelf: 'start' }}
        />
      </div>
    </div>
  );
}

export default ConfigSelector;