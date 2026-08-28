import fs from 'fs'
const cache = new Map()

export function antiDeleteStore(m) {
  if (!m.message) return
  cache.set(m.key.id, { message: m.message, jid: m.key.remoteJid, sender: m.key.participant || m.key.remoteJid })
}

export async function antiDeleteHandler(sock) {
  sock.ev.on('messages.update', async (updates) => {
    for (const { key, update } of updates) {
      if (update.message === null) { // deleted
        const stored = cache.get(key.id)
        if (!stored) continue
        await sock.sendMessage(stored.jid, { text: `*AntiDelete* detected from @${stored.sender.split('@')[0]}`, mentions: [stored.sender] })
        await sock.sendMessage(stored.jid, { forward: stored.message })
        cache.delete(key.id)
      }
    }
  })
}