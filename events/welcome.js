export async function welcomeHandler(sock) {
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update
        try {
            const metadata = await sock.groupMetadata(id).catch(()=>null)
            const groupName = metadata?.subject || 'Group'

            for(let user of participants) {
                let pp
                try { pp = await sock.profilePictureUrl(user, 'image') } catch { pp = null }

                if(action === 'add') {
                    await sock.sendMessage(id, {
                        image: pp? { url: pp } : undefined,
                        caption: `*WELCOME TO ${groupName}* 🎉\n\nHello @${user.split('@')[0]}!\n\nRead group description & enjoy!\n\nType.menu to see commands\n\n_GWIJITECH MD_`,
                        mentions: [user]
                    })
                }
                if(action === 'remove') {
                    await sock.sendMessage(id, {
                        text: `*GOODBYE* 👋\n@${user.split('@')[0]} left ${groupName}\nWe will miss you!`,
                        mentions: [user]
                    })
                }
                if(action === 'promote') {
                    await sock.sendMessage(id, { text: `🎉 @${user.split('@')[0]} is now admin!`, mentions: [user] })
                }
                if(action === 'demote') {
                    await sock.sendMessage(id, { text: `😅 @${user.split('@')[0]} is no longer admin`, mentions: [user] })
                }
            }
        } catch(e) { console.log('welcome error', e) }
    })
}