const { handleFiora } = require('../fiora');
const { isOwner } = require('./permissions');
const { addTask } = require('./scheduler');
const { users, saveUsers } = require('./store');
const { openMainMenu } = require('./menu');
const { prefixes } = require('./config');

function textOf(msg) {
  const m = msg.message || {};
  return m.conversation ||
    m.extendedTextMessage?.text ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.templateButtonReplyMessage?.selectedId || '';
}

function jidNumber(jid) {
  return (jid || '').split('@')[0].replace(/\D/g, '');
}

function stripFioraPrefix(text) {
  const value = String(text || '').trim();
  const lower = value.toLowerCase();
  const ordered = [...prefixes].sort((a, b) => b.length - a.length);

  for (const prefix of ordered) {
    if (prefix === '.') {
      if (value.startsWith('.')) return value.slice(1).trim();
      continue;
    }
    const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')}(?:\\s+|[,!:;\\-]+|$)`, 'i');
    if (pattern.test(value)) return value.slice(value.match(pattern)[0].length).trim();
  }
  return null;
}

function looksLikeMenuRequest(text) {
  const lower = text.toLowerCase();
  const menuWords = /\b(menu|main menu|options|commands|choices)\b/;
  const openWords = /\b(open|show|display|bring|give|see|view)\b/;
  return menuWords.test(lower) && openWords.test(lower);
}

async function route(sock, msg) {
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  if (!from || from.endsWith('@status')) return;

  const text = textOf(msg).trim();
  if (!text) return;

  const lower = text.toLowerCase();
  const fioraText = stripFioraPrefix(text);

  // /start and natural-language menu requests use the exact same menu function.
  if (lower === '/start' || looksLikeMenuRequest(text)) {
    return openMainMenu(sock, from);
  }

  if (
    lower.startsWith('/project ') || lower === '/project' ||
    lower.startsWith('/image ') || lower === '/image' ||
    lower === '/admin'
  ) {
    const name = lower.split(/\s+/)[0];
    const file = name === '/project'
      ? '../commands/project'
      : name === '/image'
        ? '../commands/image'
        : '../commands/admin';
    return require(file).run(sock, msg, text);
  }

  if (lower === 'fiora_relationship') return handleFiora(sock, msg, 'friendship level');
  if (lower === 'fiora_photo') return handleFiora(sock, msg, 'show me a picture of yourself');
  if (lower === 'fiora_chat') return sock.sendMessage(from, { text: '🌸 Just say “Fiora” and start chatting with me 😊' });

  if (lower.startsWith('/task ')) {
    if (!isOwner(jidNumber(msg.key.participant || from))) return sock.sendMessage(from, { text: '🔒 Owner only.' });
    const parts = text.slice(6).split('|');
    if (parts.length < 3) return sock.sendMessage(from, { text: 'Usage: /task NUMBER|YYYY-MM-DD HH:mm|message' });
    const [to, when, ...rest] = parts;
    const t = addTask({ to: to.replace(/\D/g, '') + '@s.whatsapp.net', runAt: new Date(when).toISOString(), message: rest.join('|').trim() });
    return sock.sendMessage(from, { text: `✅ Scheduled ${t.id}` });
  }

  if (lower.startsWith('/trust ')) {
    if (!isOwner(jidNumber(msg.key.participant || from))) return sock.sendMessage(from, { text: '🔒 Owner only.' });
    const [, target, val] = text.split(/\s+/);
    const db = users();
    const key = Object.keys(db).find(k => jidNumber(k) === target.replace(/\D/g, ''));
    if (!key) return sock.sendMessage(from, { text: 'User not found.' });
    db[key].relationship.trust = Math.max(0, Math.min(100, Number(val) || 0));
    saveUsers(db);
    return sock.sendMessage(from, { text: `✅ Trust set to ${db[key].relationship.trust}` });
  }

  // Supported natural prefixes: Fiora, fiora, Fv, fv and .
  // The prefix is only a wake word. Everything after it is passed unchanged
  // to Fiora's normal brain so conversation remains natural.
  if (fioraText !== null) {
    return handleFiora(sock, msg, fioraText || text);
  }
}

module.exports = { route, textOf, stripFioraPrefix };
