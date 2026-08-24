export async function statusHandler(sock) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if(m.key.remoteJid === 'status@broadcast') {
            // Auto view status
            await sock.readMessages([m.key])
            // Optional auto react
            const emojis = ['❤️','🔥','😍','👏']
            const randomEmoji = emojis[Math.floor(Math.random()*emojis.length)]
            await sock.sendMessage('status@broadcast', { react: { text: randomEmoji, key: m.key } }).catch(()=>{})
            console.log(`✅ Viewed status from ${m.key.participant}`)
        }
    })
}