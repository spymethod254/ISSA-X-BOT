export function statusHandler(sock) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const m of messages) {
            if (m.key?.remoteJid !== 'status@broadcast') continue

            try {
                await sock.readMessages([m.key])

                const emojis = ['❤️', '🔥', '😍', '👏']
                const randomEmoji =
                    emojis[Math.floor(Math.random() * emojis.length)]

                await sock.sendMessage('status@broadcast', {
                    react: {
                        text: randomEmoji,
                        key: m.key
                    }
                })

                console.log(
                    `✅ Viewed status from ${m.key.participant || 'unknown'}`
                )
            } catch (err) {
                console.error('❌ Status error:', err.message)
            }
        }
    })
}
