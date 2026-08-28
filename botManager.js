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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const logger = pino({ level: 'silent' })
const msgRetryCounterCache = new NodeCache()

// All currently running bots
const bots = new Map()

// All commands
const commands = new Map()

// =====================================================
// OWNER CHECK
// =====================================================

function normalizeNumber(number) {
    return String(number || '')
        .replace(/[^0-9]/g, '')
}

function getSenderJid(m) {

    const remoteJid =
        m.key?.remoteJid || ''

    const participant =
        m.key?.participant || ''

    // Group message → participant is the sender
    if (remoteJid.endsWith('@g.us') && participant) {
        return participant
    }

    // Private message → remoteJid is normally the sender
    return remoteJid
}

function getNumberFromJid(jid) {

    return normalizeNumber(
        String(jid || '')
            .split('@')[0]
            .split(':')[0]
    )
}

function isOwner(m, sock) {

    const ownerNumber =
        normalizeNumber(config.ownerNumber)

    // -----------------------------------------
    // SENDER JID
    // -----------------------------------------

    const senderJid =
        m.key?.participant ||
        m.key?.remoteJid ||
        ''

    // -----------------------------------------
    // SENDER PHONE NUMBER
    // -----------------------------------------

    const senderNumber =
        normalizeNumber(
            senderJid
                .split('@')[0]
                .split(':')[0]
        )

    // -----------------------------------------
    // BOT / SOCKET NUMBER
    // -----------------------------------------

    const botNumber =
        normalizeNumber(
            sock.user?.id
                ?.split('@')[0]
                ?.split(':')[0]
        )

    // -----------------------------------------
    // DIRECT OWNER MATCH
    // -----------------------------------------

    if (
        ownerNumber &&
        senderNumber &&
        senderNumber === ownerNumber
    ) {
        return true
    }

    // -----------------------------------------
    // PRIVATE CHAT FALLBACK
    // -----------------------------------------

    const remoteJid =
        m.key?.remoteJid || ''

    if (
        !remoteJid.endsWith('@g.us') &&
        botNumber &&
        botNumber === ownerNumber
    ) {
        return true
    }

    return false
}

// === RAILWAY SAFE PATH ===
const SESSIONS_DIR =
    process.env.SESSIONS_DIR || '/app/sessions'

const DATA_DIR = path.join(SESSIONS_DIR, '..', 'data')

if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true })
}

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
}

// === LOAD SETTINGS ===
let settings = {}

try {
    const settingsPath = path.join(DATA_DIR, 'settings.json')

    if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(
            fs.readFileSync(settingsPath, 'utf8')
        )
    }
} catch {
    settings = {}
}

// =====================================================
// LOAD COMMANDS
// =====================================================

async function loadCommands() {

    const commandsPath = path.join(
        __dirname,
        'commands'
    )

    if (!fs.existsSync(commandsPath)) {
        console.log(
            '❌ Commands folder not found:',
            commandsPath
        )
        return
    }

    const files = fs
        .readdirSync(commandsPath)
        .filter(file => file.endsWith('.js'))

    console.log(
        `📦 Loading ${files.length} command files...`
    )

    for (const file of files) {

        try {

            const mod =
                await import(
                    `./commands/${file}`
                )

            const list = mod.default
                ? (
                    Array.isArray(mod.default)
                        ? mod.default
                        : [mod.default]
                )
                : Object.values(mod)

            let loaded = 0

            for (const cmd of list) {

                if (!cmd?.name) continue

                commands.set(
                    cmd.name.toLowerCase(),
                    cmd
                )

                if (cmd.aliases) {

                    for (const alias of cmd.aliases) {

                        commands.set(
                            alias.toLowerCase(),
                            cmd
                        )
                    }
                }

                loaded++
            }

            console.log(
                `✅ Loaded ${file} (${loaded} command${loaded === 1 ? '' : 's'})`
            )

        } catch (err) {

            console.log(
                `❌ Failed loading ${file}:`,
                err.message
            )
        }
    }

    console.log(
        `🔥 Command system ready: ${commands.size} command names loaded`
    )
}

// Wait for all commands before continuing
await loadCommands()

// =====================================================
// CREATE SOCKET
// =====================================================

