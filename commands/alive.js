import config from '../config.js'

export default {
    name: 'alive',
    aliases: ['bot', 'status'],
    desc: 'Check if bot is alive',
    execute: async (sock, m) => {
        const uptimeMin = Math.floor(process.uptime() / 60)
        const uptimeH = Math.floor(uptimeMin / 60)
        const uptimeM = uptimeMin % 60
        const imageUrl = 'https://files.catbox.moe/o6jrdp.jpg'
        
        const aliveText = `
╭───「 *ᴀʟɪᴠᴇ* 」────
│➤  ✅ *${config.botName}* is Running!
│
│➤  👑 Owner: ${config.ownerName}
│➤  ⏱️ Uptime: ${uptimeH}h ${uptimeM}m
│➤  ⚡ Mode: Multi-Session
│➤  🔣 Prefix: ${config.prefix}
│➤  📦 Version: 1.0.0 ᴜʟᴛʀᴀ
╰─────────────────

> _Multi-device bot hosted on Railway_
> _Pair Site: ${process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'Online'}_

*ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɪꜱꜱᴀ x ᴜʟᴛʀᴀ*
`

        await sock.sendMessage(m.key.remoteJid, {
            image: { url: imageUrl },
            caption: aliveText,
            footer: 'ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɪꜱꜱᴀ x ᴜʟᴛʀᴀ',
            buttons: [
                { buttonId: `${config.prefix}menu`, buttonText: { displayText: '📜 MENU' }, type: 1 },
                { buttonId: `${config.prefix}ping`, buttonText: { displayText: '⚡ PING' }, type: 1 }
            ],
            headerType: 4
        }, { quoted: m })
    }
}
