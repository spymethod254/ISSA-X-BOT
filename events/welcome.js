import config from '../config.js'

export async function welcomeHandler(sock) {
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update
        try {
            const metadata = await sock.groupMetadata(id).catch(()=>null)
            const groupName = metadata?.subject || 'this group'
            const groupMembers = metadata?.participants?.length || 0

            for(let user of participants) {
                let pp
                try { pp = await sock.profilePictureUrl(user, 'image') } catch { pp = null }
                const mentionTag = `@${user.split('@')[0]}`
                const footer = `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɪꜱꜱᴀ x ᴜʟᴛʀᴀ*`

                if(action === 'add') {
                    const welcomeText = `
╭───「 *WELCOME* 」───
│➥ 👋 Hello ${mentionTag}
│➥ 🏷️ Group: ${groupName}
│➥ 👥 Members: ${groupMembers}
│➥ 🤖 Bot: ${config.botName}
╰─────────────────────

╭───「 *RULES* 」───
│➤ No spam / links
│➤ Respect all members
│➤ Type ${config.prefix}menu for commands
╰───────────────────

${footer}
`
                    await sock.sendMessage(id, {
                        image: pp? { url: pp } : { url: 'https://files.catbox.moe/o6jrdp.jpg' },
                        caption: welcomeText,
                        mentions: [user]
                    })
                }

                if(action === 'remove') {
                    const byeText = `
╭───「 *GOODBYE* 」───
│➥ 😢 ${mentionTag} left
│➥ 🏷️ Group: ${groupName}
│➥ 👥 Now: ${groupMembers} members
╰─────────────────────

${footer}
`
                    await sock.sendMessage(id, { text: byeText, mentions: [user] })
                }

                if(action === 'promote') {
                    const promoText = `
╭───「 *PROMOTED* 」───
│➥ 🎉 ${mentionTag}
│➥ 📈 Now Admin in ${groupName}
╰─────────────────────

${footer}
`
                    await sock.sendMessage(id, { text: promoText, mentions: [user] })
                }

                if(action === 'demote') {
                    const demoText = `
╭───「 *DEMOTED* 」───
│➥ 😅 ${mentionTag}
│➥ 📉 No longer Admin
╰─────────────────────

${footer}
`
                    await sock.sendMessage(id, { text: demoText, mentions: [user] })
                }
            }
        } catch(e) { console.log('welcome error', e) }
    })
}
