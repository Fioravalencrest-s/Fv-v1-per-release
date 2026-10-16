/*
 * ================================================================
 * Fiora Image Engine
 *
 * IMPORTANT DESIGN RULE:
 * - The AI interprets what the user means.
 * - This module decides what the user is allowed to receive.
 * - The user's relationship does NOT automatically reveal a higher
 *   image stage. The request/context must also match that category.
 * ================================================================
 */

const fs = require('fs');
const path = require('path');
const { paths } = require('./config');
const { images } = require('./store');
const { canImage } = require('./permissions');

const CATEGORY_FOLDERS = {
  portrait: path.join(paths.gallery, 'portrait'),
  self: paths.self,
  cute: path.join(paths.gallery, 'cute'),
  romance: path.join(paths.gallery, 'romance')
};

const CATEGORY_LABELS = {
  portrait: 'portrait',
  self: 'self',
  cute: 'cute',
  romance: 'romantic'
};

function normaliseCategory(category) {
  const value = String(category || '').toLowerCase().trim();
  if (value === 'romantic') return 'romance';
  if (value === 'selfie') return 'self';
  if (value === 'picture' || value === 'photo') return 'portrait';
  return CATEGORY_FOLDERS[value] ? value : null;
}

function relationshipAllows(user, category) {
  const config = images()[category];
  if (!config) return false;

  const friendship = Number(user.relationship?.friendship || 0);
  const trust = Number(user.relationship?.trust || 0);

  return friendship >= Number(config.requiredFriendship || 0) &&
    trust >= Number(config.requiredTrust || 0);
}

function listImages(category) {
  const folder = CATEGORY_FOLDERS[category];
  if (!folder || !fs.existsSync(folder)) return [];
  return fs.readdirSync(folder)
    .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));
}

function chooseImage(user, category) {
  category = normaliseCategory(category);
  if (!category) return null;
  if (!relationshipAllows(user, category)) return null;

  const meta = images()[category];
  // canImage remains the final per-image permission gate.
  if (!canImage(user, category)) return null;

  const files = listImages(category);
  if (!files.length) return null;

  const file = files[Math.floor(Math.random() * files.length)];
  return {
    category,
    file,
    path: path.join(CATEGORY_FOLDERS[category], file),
    caption: category === 'romance'
      ? '❤️ A little warm moment for you.'
      : category === 'cute'
        ? '🥰 Here is a cute one.'
        : category === 'self'
          ? '🌸 Here you go.'
          : '🌸 Here you go.'
  };
}

function hasAnyAvailableCategory(user) {
  return Object.keys(CATEGORY_FOLDERS).some(category => relationshipAllows(user, category));
}

module.exports = {
  normaliseCategory,
  relationshipAllows,
  chooseImage,
  hasAnyAvailableCategory,
  CATEGORY_LABELS
};
