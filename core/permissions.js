const { users, saveUsers, images } = require('./store');

/*
 * Image access is intentionally based on BOTH relationship values and
 * the image category's requirements. A high friendship score alone does
 * not force Fiora to send a high-stage image; the request/context must
 * first select that category.
 */
function isOwner(id) {
  const { ownerNumber, ownerJid } = require('./config');
  if (ownerJid && id === ownerJid) return true;
  return !!ownerNumber && id.replace(/\D/g, '').endsWith(ownerNumber);
}

function canImage(user, imageId) {
  if (isOwner(user.id)) return true;

  const meta = images()[imageId] || {};
  const blocked = user.permissions?.blockedImages || [];
  const explicitlyAllowed = user.permissions?.allowedImages || [];

  if (blocked.includes(imageId)) return false;
  if (explicitlyAllowed.includes(imageId)) return true;

  const friendship = Number(user.relationship?.friendship || 0);
  const trust = Number(user.relationship?.trust || 0);
  const requiredFriendship = Number(meta.requiredFriendship || 0);
  const requiredTrust = Number(meta.requiredTrust || 0);

  return friendship >= requiredFriendship && trust >= requiredTrust;
}

function grantImage(id, imageId) {
  const db = users();
  const u = db[id];
  if (!u) return;
  u.permissions.allowedImages = u.permissions.allowedImages || [];
  if (!u.permissions.allowedImages.includes(imageId)) {
    u.permissions.allowedImages.push(imageId);
  }
  saveUsers(db);
}

function setTrust(id, value) {
  const db = users();
  if (!db[id]) return;
  db[id].relationship.trust = Math.max(0, Math.min(100, Number(value) || 0));
  saveUsers(db);
}

module.exports = { isOwner, canImage, grantImage, setTrust };
