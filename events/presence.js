/**
 * Auto presence - typing + recording mixer
 * POWERED BY ISSA X ULTRA
 */

export async function autoPresence(sock, jid, options = {}) {
    const {
        min = 1200,
        max = 3500,
        mode = 'random' // typing | recording | random | both
    } = options

    const duration = Math.floor(Math.random() * (max - min) + min)
    let presenceType = 'composing'

    if (mode === 'typing') presenceType = 'composing'
    else if (mode === 'recording') presenceType = 'recording'
    else if (mode === 'random') presenceType = Math.random() > 0.5 ? 'composing' : 'recording'
    else if (mode === 'both') {
        try {
            await sock.sendPresenceUpdate('composing', jid)
            await new Promise(r => setTimeout(r, duration / 2))
            await sock.sendPresenceUpdate('recording', jid)
            await new Promise(r => setTimeout(r, duration / 2))
        } catch {}
        try { await sock.sendPresenceUpdate('paused', jid) } catch {}
        return
    }

    try {
        await sock.sendPresenceUpdate(presenceType, jid)
        await new Promise(r => setTimeout(r, duration))
        await sock.sendPresenceUpdate('paused', jid)
    } catch {}
}

export const fakeTyping = (sock, jid, ms) => autoPresence(sock, jid, { mode: 'typing', min: ms || 1200, max: ms || 3000 })
export const fakeRecording = (sock, jid, ms) => autoPresence(sock, jid, { mode: 'recording', min: ms || 1200, max: ms || 3000 })
export const fakeRandom = (sock, jid) => autoPresence(sock, jid, { mode: 'random' })