import config from './config.js'
import makeWASocket, { useMultiFileAuthState, Browsers, DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys'
import pino from 'pino'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import NodeCache from 'node-cache'
import { antiLink, antiSpam } from './middleware/antilink.js'
import { welcomeHandler } from './events/welcome.js'
import { statusHandler } from './events/status.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const bots = new Map()
const commands = new Map()

// === RAILWAY SAFE PATH ===
const SESSIONS_DIR = process.env.SESSIONS_DIR || '/app/sessions'
const DATA_DIR = path.join(SESSIONS_DIR, '..', 'data') // separate data

if(!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true })
if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

let settings = {}
try {
    const p = path.join(DATA_DIR, 'settings.json') // NOT inside sessions
    if(fs.existsSync(p)) settings = JSON.parse(fs.readFileSync(p, 'utf8'))
} catch { settings = {} }

function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands')
    if (!fs.existsSync(commandsPath)) return
    const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))
    for (const file of files) {
        import(`./commands/${file}`).then(mod => {
            const list = mod.default ? (Array.isArray(mod.default) ? mod.default : [mod.default]) : Object.values(mod)
            for(const cmd of list) {
                if(cmd?.name) {
                    commands.set(cmd.name, cmd)
                    if(cmd.aliases) cmd.aliases.forEach(a => commands.set(a, cmd))
                }
            }
        })
    }
}
loadCommands()

export async function createBot(number) {
    const sessionPath = path.join(SESSIONS_DIR, number)
    if(!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        logger,
        browser: Browsers.macOS('Safari'),
        printQRInTerminal: false,
        msgRetryCounterCache,
        syncFullHistory: false
    })

    console.log(`Bot: ${config.botName} | Prefix: ${config.prefix} | Sessions: ${SESSIONS_DIR}/${number}`)

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect } = u
        if(connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode
            console.log(`❌ ${number} closed, code: ${code}`)
            if(code === DisconnectReason.loggedOut) {
                deleteSession(number)
            } else {
                console.log(`Reconnecting ${number} in 3s...`)
                setTimeout(() => createBot(number), 3000)
            }
        }
        if(connection === 'open') {
            console.log(`✅ ${number} connected as ${config.botName}`)
            
            if(config.welcome === 'true') welcomeHandler(sock)
            if(config.autoViewStatus === 'true') statusHandler(sock)

            // === SAFE BACKUP - FIXED ===
            try {
                await new Promise(r => setTimeout(r, 3000))
                const credsPath = path.join(sessionPath, 'creds.json')
                if(fs.existsSync(credsPath)) {
                    await sock.sendMessage(sock.user.id, {
                        image: { url: 'https://files.catbox.moe/o6jrdp.jpg' },
                        caption: `*ISSA X ULTRA CONNECTED* ✅\n\n*Number:* ${number}\n*Bot:* ${config.botName}\n*Prefix:* ${config.prefix}\n*Mode:* Multi-Session\n\nType *.menu* to start!\n\n*POWERED BY ISSA X ULTRA*`
                    })

                    await sock.sendMessage(sock.user.id, {
                        document: fs.readFileSync(credsPath),
                        mimetype: 'application/json',
                        fileName: `creds-${number}.json`,
                        caption: `*BACKUP - ${number}*\nKeep safe!`
                    })
                    console.log(`📤 Backup sent to ${number}`)
                }
            } catch(e) {
                console.log('Backup failed:', e.message)
            }
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if(!m.message || m.key.fromMe) return
        if(m.key.remoteJid === 'status@broadcast') return

        if(config.autoRead === 'true') await sock.readMessages([m.key])
        if(config.autoTyping === 'true') await sock.sendPresenceUpdate('composing', m.key.remoteJid)

        const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || ''
        
        if(m.key.remoteJid.endsWith('@g.us')) {
            const gid = m.key.remoteJid
            if(config.antiLink === 'true' && settings[gid]?.antilink !== false) {
                if(await antiLink(sock, m, body)) return
            }
            if(config.antiSpam === 'true') {
                if(await antiSpam(sock, m)) return
            }
        }

        const prefix = config.prefix
        if(!body.startsWith(prefix)) return
        const args = body.slice(1).trim().split(/ +/)
        const cmdName = args.shift().toLowerCase()
        const cmd = commands.get(cmdName)
        if(cmd) {
            try { await cmd.execute(sock, m, args, config) }
            catch(e) { console.log(`Error ${cmdName}:`, e) }
        }
    })

    bots.set(number, sock)
    return sock
}

export function getBot(n) { return bots.get(n) }
export function getAllBots() { return [...bots.keys()] }
export function deleteSession(n) {
    bots.delete(n)
    const fullPath = path.join(SESSIONS_DIR, n)
    if(fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true })
        console.log(`Deleted session: ${fullPath}`)
    }
}