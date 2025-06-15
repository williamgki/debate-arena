// Environment setup for tests
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'sk-test-key-for-testing-only';
process.env.DEBATE_STORAGE_PATH = './tests/data/debates';

// Create test data directory if it doesn't exist
const fs = require('fs');
const path = require('path');

const testDataDir = path.join(process.cwd(), 'tests', 'data', 'debates');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}