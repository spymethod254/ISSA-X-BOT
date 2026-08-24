export default {
    name: 'menu',
    execute: async (sock, m) => {
        const menu = `
*╭─── ISSA X ULTRA ───╮*
*│*.ping - check bot
*│*.menu - this menu
*│*.alive - bot status
*│*.owner - owner contact
*│*.ai <text> - chatgpt
*│*.sticker - image to sticker
*╰──────────────────╯*
_100% Multi-Session Backend Only_
`
        await sock.sendMessage(m.key.remoteJid, { text: menu }, { quoted: m })
    }
}