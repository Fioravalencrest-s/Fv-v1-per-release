/*
 * Main menu entry point.
 * Both /start and natural-language requests such as
 * "Fiora, please open your menu" call this same function.
 */

const fs = require('fs');
const path = require('path');
const { root } = require('./config');

async function openMainMenu(sock, from) {
  const imagePath = path.join(root, 'Mainmenu.jpg');

  if (fs.existsSync(imagePath)) {
    await sock.sendMessage(from, {
      image: fs.readFileSync(imagePath),
      caption: '🖤 WELCOME TO ꒰໒ Fiora ໒꒱ V2'
    });
  }

  return sock.sendMessage(from, {
    text: '🌸 Choose what you want to do:',
    footer: 'Fiora V2',
    title: 'FIORA',
    buttonText: 'OPEN MENU',
    sections: [{
      title: 'Main',
      rows: [
        { title: '💬 Chat with Fiora', rowId: 'fiora_chat' },
        { title: '🌸 Relationship', rowId: 'fiora_relationship' },
        { title: '📷 Request photo', rowId: 'fiora_photo' },
        { title: '👑 Owner menu', rowId: 'owner_menu' }
      ]
    }]
  });
}

module.exports = { openMainMenu };
