const warnings = new Map()

export async function antiLink(sock, m, body) {
    if(!m.key.remoteJid.endsWith('@g.us')) return false
    if(body.includes('https://chat.whatsapp.com')) {
        const groupMetadata = await sock.groupMetadata(m.key.remoteJid)
        const isAdmin = groupMetadata.participants.find(p => p.id === m.key.participant)?.admin
        const botIsAdmin = groupMetadata.participants.find(p => p.id === sock.user.id)?.admin
        if(isAdmin) return false
        if(!botIsAdmin) return false

        await sock.sendMessage(m.key.remoteJid, { text: `⚠️ @${m.key.participant.split('@')[0]} Link detected! Deleted`, mentions: [m.key.participant] })
        await sock.sendMessage(m.key.remoteJid, { delete: m.key })
        return true
    }
    return false
}

export async function antiSpam(sock, m) {
    const id = m.key.participant || m.key.remoteJid
    if(!warnings.has(id)) warnings.set(id, { count: 0, last: Date.now() })
    const data = warnings.get(id)
    if(Date.now() - data.last < 3000) {
        data.count++
        if(data.count > 5) {
            await sock.sendMessage(m.key.remoteJid, { text: `🚫 @${id.split('@')[0]} Stop spamming! Muted 1 min`, mentions: [id] })
            // mute logic here
            data.count = 0
            return true
        }
    } else {
        data.count = 0
    }
    data.last = Date.now()
    return false
}