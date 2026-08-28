import { downloadMediaMessage } from '@whiskeysockets/baileys'

export default [
{
  name: "toviewonce",
  aliases: ["tovo"],
  execute: async (sock, m) => {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted) return sock.sendMessage(m.key.remoteJid, { text: "Reply to image/video" }, { quoted: m })
    try {
      const key = m.message.extendedTextMessage.contextInfo
      const buffer = await downloadMediaMessage({ key: { remoteJid: m.key.remoteJid, id: key.stanzaId, participant: key.participant }, message: quoted }, 'buffer', {}, { logger: sock.logger, reuploadRequest: sock.updateMediaMessage })
      
      if (quoted.imageMessage) await sock.sendMessage(m.key.remoteJid, { image: buffer, caption: quoted.imageMessage.caption || "", viewOnce: true }, { quoted: m })
      else if (quoted.videoMessage) await sock.sendMessage(m.key.remoteJid, { video: buffer, caption: quoted.videoMessage.caption || "", viewOnce: true }, { quoted: m })
    } catch(e){ await sock.sendMessage(m.key.remoteJid, { text: "Error: "+e.message }, { quoted: m }) }
  }
},
{
  name: "tovv",
  aliases: ["rvv", "vv", "toview"],
  execute: async (sock, m) => {
    const q = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!q) return sock.sendMessage(m.key.remoteJid, { text: "Reply to a ViewOnce message" }, { quoted: m })

    // 1. Locate the correct viewOnce structure inside the quoted message
    const viewMsg = q.viewOnceMessage || q.viewOnceMessageV2 || q.viewOnceMessageV2Extension
    if (!viewMsg?.message) return sock.sendMessage(m.key.remoteJid, { text: "This is not a ViewOnce message" }, { quoted: m })

    // 2. Extract the underlying real media message type
    const mediaMessage = viewMsg.message.imageMessage || viewMsg.message.videoMessage || viewMsg.message.audioMessage
    if (!mediaMessage) return sock.sendMessage(m.key.remoteJid, { text: "Unsupported viewonce media type" }, { quoted: m })

    try {
      const quotedInfo = m.message.extendedTextMessage.contextInfo
      
      // 3. Construct the fake download object targeting the embedded media structure
      const downloadMsg = {
        key: { 
          remoteJid: m.key.remoteJid, 
          id: quotedInfo.stanzaId, 
          participant: quotedInfo.participant 
        }, 
        message: viewMsg.message // This unlocks the actual imageMessage/videoMessage for Baileys
      }

      const buffer = await downloadMediaMessage(
        downloadMsg,
        'buffer', 
        {}, 
        { logger: sock.logger, reuploadRequest: sock.updateMediaMessage }
      )

      // 4. Send back as a standard, permanent media file
      if (viewMsg.message.imageMessage) {
        await sock.sendMessage(m.key.remoteJid, { image: buffer, caption: mediaMessage.caption || "" }, { quoted: m })
      } else if (viewMsg.message.videoMessage) {
        await sock.sendMessage(m.key.remoteJid, { video: buffer, caption: mediaMessage.caption || "" }, { quoted: m })
      }
    } catch(e){
      await sock.sendMessage(m.key.remoteJid, { text: "Failed to open viewonce: "+e.message }, { quoted: m })
    }
  }
}
]
