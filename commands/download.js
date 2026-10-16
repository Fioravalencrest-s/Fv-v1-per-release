const axios = require("axios")

module.exports = {

  name: "/download",

  run: async (sock, msg, text) => {

    const from = msg.key.remoteJid
    const url = text.split(" ")[1]

    if (!url) {
      return sock.sendMessage(from, {
        text: "❌ Usage: /download <url>"
      })
    }

    await sock.sendMessage(from, {
      text: "⏳ Detecting platform & downloading..."
    })

    try {

      let api = ""

      // ================= TIKTOK =================
      if (url.includes("tiktok.com")) {

  api = "https://api.tikwm.com/api/?url=${encodeURIComponent(url)}"

  const res = await axios.get(api, {
    timeout: 20000,
    httpsAgent: new (require("https").Agent)({
      rejectUnauthorized: false
    })
  })

  const result = res.data?.data

  if (!result?.play) {
    return sock.sendMessage(from, {
      text: "❌ Failed to download TikTok"
    })
  }

  await sock.sendMessage(from, {
    video: { url: result.play },
    caption: "✅ Downloaded TikTok via Fiora"
  })

}

      // ================= YOUTUBE =================
      else if (url.includes("youtu")) {
        api = "https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}"
      }

      // ================= INSTAGRAM =================
      else if (url.includes("instagram.com")) {
        api = "https://api.vreden.my.id/api/igdl?url=${encodeURIComponent(url)}"
      }

      // ================= FACEBOOK =================
      else if (url.includes("facebook.com")) {
        api = "https://api.vreden.my.id/api/fb?url=${encodeURIComponent(url)}"
      }

      else {
        return sock.sendMessage(from, {
          text: "❌ Unsupported link"
        })
      }

      const res = await axios.get(api)

      if (!res.data) {
        return sock.sendMessage(from, {
          text: "❌ Failed to fetch media"
        })
      }

      const result = res.data.result

      // ================= SEND RESULT =================

      if (result.video) {

        await sock.sendMessage(from, {
          video: { url: result.video },
          caption: "✅ Downloaded via Fiora Bot"
        })

      } else if (result.image) {

        await sock.sendMessage(from, {
          image: { url: result.image },
          caption: "✅ Downloaded via Fiora Bot"
        })

      } else {

        await sock.sendMessage(from, {
          text: "❌ No media found"
        })

      }

    } catch (err) {

      console.log(err)

      await sock.sendMessage(from, {
        text: "❌ Download failed"
      })

    }

  }

}