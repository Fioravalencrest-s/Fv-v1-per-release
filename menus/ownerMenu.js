const fs = require("fs")

async function ownerMenu(sock, from) {

  await sock.sendMessage(from, {
    image: fs.readFileSync("./Mainmenu.jpg"),
    caption: `
             Done ✅ `

  })

}

module.exports = { ownerMenu }