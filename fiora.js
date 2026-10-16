const fs = require('fs');
const { ensureUser, update, addFact, logConversation } = require('./brain/memory');
const { images } = require('./core/store');
const { generateTurn } = require('./brain/ai-router');
const { chooseImage } = require('./core/image-engine');

const cooldown = new Map();
const imageCooldown = new Map();

function random(a) { return a[Math.floor(Math.random() * a.length)]; }

function applyFacts(sender, facts) {
  let user = ensureUser(sender);
  for (const fact of facts || []) user = addFact(sender, fact.type, fact.value);
  return user;
}

async function sendImage(sock, from, user, category) {
  const selected = chooseImage(user, category);
  if (!selected) {
    const meta = images()[category] || {};
    const friendship = Math.round(user.relationship?.friendship || 0);
    const trust = Math.round(user.relationship?.trust || 0);
    const needF = Number(meta.requiredFriendship || 0);
    const needT = Number(meta.requiredTrust || 0);
    if (friendship < needF || trust < needT) {
      return sock.sendMessage(from, { text: '🌸 I can\'t share that one yet. Let\'s get to know each other a little more first 😊' });
    }
    return sock.sendMessage(from, { text: '🌸 I do not have a picture in that collection yet.' });
  }

  const meta = images()[selected.category] || {};
  const viewOnce = Boolean(meta.viewOnce && Number(meta.requiredFriendship || 0) > 45);
  if (!fs.existsSync(selected.path)) return sock.sendMessage(from, { text: '🌸 I could not find that picture right now.' });
  return sock.sendMessage(from, { image: fs.readFileSync(selected.path), caption: selected.caption, viewOnce });
}

async function maybeSendImage(sock, from, user, intent) {
  if (!intent?.requested || intent.confidence < 0.60) return false;
  if (intent.category === 'blocked') {
    await sock.sendMessage(from, { text: '🌸 I keep Fiora\'s pictures non-explicit. Let\'s keep it cute 😊' });
    return true;
  }
  if (!['portrait', 'self', 'cute', 'romance'].includes(intent.category)) return false;

  // Direct requests can send immediately when permission allows.
  // Contextual images are limited to higher relationship categories and a cooldown.
  if (intent.contextual) {
    if (!['cute', 'romance'].includes(intent.category)) return false;
    const key = `${from}:${intent.category}`;
    const now = Date.now();
    const last = imageCooldown.get(key) || 0;
    if (now - last < 20 * 60 * 1000) return false;
    imageCooldown.set(key, now);
  }

  await sendImage(sock, from, user, intent.category);
  return true;
}

async function handleFiora(sock, msg, text) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || from;
  let user = ensureUser(sender);

  // Do not increment friendship or duplicate the user message before the AI
  // turn. The completed turn is persisted once below, after the AI reply.

  if (/\b(?:nude|nudes|naked|explicit|sexual|sexy|hot babe)\b/i.test(text)) {
    return sock.sendMessage(from, { text: random([
      '🌸 I keep Fiora\'s pictures non-explicit. Let\'s keep it cute 😊',
      '😅 I keep my pictures wholesome, but I can send a cute one.'
    ]) });
  }

  if (/\b(?:my trust|friendship level)\b/i.test(text)) {
    return sock.sendMessage(from, { text: `🌸 Relationship: ${user.relationship.level}\nFriendship: ${Math.round(user.relationship.friendship)}/100\nTrust: ${Math.round(user.relationship.trust)}/100` });
  }

  const history = user.conversation.recentMessages || [];
  const now = Date.now();
  if (cooldown.get(sender) && now - cooldown.get(sender) < 1000) return;
  cooldown.set(sender, now);

  try {
    // ONE provider call handles reply + semantic image intent + facts.
    const turn = await generateTurn(text, user, history);

    user = applyFacts(sender, turn.facts);
    // Persist the whole turn exactly once: profile facts, friendship and
    // both sides of the conversation survive a restart.
    user = update(sender, text, turn.reply);

    const sentImage = await maybeSendImage(sock, from, user, turn.image);
    if (sentImage) return;

    return sock.sendMessage(from, { text: turn.reply || '🌸 I\'m here 😊' });
  } catch (e) {
    // Even if the AI provider is unavailable, remember the user's message.
    update(sender, text);
    console.error('Fiora AI:', e.message);
    return sock.sendMessage(from, { text: '🌸 My AI brain is taking a little break. Please try again in a moment.' });
  }
}

module.exports = { handleFiora };
