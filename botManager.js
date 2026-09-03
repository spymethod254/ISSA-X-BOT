import config from './config.js'
import makeWASocket, {
    useMultiFileAuthState,
    Browsers,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    delay
} from '@whiskeysockets/baileys'
import pino from 'pino'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import NodeCache from 'node-cache'

import { antiLink, antiSpam } from './middleware/antilink.js'
import { welcomeHandler } from './events/welcome.js'
import { statusHandler } from './events/status.js'
import { autoPresence } from './events/presence.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const logger = pino({ level: 'silent' })
const msgRetryCounterCache = new NodeCache()

const bots = new Map()
const commands = new Map()

// CACHE FOR ANTIDELETE / ANTIEDIT
const msgCache = new Map()

// =====================================================
// OWNER CHECK - FIXED VERSION
// =====================================================
function normalizeNumber(number) {
    return String(number || '').replace(/[^0-9]/g, '')
}
function getSenderJid(m) {
    const remoteJid = m.key?.remoteJid || ''
    const participant = m.key?.participant || ''
    if (remoteJid.endsWith('@g.us') && participant) return participant
    return remoteJid
}
function getNumberFromJid(jid) {
    return normalizeNumber(String(jid || '').split('@')[0].split(':')[0])
}
function isOwner(m, sock) {
    const ownerNumber = normalizeNumber(config.ownerNumber)
    if (!ownerNumber) return false
    const senderJid = getSenderJid(m)
    const senderNumber = getNumberFromJid(senderJid)
    return senderNumber === ownerNumber
}

// =====================================================
// DANGEROUS COMMANDS LIST
// =====================================================
const DANGEROUS = [
  'welcome','antispam','antidelete','autodelete',
  'kick','add','promote','demote','revoke','link','group','open','close',
  'tagall','hidetag','setpp','setppgc','setname','setdesc',
  'ban','unban','warn','resetwarn'
]
const OWNER_ONLY = [
  'autotyping','autorecord','recording',
  'autostatus','autoview','status','autostatusreact',
  'restart','shutdown','join','leave','eval','exec'
]

// === RAILWAY SAFE PATH ===
const SESSIONS_DIR = process.env.SESSIONS_DIR || '/app/sessions'
const DATA_DIR = path.join(SESSIONS_DIR, '..', 'data')
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true })
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

let settings = {}
try {
    const settingsPath = path.join(DATA_DIR, 'settings.json')
    if (fs.existsSync(settingsPath)) settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
} catch { settings = {} }

// =====================================================
// LOAD COMMANDS
// =====================================================
async function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands')
    if (!fs.existsSync(commandsPath)) {
        console.log('❌ Commands folder not found:', commandsPath)
        return
    }
    const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))
    console.log(`📦 Loading ${files.length} command files...`)
    for (const file of files) {
        try {
            const mod = await import(`./commands/${file}`)
            const list = mod.default? (Array.isArray(mod.default)? mod.default : [mod.default]) : Object.values(mod)
            let loaded = 0
            for (const cmd of list) {
                if (!cmd?.name) continue
                commands.set(cmd.name.toLowerCase(), cmd)
                if (cmd.aliases) {
                    for (const alias of cmd.aliases) commands.set(alias.toLowerCase(), cmd)
                }
                loaded++
            }
            console.log(`✅ Loaded ${file} (${loaded} commands)`)
        } catch (err) {
            console.log(`❌ Failed loading ${file}:`, err.message)
        }
    }
    console.log(`🔥 Command system ready: ${commands.size} names loaded`)
}
await loadCommands()

