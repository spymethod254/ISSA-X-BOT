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
    // get the viewonce message
    const q = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    let viewMsg = q?.viewOnceMessage || q?.viewOnceMessageV2 || q?.viewOnceMessageV2Extension
    if (!viewMsg) viewMsg = m.message?.viewOnceMessage || m.message?.viewOnceMessageV2
    
    // if replying, extract inner
    let inner = viewMsg?.message?.imageMessage || viewMsg?.message?.videoMessage || viewMsg?.message?.audioMessage
    if (q?.viewOnceMessage) inner = q.viewOnceMessage.message?.imageMessage || q.viewOnceMessage.message?.videoMessage
    if (q?.viewOnceMessageV2) inner = q.viewOnceMessageV2.message?.imageMessage || q.viewOnceMessageV2.message?.videoMessage
    
    if (!viewMsg && !inner) return sock.sendMessage(m.key.remoteJid, { text: "Reply to a ViewOnce message" }, { quoted: m })

    try {
      // download the viewonce media
      const msgToDownload = viewMsg ? { message: viewMsg.message } : { message: q }
      // Baileys can download viewonce directly if you pass full quoted
      const quotedInfo = m.message.extendedTextMessage.contextInfo
      const buffer = await downloadMediaMessage(
        { key: { remoteJid: m.key.remoteJid, id: quotedInfo.stanzaId, participant: quotedInfo.participant }, message: viewMsg ? viewMsg.message : q },
        'buffer', {}, { logger: sock.logger, reuploadRequest: sock.updateMediaMessage }
      )

      if (inner?.imageMessage || viewMsg?.message?.imageMessage) {
        await sock.sendMessage(m.key.remoteJid, { image: buffer, caption: inner?.caption || viewMsg?.message?.imageMessage?.caption || "" }, { quoted: m })
      } else if (inner?.videoMessage || viewMsg?.message?.videoMessage) {
        await sock.sendMessage(m.key.remoteJid, { video: buffer, caption: inner?.caption || viewMsg?.message?.videoMessage?.caption || "" }, { quoted: m })
      } else {
        await sock.sendMessage(m.key.remoteJid, { text: "Unsupported viewonce type" }, { quoted: m })
      }
    } catch(e){
      await sock.sendMessage(m.key.remoteJid, { text: "Failed to open viewonce: "+e.message }, { quoted: m })
    }
  }
}
]
