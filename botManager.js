import makeWASocket, { useMultiFileAuthState, Browsers, DisconnectReason } from '@whiskeysockets/baileys'
import pino from 'pino'
import fs from 'fs'

const bots = new Map()

export async function createBot(number) {
    const sessionPath = `sessions/${number}`
    if(!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome'),
        printQRInTerminal: false
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (u) => {
        if(u.connection === 'close') {
            const code = u.lastDisconnect?.error?.output?.statusCode
            if(code === DisconnectReason.loggedOut) {
                console.log(`❌ ${number} logged out`)
                deleteSession(number)
            }
        }
        if(u.connection === 'open') console.log(`✅ ${number} connected`)
    })

    // Your commands here
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if(!m.message || m.key.fromMe) return
        const body = m.message.conversation || m.message.extendedTextMessage?.text || ''
        if(body === '.ping') await sock.sendMessage(m.key.remoteJid, { text: 'Pong! GWIJITECH MD' })
        if(body === '.menu') await sock.sendMessage(m.key.remoteJid, { text: '*GWIJITECH MD MENU*\n.ping\n.menu' })
    })

    bots.set(number, sock)
    return sock
}

export function getBot(number) { return bots.get(number) }
export function getAllBots() { return [...bots.keys()] }
export function deleteSession(number) {
    bots.delete(number)
    fs.rmSync(`sessions/${number}`, { recursive: true, force: true })
}