// =====================================================
// AUTO VIEW ONCE
// =====================================================

// Global state
// Resets to false when the application restarts
global.autoViewOnce = global.autoViewOnce ?? false

export default {
    name: 'autoviewonce',
    aliases: ['avo'],

    desc: 'Toggle automatic handling of View Once media',

    async execute(sock, m, args) {

        const jid =
            m.key?.remoteJid || ''

        global.autoViewOnce =
            !global.autoViewOnce

        const status =
            global.autoViewOnce
                ? '✅ ENABLED'
                : '❌ DISABLED'

        await sock.sendMessage(
            jid,
            {
                text:
                    `🤖 *Auto ViewOnce*\n\n` +
                    `Status: *${status}*\n\n` +
                    (
                        global.autoViewOnce
                            ? 'View Once media handling is now enabled.'
                            : 'View Once media handling is now disabled.'
                    )
            },
            {
                quoted: m
            }
        )
    }
}