async function createSocket(number, pairing = false) {

    const sessionPath = path.join(
        SESSIONS_DIR,
        number
    )

    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, {
            recursive: true
        })
    }

    const { state, saveCreds } =
        await useMultiFileAuthState(sessionPath)

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(
                state.keys,
                logger
            )
        },

        logger,

        browser: Browsers.ubuntu('Chrome'),

        printQRInTerminal: false,

        msgRetryCounterCache,

        syncFullHistory: false,

        usePairingCode: pairing
    })

    // =================================================
    // SAVE CREDENTIALS
    // =================================================

    sock.ev.on(
        'creds.update',
        saveCreds
    )

    // =================================================
    // CONNECTION UPDATE
    // =================================================

    sock.ev.on(
        'connection.update',
        async update => {

            const {
                connection,
                lastDisconnect
            } = update

            // =========================================
            // CONNECTED
            // =========================================

            if (connection === 'open') {

                console.log(
                    `✅ ${number} connected as ${config.botName}`
                )

                // Pairing is finished
                if (pairing) {
                    console.log(
                        `🎉 PAIRING COMPLETED: ${number}`
                    )
                }

                if (config.welcome === 'true') {
                    welcomeHandler(sock)
                }

                if (config.autoViewStatus === 'true') {
                    statusHandler(sock)
                }

                // =====================================
                // BACKUP
                // =====================================

                try {

                    await delay(3000)

                    const credsPath = path.join(
                        sessionPath,
                        'creds.json'
                    )

                    if (fs.existsSync(credsPath)) {

                        await sock.sendMessage(
                            sock.user.id,
                            {
                                image: {
                                    url: 'https://files.catbox.moe/o6jrdp.jpg'
                                },

                                caption:
                                    `*ISSA X ULTRA CONNECTED* ✅\n\n` +
                                    `*Number:* ${number}\n` +
                                    `*Bot:* ${config.botName}\n` +
                                    `*Prefix:* ${config.prefix}\n` +
                                    `*Mode:* Multi-Session\n\n` +
                                    `Type *.menu* to start!\n\n` +
                                    `*POWERED BY ISSA X ULTRA*`
                            }
                        )

                        await sock.sendMessage(
                            sock.user.id,
                            {
                                document:
                                    fs.readFileSync(credsPath),

                                mimetype:
                                    'application/json',

                                fileName:
                                    `creds-${number}.json`,

                                caption:
                                    `*BACKUP - ${number}*\nKeep safe!`
                            }
                        )

                        console.log(
                            `📤 Backup sent to ${number}`
                        )
                    }

                } catch (e) {

                    console.log(
                        'Backup failed:',
                        e.message
                    )
                }

                return
            }

            // =========================================
            // CONNECTION CLOSED
            // =========================================

            if (connection === 'close') {

                const code =
                    lastDisconnect?.error
                        ?.output?.statusCode

                console.log(
                    `❌ ${number} closed, code: ${code}`
                )

                // Remove the dead socket
                if (bots.get(number) === sock) {
                    bots.delete(number)
                }

                // Logged out = permanently remove session
                if (
                    code ===
                    DisconnectReason.loggedOut
                ) {

                    deleteSession(number)

                    return
                }

                // Otherwise reconnect
                console.log(
                    `🔄 Reconnecting ${number} in 3s...`
                )

                setTimeout(async () => {

                    try {

                        // Don't create duplicate sockets
                        if (bots.has(number)) {
                            return
                        }

                        await createBot(number)

                    } catch (e) {

                        console.log(
                            `Reconnect failed for ${number}:`,
                            e.message
                        )
                    }

                }, 3000)
            }
        }
    )

    // =================================================
    // MESSAGES
    // =================================================
    sock.ev.on(
        'messages.upsert',
        async ({ messages }) => {

            for (const m of messages) {

    if (!m?.message) continue

    const jid = m.key.remoteJid || ''

    // =====================================
    // MESSAGE BODY
    // =====================================

    const body =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        m.message.imageMessage?.caption ||
        m.message.videoMessage?.caption ||
        m.message.documentMessage?.caption ||
        ''

// =====================================
// VIEW ONCE DETECTION
// =====================================

const viewOnceMessage =
    m.message.viewOnceMessage ||
    m.message.viewOnceMessageV2 ||
    m.message.viewOnceMessageV2Extension

if (viewOnceMessage) {

    console.log(
        `👁️ VIEW ONCE MESSAGE detected from ${jid}`
    )

    if (global.autoViewOnce) {

        console.log(
            `👁️ AUTO VIEW ONCE is ENABLED`
        )

        console.log(
            `ℹ️ View Once media detected — handling skipped to preserve WhatsApp's View Once privacy.`
        )
    }

    // Don't let a View Once media message
    // continue into normal text-command processing
    continue
}

        // =====================================
    // LOG BOT'S OWN MESSAGES (FIXED)
    // =====================================
    const isFromMe = !!m.key.fromMe

    if (isFromMe && !body.startsWith(config.prefix)) {
        continue
    }

    if (isFromMe && body.trim()) {
        console.log(`📤 BOT MESSAGE SENT to ${jid}: "${body}"`)
    }

    // =====================================
    // IGNORE WHATSAPP SYSTEM CHATS
    // =====================================

    if (jid === 'status@broadcast') {
        continue
    }

    if (jid.endsWith('@newsletter')) {
        continue
    }

    // Ignore messages that contain no usable text/caption
    if (!body.trim()) {
        continue
    }

    // =====================================
    // NOW LOG ONLY REAL MESSAGES
    // =====================================

    console.log(
        `📩 MESSAGE RECEIVED from ${jid}: "${body}"`
    )

    // =====================================
    // CHAT TYPE
    // =====================================

    const chatType =
        jid.endsWith('@g.us')
            ? 'GROUP'
            : 'PRIVATE'

    console.log(
        `💬 CHAT TYPE: ${chatType} | JID: ${jid}`
    )

                // =====================================
                // AUTO READ
                // =====================================

                if (config.autoRead === 'true') {

                    try {

                        await sock.readMessages([
                            m.key
                        ])

                    } catch (e) {

                        console.log(
                            'Auto-read failed:',
                            e.message
                        )
                    }
                }

                // =====================================
                // AUTO TYPING
                // =====================================

                if (
                    config.autoTyping === 'true' &&
                    body
                ) {

                    try {

                        await sock.sendPresenceUpdate(
                            'composing',
                            jid
                        )

                    } catch (e) {

                        console.log(
                            'Typing failed:',
                            e.message
                        )
                    }
                }

                // =====================================
                // GROUP SECURITY
                // =====================================

                if (jid.endsWith('@g.us')) {

                    const gid = jid

                    // -------------------------------
                    // ANTILINK
                    // -------------------------------

                    if (
                        config.antiLink === 'true' &&
                        settings[gid]?.antilink !== false
                    ) {

                        if (
                            await antiLink(
                                sock,
                                m,
                                body
                            )
                        ) {
                            continue
                        }
                    }

                    // -------------------------------
                    // ANTISPAM
                    // -------------------------------

                    if (config.antiSpam === 'true') {

                        if (
                            await antiSpam(
                                sock,
                                m
                            )
                        ) {
                            continue
                        }
                    }
                }

                // =====================================
                // COMMANDS
                // =====================================

                const prefix = config.prefix

                if (!body.startsWith(prefix)) {
                    continue
                }

                const args =
                    body
                        .slice(prefix.length)
                        .trim()
                        .split(/ +/)
                        .filter(Boolean)

                const cmdName =
                    args.shift()?.toLowerCase()

                const cmd =
                    commands.get(cmdName)

                console.log(
                    `🧪 COMMAND DEBUG | body="${body}" | prefix="${prefix}" | cmd="${cmdName}" | found=${!!cmd}`
                )

                if (!cmd) {
                    continue
                }

                // =====================================
                // EXECUTE COMMAND
                // =====================================

                try {

                    const owner = isOwner(m, sock)

console.log(
    `👑 OWNER CHECK | owner=${owner} | configured=${config.ownerNumber}`
)

await cmd.execute(
    sock,
    m,
    args,
    {
        ...config,
        isOwner: owner
    }
)

                } catch (e) {

                    console.log(
                        `❌ Error executing ${cmdName}:`,
                        e
                    )
                }
            }
        }
    )

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
