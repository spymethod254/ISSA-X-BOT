import config from '../config.js'

export default {
    name: 'ping',
    aliases: ['speed', 'latency'],
    desc: 'Check bot speed',
    execute: async (sock, m) => {
        const start = Date.now()
        
        // First quick reply to calculate
        const msg = await sock.sendMessage(m.key.remoteJid, { 
            text: '*_Pinging..._* ⚡' 
        }, { quoted: m })
        
        const latency = Date.now() - start
        const uptimeSec = process.uptime()
        const uptimeH = Math.floor(uptimeSec / 3600)
        const uptimeM = Math.floor((uptimeSec % 3600) / 60)

        const pingText = `
╭───「 *PING* 」───
│  ⚡ Speed: *${latency}ms*
│  ⏱️ Uptime: ${uptimeH}h ${uptimeM}m
│  🤖 Bot: ${config.botName}
│  📡 Server: Railway
╰────────────────

> *POWERED BY ISSA X ULTRA*
`

        // Edit with image for premium look
        await sock.sendMessage(m.key.remoteJid, {
            image: { url: 'https://files.catbox.moe/o6jrdp.jpg' },
            caption: pingText
        }, { quoted: m })
    }
}