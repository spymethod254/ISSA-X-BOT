import config from '../config.js'

export default {
    name: 'menu',
    aliases: ['help', 'list'],
    desc: 'Show all commands',
    async execute(sock, m, args) {
        const jid = m.key.remoteJid
        const pushName = m.pushName || 'User'
        const prefix = config.prefix
        const totalCmds = 62
        const uptime = Math.floor(process.uptime() / 60)
        const imageUrl = 'https://files.catbox.moe/o6jrdp.jpg'

        const sender = m.sender || m.key.participant || m.key.remoteJid || sock.user.id

        const menuText = `
╭───「 *${config.botName.toUpperCase()}* 」───
│✷  👋 ʜᴇʟʟᴏ @${pushName}
│✷  🤖 ʙᴏᴛ: ${config.botName}
│✷  👑 ᴏᴡɴᴇʀ: ${config.ownerName}
│✷  🔣 ᴘʀᴇꜰɪx: ${prefix}
│✷  ⏱️ ᴜᴘᴛɪᴍᴇ: ${uptime}m
│✷  📦 ᴄᴏᴍᴍᴀɴᴅꜱ: ${totalCmds}
╰─────────────────────


╭───── ⌈ *ɢᴇɴᴇʀᴀʟ* ⌋ ╾────
│➤ ${prefix}fetch
│➤ ${prefix}clearsession
│➤ ${prefix}shell
│➤ ${prefix}chunk
│➤ ${prefix}save
│➤ ${prefix}vv2
│➤ ${prefix}profile
│➤ ${prefix}fullpp
│➤ ${prefix}phone
│➤ ${prefix}jid
│➤ ${prefix}mygroups
│➤ ${prefix}setsudo
│➤ ${prefix}delsudo
│➤ ${prefix}issudo
│➤ ${prefix}getsudo
│➤ ${prefix}deploy
│➤ ${prefix}subbots
│➤ ${prefix}stopbot
│➤ ${prefix}test2
│➤ ${prefix}post
│➤ ${prefix}jidcount
│➤ ${prefix}gpp
│➤ ${prefix}avo
│➤ ${prefix}viewonce
│➤ ${prefix}pp
│➤ ${prefix}getpp
│➤ ${prefix}profile
│➤ ${prefix}toviewonce
│➤ ${prefix}toview
│➤ ${prefix}vv
╰──────────────────


╭───「 *ᴀɪ & ᴄʜᴀᴛ* 」╾───
│➤ ${prefix}ai <question>
│➤ ${prefix}sora
│➤ ${prefix}flux
│➤ ${prefix}speechwriter
│➤ ${prefix}muslimai
│➤ ${prefix}wormgpt
│➤ ${prefix}bibleai
│➤ ${prefix}removebg
│➤ ${prefix}vision
│➤ ${prefix}transcribe
│➤ ${prefix}shazam
│➤ ${prefix}bwmai
│➤ ${prefix}gpt4o
│➤ ${prefix}letmegpt
│➤ ${prefix}pollinations
│➤ ${prefix}transcript
│➤ ${prefix}gpthistory
│➤ ${prefix}lastchat
│➤ ${prefix}clearai
│➤ ${prefix}gpt <text>
│➤ ${prefix}imagine <prompt>
╰───────────────────


╭─────╾「 *ɢʀᴏᴜᴘ* 」────
│➤ ${prefix}tagall [msg]
│➤ ${prefix}hidetag [msg]
│➤ ${prefix}kick @user
│➤ ${prefix}add 255xx
│➤ ${prefix}promote / demote
│➤ ${prefix}group open/close
│➤ ${prefix}link / revoke
│➤ ${prefix}antilink on/off
│➤ ${prefix}welcome on/off
╰────────────────────

╭────╼ ⌈ *ꜱᴇᴛᴛɪɴɢꜱ* ⌋ ╾───
│➤ ${prefix}hideviewchannel
│➤ ${prefix}anticall
│➤ ${prefix}events
│➤ ${prefix}settings
│➤ ${prefix}syncsettings
│➤ ${prefix}devicemode
│➤ ${prefix}botname
│➤ ${prefix}author
│➤ ${prefix}packname
│➤ ${prefix}timezone
│➤ ${prefix}botpic
│➤ ${prefix}menustyle
│➤ ${prefix}boturl
│➤ ${prefix}mode
│➤ ${prefix}prefix
│➤ ${prefix}presence
│➤ ${prefix}greet
│➤ ${prefix}chatbot
│➤ ${prefix}autobio
│➤ ${prefix}antistatusmention
│➤ ${prefix}antilink
│➤ ${prefix}antidelete
│➤ ${prefix}antiedit
│➤ ${prefix}viewonce
│➤ ${prefix}statusantidelete
│➤ ${prefix}allvar
│➤ ${prefix}getvar
│➤ ${prefix}setvar
│➤ ${prefix}systeminfo
╰─────────────────

╭───╼ ⌈ *ꜱᴘᴏʀᴛꜱ* ⌋ ╾────
│➤ ${prefix}livesports
│➤ ${prefix}sportscats
│➤ ${prefix}flive
│➤ ${prefix}flive2
│➤ ${prefix}predictions
│➤ ${prefix}fstream
│➤ ${prefix}fnews
│➤ ${prefix}blive
│➤ ${prefix}livescore
│➤ ${prefix}sportnews
│➤ ${prefix}topscorers
│➤ ${prefix}standings
│➤ ${prefix}fixtures
│➤ ${prefix}gamehistory
│➤ ${prefix}stadium
│➤ ${prefix}team
│➤ ${prefix}player
╰───────────────────

╭───╼ ⌈*ɢᴇɴᴇʀᴀʟ2* ⌋ ╾───
│➤ ${prefix}toviewonce
│➤ ${prefix}getdesc
│➤ ${prefix}getcategory
│➤ ${prefix}getalias
│➤ ${prefix}help
│➤ ${prefix}list
│➤ ${prefix}menu
│➤ ${prefix}bwmgift
│➤ ${prefix}pair
│➤ ${prefix}location
│➤ ${prefix}copy
│➤ ${prefix}repo
╰──────────────────

╭────╼   ⌈ *ᴀɴɪᴍᴇ* ⌋ ╾────
│➤ ${prefix}neko
│➤ ${prefix}waifu
│➤ ${prefix}konachan
│➤ ${prefix}foxgirl
│➤ ${prefix}animerandom
│➤ ${prefix}animequote
│➤ ${prefix}animeloli
│➤ ${prefix}animemilf
│➤ ${prefix}hwaifu
│➤ ${prefix}hneko
│➤ ${prefix}megumin
│➤ ${prefix}awoo
╰───────────────────

╭───╾「 *ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* 」╼──
│➤ ${prefix}play <song>
│➤ ${prefix}ytmp3 <link>
│➤ ${prefix}ytmp4 <link>
│➤ ${prefix}tiktok <link>
│➤ ${prefix}fb <link>
│➤ ${prefix}ig <link>
╰──────────────────────


╭───╾「 *ᴛᴏᴏʟꜱ* 」╼────
│➤ ${prefix}sticker
│➤ ${prefix}toimg
│➤ ${prefix}ping
│➤ ${prefix}tovv
│➤ ${prefix}tovo
│➤ ${prefix}pair
│➤ ${prefix}gcdesc
│➤ ${prefix}allvar
│➤ ${prefix}antidelete on
│➤ ${prefix}antidelete off
│➤ ${prefix}antidel
│➤ ${prefix}rvv
│➤ ${prefix}alive
│➤ ${prefix}owner
│➤ ${prefix}calc <expr>
╰───────────────────

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɪꜱꜱᴀ x ᴜʟᴛʀᴀ*
`

        await sock.sendMessage(jid, {
            image: { url: imageUrl },
            caption: menuText,
            mentions: [sender]
        }, { quoted: m })
    }
}
