import config from './config.js'
import makeWASocket, { useMultiFileAuthState, Browsers, DisconnectReason } from '@whiskeysockets/baileys'
import pino from 'pino'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { antiLink, antiSpam } from './middleware/antilink.js'
import { welcomeHandler } from './events/welcome.js'
import { statusHandler } from './events/status.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const bots = new Map()
const commands = new Map()

// === SMART SESSIONS PATH - WORKS LOCAL + RAILWAY ===
const SESSIONS_DIR = process.env.SESSIONS_DIR || (fs.existsSync('/app')? '/app/sessions' : path.join(process.cwd(), 'sessions'))

let settings = {}
try {
    const settingsPath = path.join(SESSIONS_DIR, 'settings.json')
    if(fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    }
} catch { settings = {} }

// Load all commands
function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands')
    if (!fs.existsSync(commandsPath)) return
    const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))
    for (const file of files) {
        import(`./commands/${file}`).then(mod => {
            const list = mod.default? (Array.isArray(mod.default)? mod.default : [mod.default]) : Object.values(mod)
            for(const cmd of list) {
                if(cmd?.name) {
                    commands.set(cmd.name, cmd)
                    if(cmd.aliases) cmd.aliases.forEach(a => commands.set(a, cmd))
                    console.log(`Loaded: ${cmd.name}`)
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
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome'),
        printQRInTerminal: false
    })

    if(config.welcome === 'true') {
        welcomeHandler(sock)
        console.log(`✅ Welcome ON for ${number}`)
    }
    if(config.autoViewStatus === 'true') {
        statusHandler(sock)
        console.log(`✅ Auto View Status ON for ${number}`)
    }
    console.log(`Bot: ${config.botName} | Prefix: ${config.prefix} | Owner: ${config.ownerName} | Sessions: ${SESSIONS_DIR}`)

    sock.ev.on('creds.update', saveCreds)

    // === UPDATED CONNECTION WITH BACKUP ===
    sock.ev.on('connection.update', async (u) => {
        if(u.connection === 'close') {
            const code = u.lastDisconnect?.error?.output?.statusCode
            if(code === DisconnectReason.loggedOut) deleteSession(number)
            else if(code!== DisconnectReason.loggedOut) {
                console.log(`Reconnecting ${number}...`)
                setTimeout(() => createBot(number), 3000)
            }
        }
        if(u.connection === 'open') {
            console.log(`✅ ${number} connected as ${config.botName}`)

            // === SEND BACKUP TO OWN WHATSAPP INBOX ===
            try {
                await new Promise(r => setTimeout(r, 3000)) // wait 3s for creds to save

                const credsPath = path.join(sessionPath, 'creds.json')
                if(fs.existsSync(credsPath)) {
                    const credsData = fs.readFileSync(credsPath, 'utf-8')
                    const base64Session = Buffer.from(credsData).toString('base64')
                    const sessionId = `ISSA_X_ULTRA~${base64Session.slice(0, 250)}...[FULL IN FILE]`

                    // 1. Send welcome message to own inbox
                    await sock.sendMessage(sock.user.id, {
                        image: { url: 'https://files.catbox.moe/o6jrdp.jpg' },
                        caption: `*ISSA X ULTRA CONNECTED* ✅\n\n*Number:* ${number}\n*Bot:* ${config.botName}\n*Prefix:* ${config.prefix}\n*Mode:* Multi-Session\n*Server:* Railway\n\n_Your bot is now live and saved in 2 places:_\n1️⃣ Railway Volume: \`/app/sessions/${number}\`\n2️⃣ This chat (backup file below)\n\nType *.menu* to start!\n\n*POWERED BY ISSA X ULTRA*`
                    })

                    // 2. Send creds.json file backup
                    await sock.sendMessage(sock.user.id, {
                        document: fs.readFileSync(credsPath),
                        mimetype: 'application/json',
                        fileName: `creds-${number}.json`,
                        caption: `*BACKUP SESSION - ${number}*\n\nKeep this file safe!\nIf Railway volume deletes, upload it back to sessions/${number}/\n\n*POWERED BY ISSA X ULTRA*`
                    })

                    console.log(`📤 Backup sent to ${number} inbox`)
                }
            } catch (e) {
                console.log('Backup inbox failed:', e.message)
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
            if(config.antiLink === 'true') {
                if(settings[gid]?.antilink!== false) {
                    if(await antiLink(sock, m, body)) return
                }
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
            catch(e) { console.log(`Error in ${cmdName}:`, e) }
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
