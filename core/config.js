require('dotenv').config()
const path = require('path')
const root = path.resolve(__dirname, '..')

const configuredPrefixes = (process.env.BOT_PREFIXES || 'fiora,fv,.')
  .split(',')
  .map(x => x.trim().toLowerCase())
  .filter(Boolean)

module.exports = {
  root,
  botName: process.env.BOT_NAME || 'Fiora',
  // Keep the old singular prefix setting for compatibility, while allowing
  // multiple natural trigger prefixes. Edit BOT_PREFIXES in .env later.
  prefix: (process.env.BOT_PREFIX || 'fiora').toLowerCase(),
  prefixes: [...new Set(configuredPrefixes)],
  ownerNumber: (process.env.OWNER_NUMBER || '').replace(/\D/g, ''),
  ownerJid: process.env.OWNER_JID || '',
  pairingNumber: (process.env.PAIRING_NUMBER || process.env.OWNER_NUMBER || '').replace(/\D/g, ''),
  adminPort: Number(process.env.ADMIN_PORT || 3000),
  adminPassword: process.env.ADMIN_PANEL_PASSWORD || 'change-me',
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  groqKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  paths: {
    db: path.join(root, 'database'),
    users: path.join(root, 'database', 'users.json'),
    conversations: path.join(root, 'database', 'conversations'),
    tasks: path.join(root, 'database', 'tasks.json'),
    images: path.join(root, 'database', 'images.json'),
    settings: path.join(root, 'database', 'settings.json'),
    gallery: path.join(root, 'media', 'gallery'),
    self: path.join(root, 'media', 'self'),
    restricted: path.join(root, 'media', 'restricted'),
    generated: path.join(root, 'generated'),
    session: path.join(root, 'session')
  }
}
