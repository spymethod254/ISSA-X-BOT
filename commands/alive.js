export default {
    name: 'alive',
    execute: async (sock, m) => {
        await sock.sendMessage(m.key.remoteJid, { text: `*ISSA X ULTRA* is running!\nUptime: ${Math.floor(process.uptime()/60)} min\nMulti-Session Mode ✅` }, { quoted: m })
    }
}