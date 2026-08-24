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
let settings = {}

try {
    if(fs.existsSync('/app/sessions/settings.json')) {
        settings = JSON.parse(fs.readFileSync('/app/sessions/settings.json', 'utf8'))
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
    const sessionPath = `/app/sessions/${number}`
    if(!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome'),
        printQRInTerminal: false
    })

    // Activate all features
    welcomeHandler(sock)
    statusHandler(sock)
    console.log(`Features enabled for ${number}: welcome, anti-link, status view`)

    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (u) => {
        if(u.connection === 'close') {
            const code = u.lastDisconnect?.error?.output?.statusCode
            if(code === DisconnectReason.loggedOut) deleteSession(number)
            else if(code!== DisconnectReason.loggedOut) {
                console.log(`Reconnecting ${number}...`)
                setTimeout(() => createBot(number), 3000)
            }
        }
        if(u.connection === 'open') console.log(`✅ ${number} connected`)
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if(!m.message || m.key.fromMe) return

        // Ignore status
        if(m.key.remoteJid === 'status@broadcast') return

        const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || ''

        // ANTI-FEATURES CHECK (only in groups)
        if(m.key.remoteJid.endsWith('@g.us')) {
            const gid = m.key.remoteJid
            if(settings[gid]?.antilink!== false) {
                if(await antiLink(sock, m, body)) return
            }
            if(await antiSpam(sock, m)) return
        }

        const prefix = '.'
        if(!body.startsWith(prefix)) return

        const args = body.slice(1).trim().split(/ +/)
        const cmdName = args.shift().toLowerCase()
        const cmd = commands.get(cmdName)
        if(cmd) {
            try { await cmd.execute(sock, m, args) }
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
    fs.rmSync(`/app/sessions/${n}`, { recursive: true, force: true })
}