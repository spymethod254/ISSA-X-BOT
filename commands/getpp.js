export default {
    name: 'getpp',
    aliases: ['pp', 'profile'],
    desc: 'Get profile picture of a user',
    async execute(sock, m, args) {
        const jid = m.key.remoteJid
        const prefix = config.prefix

        // 1. Determine who we are targeting
        let target;
        if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
            // Target is explicitly @mentioned
            target = m.message.extendedTextMessage.contextInfo.mentionedJid[0]
        } else if (m.message?.extendedTextMessage?.contextInfo?.participant) {
            // Target is the person being replied to
            target = m.message.extendedTextMessage.contextInfo.participant
        } else if (args[0]) {
            // Target is typed out as a number (e.g. 255xxxx)
            target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        } else {
            // Default to the sender
            target = m.sender || m.key.participant || jid
        }

        try {
            // 2. Fetch the high-resolution profile picture URL from WhatsApp
            const ppUrl = await sock.profilePictureUrl(target, 'image')

            // 3. Send the image back to the chat
            await sock.sendMessage(jid, { 
                image: { url: ppUrl }, 
                caption: `📸 Profile picture for @${target.split('@')[0]}`,
                mentions: [target]
            }, { quoted: m })

        } catch (error) {
            // Fallback error if the user has no profile picture or strict privacy settings
            console.error(error)
            await sock.sendMessage(jid, { 
                text: `❌ Could not fetch profile picture. The user may not have one, or their privacy settings restrict it.` 
            }, { quoted: m })
        }
    }
}