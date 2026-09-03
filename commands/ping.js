// commands/ping.js
import config from '../config.js'

export default {
    name: 'ping',
    aliases: ['speed', 'latency'],
    desc: 'Check bot speed',

    execute: async (sock, m) => {
        const start = Date.now()
        const latency = Date.now() - start
        const uptimeSec = process.uptime()
        const uptimeH = Math.floor(uptimeSec / 3600)
        const uptimeM = Math.floor((uptimeSec % 3600) / 60)

        // Read More hack — creates "Read more"
        const more = String.fromCharCode(8206).repeat(4001)

        // TRY to get real newsletter JID from invite
        let newsletterJid = '120363349045665097@newsletter' // fallback
        let newsletterName = 'ISSA X ULTRA'
        try {
            // This fetches real JID from your link
            const meta = await sock.newsletterMetadata("invite", "0029Vb8TKun8KMqsPz38Li38")
            if (meta?.id) newsletterJid = meta.id
            if (meta?.name) newsletterName = meta.name
            console.log("Channel JID:", newsletterJid)
        } catch (e) {
            console.log("Using fallback JID")
        }

        const pingText = `╭───「 *ᴘɪɴɢ* 」────
│➢ ⚡ Speed: *${latency}ms*
│➢ ⏱️ Uptime: ${uptimeH}h ${uptimeM}m
│➢ 🤖 Bot: ${config.botName}
│➢ 📡 Server: Railway
╰─────────────────${more}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɪꜱꜱᴀ x ᴜʟᴛʀᴀ*
`

        await sock.sendMessage(m.key.remoteJid, {
            text: pingText,
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: newsletterJid,
                    newsletterName: newsletterName,
                    serverMessageId: 145
                }
            }
        }, { quoted: m })
    }
}