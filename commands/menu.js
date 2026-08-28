import config from '../config.js'

export default {
    name: 'menu',
    aliases: ['help', 'list'],
    desc: 'Show all commands',
    async execute(sock, m, args) {
        const jid = m.key.remoteJid
        const pushName = m.pushName || 'User'
        const prefix = config.prefix
        const totalCmds = 32
        const uptime = Math.floor(process.uptime() / 60)
        const imageUrl = 'https://files.catbox.moe/o6jrdp.jpg'

        // Accurately get the message sender's JID
        const sender = m.sender || m.key.participant || m.key.remoteJid || sock.user.id

        const menuText = `
╭───「 *${config.botName.toUpperCase()}* 」───
│➥  👋 Hello @${pushName}
│➥  🤖 Bot: ${config.botName}
│➥  👑 Owner: ${config.ownerName}
│➥  🔣 Prefix: ${prefix}
│➥  ⏱️ Uptime: ${uptime}m
│➥  📦 Commands: ${totalCmds}
╰─────────────────────────────╯

╭───「 *ᴀɪ & ᴄʜᴀᴛ* 」╾──╮
│➺ ${prefix}ai <question>
│➺ ${prefix}gpt <text>
│➺ ${prefix}imagine <prompt>
╰────────────────────╯

╭─────╾「 *ɢʀᴏᴜᴘ* 」──────╮
│➺ ${prefix}tagall [msg]
│➺ ${prefix}hidetag [msg]
│➺ ${prefix}kick @user
│➺ ${prefix}add 255xx
│➺ ${prefix}promote / demote
│➺ ${prefix}group open/close
│➺ ${prefix}link / revoke
│➺ ${prefix}antilink on/off
│➺ ${prefix}welcome on/off
╰───────────────────────╯

╭───╾「 *ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* 」╼─╮
│➺ ${prefix}play <song>
│➺ ${prefix}ytmp3 <link>
│➺ ${prefix}ytmp4 <link>
│➺ ${prefix}tiktok <link>
│➺ ${prefix}fb <link>
│➺ ${prefix}ig <link>
╰─────────────────────╯

╭───╾「 *ᴛᴏᴏʟꜱ* 」╼───╮
│➻ ${prefix}sticker
│➺ ${prefix}toimg
│➺ ${prefix}ping
│➺ ${prefix}alive
│➺ ${prefix}owner
│➺ ${prefix}calc <expr>
╰──────────────────╯

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɪꜱꜱᴀ x ᴜʟᴛʀᴀ*
`

        await sock.sendMessage(jid, {
            image: { url: imageUrl },
            caption: menuText,
            mentions: [sender]
        }, { quoted: m })
    }
}
