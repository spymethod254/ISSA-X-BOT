import config from '../config.js'

export default {
name: 'session',
aliases: ['whoami', 'mysession'],
desc: 'Show bot session ID',

async execute(sock, m) {

    const sessionId =
        sock.user?.id ||
        'UNKNOWN'

    const remoteJid =
        m.key?.remoteJid ||
        'UNKNOWN'

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🧪 SESSION ID')
    console.log('🤖 SOCKET USER:', sessionId)
    console.log('📩 CHAT:', remoteJid)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    await sock.sendMessage(
        remoteJid,
        {
            text:
                `🆔 *SESSION ID*\n\n` +
                `\`${sessionId}\`\n\n` +
                `🤖 ${config.botName}`
        },
        {
            quoted: m
        }
    )
}

}
