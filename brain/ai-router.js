const { GoogleGenerativeAI } = require('@google/generative-ai');
const { geminiKey, geminiModel, groqKey, groqModel } = require('../core/config');
const { system } = require('./personality');

let gemini = null;

function getGemini() {
  if (!geminiKey) throw new Error('GEMINI_API_KEY is not configured');
  if (!gemini) gemini = new GoogleGenerativeAI(geminiKey).getGenerativeModel({ model: geminiModel });
  return gemini;
}

function buildPrompt(userMessage, memory, history = []) {
  const u = memory || {};
  return `${system}

You are handling ONE natural WhatsApp turn. Return one natural reply, not multiple messages.
You must also classify image intent and extract only facts that are explicitly stated by the user.
Do not invent facts. The local permission engine decides whether an image may actually be sent.

USER PROFILE:
Name: ${u.profile?.name || 'Unknown'}
Nickname: ${u.profile?.nickname || 'Unknown'}
Age: ${u.profile?.age ?? 'Unknown'}
Birthday: ${u.profile?.birthday || 'Unknown'}
Favorite anime: ${(u.profile?.favoriteAnime || []).join(', ') || 'Unknown'}
Likes: ${(u.profile?.likes || []).join(', ') || 'Unknown'}
Friendship: ${Math.round(u.relationship?.friendship || 0)}/100
Trust: ${Math.round(u.relationship?.trust || 0)}/100
Relationship: ${u.relationship?.level || 'New Contact'}

RECENT CHAT:
${history.slice(-10).map(x => `${x.role}: ${x.text}`).join('\n') || 'None'}

USER MESSAGE:
${userMessage}

Return ONLY JSON with this shape:
{
  "reply":"natural WhatsApp reply",
  "facts":[{"type":"name|nickname|age|birthday|favoriteAnime|like|dislike","value":"..."}],
  "image":{"requested":false,"category":"none|portrait|self|cute|romance|blocked","confidence":0.0,"contextual":false}
}

Image meanings:
portrait = normal portrait / what Fiora looks like;
self = personal-style picture of Fiora;
cute = cute wholesome picture;
romance = wholesome affectionate/romantic picture;
blocked = sexual/nude/explicit request;
none = no picture requested.
A compliment alone is not an image request. Indirect natural requests count when their meaning clearly asks for a picture.`;
}

function parseResult(text) {
  const raw = String(text || '').trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(raw);
  const facts = Array.isArray(parsed.facts) ? parsed.facts : [];
  const image = parsed.image || {};
  const allowed = ['none', 'portrait', 'self', 'cute', 'romance', 'blocked'];
  return {
    reply: String(parsed.reply || '').trim(),
    facts: facts.filter(x => x && x.value != null && ['name','nickname','age','birthday','favoriteAnime','like','dislike'].includes(x.type)).map(x => ({ type: x.type, value: String(x.value).trim() })).filter(x => x.value),
    image: {
      requested: Boolean(image.requested) && image.category !== 'none',
      category: allowed.includes(image.category) ? image.category : 'none',
      confidence: Math.max(0, Math.min(1, Number(image.confidence) || 0)),
      contextual: Boolean(image.contextual)
    }
  };
}

async function callGroq(prompt) {
  if (!groqKey) throw new Error('GROQ_API_KEY is not configured');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: groqModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return parseResult(data.choices?.[0]?.message?.content);
}

async function callGemini(prompt) {
  const result = await getGemini().generateContent(prompt);
  return parseResult(result.response.text());
}

async function generateTurn(userMessage, memory, history = []) {
  const prompt = buildPrompt(userMessage, memory, history);
  const errors = [];

  // Groq is the normal high-volume path. Gemini is kept as a fallback so
  // reaching a provider quota does not make Fiora stop chatting.
  if (groqKey) {
    try { return { ...await callGroq(prompt), provider: 'groq' }; }
    catch (e) { errors.push(`Groq: ${e.message}`); console.error('Groq AI:', e.message); }
  }

  if (geminiKey) {
    try { return { ...await callGemini(prompt), provider: 'gemini' }; }
    catch (e) { errors.push(`Gemini: ${e.message}`); console.error('Gemini AI:', e.message); }
  }

  throw new Error(errors.join(' | ') || 'No AI provider configured');
}

async function generateProject(prompt) {
  const instruction = `Generate a small software project from this request: ${prompt}\nReturn ONLY JSON: {"files":[{"path":"relative/path","content":"file content"}],"readme":"optional"}. No markdown.`;
  if (groqKey) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({ model: groqModel, messages: [{ role: 'user', content: instruction }], response_format: { type: 'json_object' } })
    });
    if (res.ok) return JSON.parse((await res.json()).choices[0].message.content);
  }
  const r = await getGemini().generateContent(instruction);
  const raw = String(r.response.text() || '').trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(raw);
}

module.exports = { generateTurn, generateProject };
