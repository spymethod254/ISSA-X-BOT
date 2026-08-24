export default {
    name: 'ai',
    execute: async (sock, m, args) => {
        if(!args[0]) return sock.sendMessage(m.key.remoteJid, { text: 'Use:.ai hello' }, { quoted: m })
        // Add your OpenAI API logic here
        await sock.sendMessage(m.key.remoteJid, { text: `*AI:* You said: ${args.join(' ')}` }, { quoted: m })
    }
}