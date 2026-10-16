  const fs = require("fs")

async function mainMenu(sock, from) {

  await sock.sendMessage(from, {
    image: fs.readFileSync("./Mainmenu.jpg"),
    caption: `
             Done ✅ `

  })

}

module.exports = { mainMenu }