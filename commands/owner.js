export default {
    name: 'owner',
    execute: async (sock, m) => {
        await sock.sendMessage(m.key.remoteJid, { text: '*Owner:* ISSA X\n*Number:* wa.me/255xxxxxxxxx' }, { quoted: m })
    }
}