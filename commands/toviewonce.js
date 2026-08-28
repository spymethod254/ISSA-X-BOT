import { downloadMediaMessage } from '@whiskeysockets/baileys'

export default {
  name: "toviewonce",
  aliases: ["tovv", "tovo"],
  execute: async (sock, m) => {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedKey = m.message?.extendedTextMessage?.contextInfo?.stanzaId
    const quotedJid = m.message?.extendedTextMessage?.contextInfo?.participant

    if (!quoted) return sock.sendMessage(m.key.remoteJid, { text: "Reply to an image, video or audio" }, { quoted: m })

    try {
      const buffer = await downloadMediaMessage(
        { key: { remoteJid: m.key.remoteJid, id: quotedKey, participant: quotedJid }, message: quoted },
        'buffer',
        {},
        { logger: sock.logger, reuploadRequest: sock.updateMediaMessage }
      )

      if (quoted.imageMessage) {
        await sock.sendMessage(m.key.remoteJid, { image: buffer, caption: quoted.imageMessage.caption || "", viewOnce: true }, { quoted: m })
      } else if (quoted.videoMessage) {
        await sock.sendMessage(m.key.remoteJid, { video: buffer, caption: quoted.videoMessage.caption || "", viewOnce: true }, { quoted: m })
      } else if (quoted.audioMessage) {
        await sock.sendMessage(m.key.remoteJid, { audio: buffer, ptt: true, viewOnce: true }, { quoted: m })
      } else {
        await sock.sendMessage(m.key.remoteJid, { text: "Only image/video/audio supported" }, { quoted: m })
      }
    } catch(e) {
      await sock.sendMessage(m.key.remoteJid, { text: "Failed: " + e.message }, { quoted: m })
    }
  }
}