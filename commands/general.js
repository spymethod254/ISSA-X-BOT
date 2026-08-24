export default {
    name: 'ping',
    execute: async (sock, m) => {
        await sock.sendMessage(m.key.remoteJid, { text: '*Pong!* ⚡\nISSA X ULTRA is alive' }, { quoted: m })
    }
}