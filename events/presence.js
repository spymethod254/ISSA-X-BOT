/**
 * Presence Manager - ISSA X ULTRA
 */

export async function autoPresence(sock, jid, settings = {}, modeOverride = null) {
    const isGroup = jid.endsWith('@g.us')
    const id = jid

    // check if disabled
    const conf = settings[id] || settings['global'] || {}
    if (conf.presence === false) return // completely off

    let mode = modeOverride || conf.presenceMode || 'random' // typing | recording | random | both
    const min = 1000
    const max = 3000
    const duration = Math.floor(Math.random() * (max - min) + min)

    try {
        if (mode === 'typing') {
            await sock.sendPresenceUpdate('composing', jid)
            await new Promise(r => setTimeout(r, duration))
        } else if (mode === 'recording') {
            await sock.sendPresenceUpdate('recording', jid)
            await new Promise(r => setTimeout(r, duration))
        } else if (mode === 'random') {
            const type = Math.random() > 0.5? 'composing' : 'recording'
            await sock.sendPresenceUpdate(type, jid)
            await new Promise(r => setTimeout(r, duration))
        } else if (mode === 'both') {
            await sock.sendPresenceUpdate('composing', jid)
            await new Promise(r => setTimeout(r, duration / 2))
            await sock.sendPresenceUpdate('recording', jid)
            await new Promise(r => setTimeout(r, duration / 2))
        }
        await sock.sendPresenceUpdate('paused', jid)
    } catch {}
}
