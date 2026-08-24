export default [
{ name: 'play', aliases: ['song'], execute: async (sock,m,args) => {
  if(!args[0]) return sock.sendMessage(m.key.remoteJid, {text:'Use.play <song name>'}, {quoted:m})
  await sock.sendMessage(m.key.remoteJid, {text:`🎵 Searching: ${args.join(' ')}...\n_Add ytdl logic here_`}, {quoted:m})
}},
{ name: 'tiktok', aliases: ['tt'], execute: async (sock,m,args) => {
  if(!args[0]) return sock.sendMessage(m.key.remoteJid, {text:'Send TikTok link'}, {quoted:m})
  await sock.sendMessage(m.key.remoteJid, {text:`Downloading TikTok: ${args[0]}`}, {quoted:m})
}}
]