const { v4: uuidv4 } = require('uuid');

function generateUID() {
  return uuidv4();
}

function safeJSONParse(str, fallback = {}) {
  try { return JSON.parse(str); } catch { return fallback; }
}

module.exports = { generateUID, safeJSONParse };