// =====================================================
// CREATE SOCKET
// =====================================================
async function createSocket(number, pairing = false) {
    const sessionPath = path.join(SESSIONS_DIR, number)
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true })
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

    const sock = makeWASocket({
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
        logger,
        browser: Browsers.ubuntu('Chrome'),
        printQRInTerminal: false,
        msgRetryCounterCache,
        syncFullHistory: false,
        usePairingCode: pairing
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async update => {
        const { connection, lastDisconnect } = update
        if (connection === 'open') {
            console.log(`✅ ${number} connected as ${config.botName}`)
            if (pairing) console.log(`🎉 PAIRING COMPLETED: ${number}`)
            if (config.welcome === 'true') welcomeHandler(sock)
            if (config.autoViewStatus === 'true') statusHandler(sock)
            try {
                await delay(3000)
                const credsPath = path.join(sessionPath, 'creds.json')
                if (fs.existsSync(credsPath)) {
                    await sock.sendMessage(sock.user.id, {
                        image: { url: 'https://files.catbox.moe/o6jrdp.jpg' },
                        caption: `*ɪꜱꜱᴀ x ᴜʟᴛʀᴀ ᴄᴏɴɴᴇᴄᴛᴇᴅ* ✅\n\n*Number:* ${number}\n*Bot:* ${config.botName}\n*Prefix:* ${config.prefix}\n*Mode:* Multi-Session\n\nType *.menu* to start!\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɪꜱꜱᴀ x ᴜʟᴛʀᴀ*`
                    })
                    await sock.sendMessage(sock.user.id, {
                        document: fs.readFileSync(credsPath),
                        mimetype: 'application/json',
                        fileName: `creds-${number}.json`,
                        caption: `*BACKUP - ${number}*\nKeep safe!`
                    })
                }
            } catch (e) { console.log('Backup failed:', e.message) }
            return
        }
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode
            console.log(`❌ ${number} closed, code: ${code}`)
            if (bots.get(number) === sock) bots.delete(number)
            if (code === DisconnectReason.loggedOut) { deleteSession(number); return }
            console.log(`🔄 Reconnecting ${number} in 3s...`)
            setTimeout(async () => {
                try {
                    if (bots.has(number)) return
                    await createBot(number)
                } catch (e) { console.log(`Reconnect failed for ${number}:`, e.message) }
            }, 3000)
        }
    })

    // =================================================
    // ANTIDELETE + ANTIEDIT LISTENER
    // =================================================
    sock.ev.on('messages.update', async (updates) => {
        for (const { key, update } of updates) {
            const cached = msgCache.get(key.id)
            if (!cached) continue

            // DELETED
            if (update.message === null) {
                const gid = cached.jid
                if (settings[gid]?.antidelete === true || config.antiDelete === 'true') {
                    try {
                        await sock.sendMessage(gid, {
                            text: `*🚨 ANTIDELETE*\n👤 @${cached.sender.split('@')[0]} deleted a message`,
                            mentions: [cached.sender]
                        })
                        await sock.sendMessage(gid, { forward: { key: { remoteJid: gid, id: key.id }, message: cached.message } })
                    } catch(e){}
                }
                msgCache.delete(key.id)
            }

            // EDITED
            if (update.message?.editedMessage) {
                const gid = cached.jid
                if (settings[gid]?.antiedit === true || config.antiEdit === 'true') {
                    const oldText = cached.message?.conversation || cached.message?.extendedTextMessage?.text || "[media]"
                    const edited = update.message.editedMessage.message?.protocolMessage?.editedMessage?.conversation ||
                                   update.message.editedMessage.message?.protocolMessage?.editedMessage?.extendedTextMessage?.text || "[edited media]"
                    try {
                        await sock.sendMessage(gid, {
                            text: `*✏️ ANTIEDIT*\n👤 @${cached.sender.split('@')[0]}\n*Before:* ${oldText}\n*After:* ${edited}`,
                            mentions: [cached.sender]
                        })
                    } catch(e){}
                }
            }
        }
    })

