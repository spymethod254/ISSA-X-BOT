export default [
{ name: 'tagall', aliases: ['all'], execute: async (sock, m, args) => {
  const groupMetadata = await sock.groupMetadata(m.key.remoteJid).catch(()=>null)
  if(!groupMetadata) return
  let txt = args.join(' ') || 'Attention Everyone 📢\n\n'
  let mentions = []
  for(let p of groupMetadata.participants){ txt+=`@${p.id.split('@')[0]} `; mentions.push(p.id) }
  await sock.sendMessage(m.key.remoteJid, {text: txt, mentions})
}},
{ name: 'kick', execute: async (sock,m,args) => {
  if(!m.key.remoteJid.endsWith('@g.us')) return
  const user = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.message.extendedTextMessage?.contextInfo?.participant
  if(!user) return
  await sock.groupParticipantsUpdate(m.key.remoteJid, [user], 'remove')
}},
{ name: 'add', execute: async (sock,m,args) => {
  if(!args[0]) return
  await sock.groupParticipantsUpdate(m.key.remoteJid, [args[0].replace(/[^0-9]/g,'')+'@s.whatsapp.net'], 'add')
}},
{ name: 'promote', execute: async (sock,m) => {
  const user = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  if(user) await sock.groupParticipantsUpdate(m.key.remoteJid, [user], 'promote')
}},
{ name: 'demote', execute: async (sock,m) => {
  const user = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  if(user) await sock.groupParticipantsUpdate(m.key.remoteJid, [user], 'demote')
}},
{ name: 'group', aliases: ['g'], execute: async (sock,m,args) => {
  const action = args[0] === 'open'? 'not_announcement' : 'announcement'
  await sock.groupSettingUpdate(m.key.remoteJid, action)
  await sock.sendMessage(m.key.remoteJid, {text:`Group ${args[0]}ed ✅`})
}},
{ name: 'link', aliases: ['invite'], execute: async (sock,m) => {
  const code = await sock.groupInviteCode(m.key.remoteJid)
  await sock.sendMessage(m.key.remoteJid, {text:`https://chat.whatsapp.com/${code}`})
}},
{ name: 'hidetag', execute: async (sock,m,args) => {
  const groupMetadata = await sock.groupMetadata(m.key.remoteJid)
  const txt = args.join(' ') || ''
  await sock.sendMessage(m.key.remoteJid, {text: txt, mentions: groupMetadata.participants.map(p=>p.id)})
}}
]