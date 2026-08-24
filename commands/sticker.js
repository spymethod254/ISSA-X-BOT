export default [
{
 name: 'sticker', aliases: ['s'],
 execute: async (sock, m) => {
   const q = m.message?.extendedTextMessage?.contextInfo?.quotedMessage || m.message
   const media = q?.imageMessage || q?.stickerMessage
   if(!media) return sock.sendMessage(m.key.remoteJid, {text:'Reply to an image with.sticker'}, {quoted:m})
   const buffer = await sock.downloadMediaMessage({message: {imageMessage: media}})
   await sock.sendMessage(m.key.remoteJid, {sticker: buffer}, {quoted:m})
 }
},
{
 name: 'toimg',
 execute: async (sock, m) => {
   const q = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage
   if(!q) return sock.sendMessage(m.key.remoteJid, {text:'Reply to a sticker with.toimg'}, {quoted:m})
   const buffer = await sock.downloadMediaMessage({message: {stickerMessage: q}})
   await sock.sendMessage(m.key.remoteJid, {image: buffer, caption: 'Done ✅'}, {quoted:m})
 }
}
]