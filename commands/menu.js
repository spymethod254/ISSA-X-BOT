export default {
 name: 'menu', aliases: ['help'],
 execute: async (sock,m) => {
  const txt = `
*╭━━━ ISSA X ULTRA ━━━╮*
*┃*.ping.alive.menu.owner
*┃* *STICKER:*.sticker.toimg
*┃* *GROUP:*.tagall.hidetag.kick.add.promote.demote.group open/close.link
*┃* *FUN:*.joke.quote.ship.8ball
*┃* *MEDIA:*.play.tiktok
*┃* *TOOLS:*.calc 2+2.weather Mombasa.ai
*╰━━━━━━━━━━━━━━━━━━━━╯*
_Total Commands: ${sock.commandsCount || 30} | Multi-Session ✅_
`
  await sock.sendMessage(m.key.remoteJid, {text: txt}, {quoted:m})
 }
}
