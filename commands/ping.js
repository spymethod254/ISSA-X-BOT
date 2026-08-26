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

        const pingText = `
╭───「 *PING* 」───
│ ⚡ Speed: *${latency}ms*
│ ⏱️ Uptime: ${uptimeH}h ${uptimeM}m
│ 🤖 Bot: ${config.botName}
│ 📡 Server: Railway
╰────────────────

> *POWERED BY ISSA X ULTRA*
`

        await sock.sendMessage(
            m.key.remoteJid,
            {
                text: pingText
            },
            {
                quoted: m
            }
        )
    }
}