// =================================================
// MESSAGES UPSERT
// =================================================

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const m of messages) {
            if (!m?.message) continue
            const jid = m.key.remoteJid || ''

            // --- STORE FOR ANTIDELETE ---
            if (m.message &&!m.key.fromMe &&!m.message.protocolMessage) {
                msgCache.set(m.key.id, {
                    message: JSON.parse(JSON.stringify(m.message)),
                    jid: jid,
                    sender: m.key.participant || m.key.remoteJid,
                    time: Date.now()
                })
                if (msgCache.size > 1000) msgCache.delete(msgCache.keys().next().value)
            }

            const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || m.message.documentMessage?.caption || ''

            const viewOnceMessage = m.message.viewOnceMessage || m.message.viewOnceMessageV2 || m.message.viewOnceMessageV2Extension
            if (viewOnceMessage) { continue }

            const isFromMe =!!m.key.fromMe
            if (isFromMe &&!body.startsWith(config.prefix)) continue
            if (jid === 'status@broadcast' || jid.endsWith('@newsletter')) continue
            if (!body.trim()) continue

            console.log(`📩 MESSAGE from ${jid}: "${body}"`)

            if (config.autoRead === 'true') {
                try { await sock.readMessages([m.key]) } catch(e){}
            }

            // --- FAKE TYPING + RECORDING MIXER (GROUPS + PRIVATE) ---
            if (body) {
                const jSet = settings[jid] || settings['global'] || {}
                // default ON if not set yet
                const isPresenceOn = jSet.presence!== false
                // respect config.autoTyping = true as global master switch
                const masterOn = config.autoTyping === 'true' || config.autoTyping === true

                if (isPresenceOn && masterOn) {
                    await autoPresence(sock, jid, settings)
                }
            }

            if (jid.endsWith('@g.us')) {
                const gid = jid
                if (config.antiLink === 'true' && settings[gid]?.antilink!== false) {
                    if (await antiLink(sock, m, body)) continue
                }
                if (config.antiSpam === 'true') {
                    if (await antiSpam(sock, m)) continue
                }
            }

            const prefix = config.prefix
            if (!body.startsWith(prefix)) continue
            const args = body.slice(prefix.length).trim().split(/ +/).filter(Boolean)
            const cmdName = args.shift()?.toLowerCase()
            const cmd = commands.get(cmdName)
            if (!cmd) continue

            // --- PERMISSION CHECK ---
            const owner = isOwner(m, sock)
            let isAdmin = false
            if (jid.endsWith('@g.us')) {
                try {
                    const meta = await sock.groupMetadata(jid)
                    const participant = meta.participants.find(p => p.id === (m.key.participant || m.key.remoteJid))
                    isAdmin = !!participant?.admin
                } catch {}
            }

            // Owner only - typing/recording/status
            if (OWNER_ONLY.includes(cmdName) && !owner) {
                await sock.sendMessage(jid, { text: '❌ Owner only 😎' }, { quoted: m })
                continue
            }

            // Dangerous - need Admin or Owner
            if (DANGEROUS.includes(cmdName) && !owner && !isAdmin) {
                await sock.sendMessage(jid, { text: '❌ Admins / Owner only!' }, { quoted: m })
                continue
            }

            try {
                console.log(`👑 OWNER CHECK | owner=${owner} | isAdmin=${isAdmin} | cmd=${cmdName} | configured=${config.ownerNumber}`)
                // extra presence before command executes (looks more real)
                await autoPresence(sock, jid, { mode: 'random', min: 800, max: 2000 })
                await cmd.execute(sock, m, args, {...config, isOwner: owner, isAdmin, settings, saveSettings: () => {
                    try { fs.writeFileSync('/app/sessions/settings.json', JSON.stringify(settings)) } catch {}
                }})
            } catch (e) {
                console.log(`❌ Error executing ${cmdName}:`, e)
            }
        }

    })

        // =================================================
    // REGISTER SOCKET
    // =================================================

    bots.set(
        number,
        sock
    )

    console.log(
        `🤖 Socket registered: ${number}`
    )

    return {
        sock,
        state,
        sessionPath
    }
}

// =====================================================
// NORMAL BOT CREATION
// =====================================================

export async function createBot(number) {

    // Don't create duplicate socket
    if (bots.has(number)) {

        console.log(
            `⚠️ Bot already active: ${number}`
        )

        return bots.get(number)
    }

    const {
        sock
    } = await createSocket(
        number,
        false
    )

    console.log(
        `🚀 Bot created: ${number}`
    )

    return sock
}

// =====================================================
// PAIRING
// =====================================================

export async function createPairingBot(number) {

    // If already active, don't create another socket
    if (bots.has(number)) {

        throw new Error(
            'This number already has an active bot session.'
        )
    }

    const {
        sock,
        state,
        sessionPath
    } = await createSocket(
        number,
        true
    )

    // Give WhatsApp a moment to establish
    // the connection before requesting the code.
    await delay(3000)

    // Already registered?
    if (state.creds.registered) {

        try {
            sock.end(
                new Error('Already registered')
            )
        } catch {}

        bots.delete(number)

        throw new Error(
            'This number is already linked.'
        )
    }

    // Request pairing code
    const code =
        await sock.requestPairingCode(
            number
        )

    console.log(
        `🔑 PAIRING CODE FOR ${number}: ${code}`
    )

    return {
        sock,
        code,
        sessionPath
    }
}

// =====================================================
// GET BOT
// =====================================================

export function getBot(number) {
    return bots.get(number)
}

// =====================================================
// GET ALL BOTS
// =====================================================

export function getAllBots() {
    return [...bots.keys()]
}

// =====================================================
// DELETE SESSION
// =====================================================

export function deleteSession(number) {

    const bot = bots.get(number)

    if (bot) {

        try {
            bot.end(
                new Error('Session deleted')
            )
        } catch {}

        bots.delete(number)
    }

    const fullPath =
        path.join(
            SESSIONS_DIR,
            number
        )

    if (fs.existsSync(fullPath)) {

        fs.rmSync(
            fullPath,
            {
                recursive: true,
                force: true
            }
        )

        console.log(
            `🗑️ Deleted session: ${fullPath}`
        )
    }
}
