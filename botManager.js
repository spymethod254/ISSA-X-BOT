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


/* =========================================================
   PATHS
========================================================= */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


// Railway persistent sessions
const SESSIONS_DIR =
    process.env.SESSIONS_DIR ||
    '/app/sessions'


// Separate data directory
const DATA_DIR =
    path.join(SESSIONS_DIR, '..', 'data')


if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, {
        recursive: true
    })
}

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
        recursive: true
    })
}


/* =========================================================
   LOGGER / CACHE
========================================================= */

const logger =
    pino({
        level: 'silent'
    })


const msgRetryCounterCache =
    new NodeCache()


/* =========================================================
   BOT STORAGE
========================================================= */

// number -> socket
const bots = new Map()


// command name -> command
const commands = new Map()


// number -> pairing information
const pairingSockets = new Map()


/* =========================================================
   SETTINGS
========================================================= */

let settings = {}

try {

    const settingsPath =
        path.join(
            DATA_DIR,
            'settings.json'
        )

    if (fs.existsSync(settingsPath)) {

        settings =
            JSON.parse(
                fs.readFileSync(
                    settingsPath,
                    'utf8'
                )
            )
    }

} catch {

    settings = {}

}


/* =========================================================
   LOAD COMMANDS
========================================================= */

function loadCommands() {

    const commandsPath =
        path.join(
            __dirname,
            'commands'
        )

    if (!fs.existsSync(commandsPath)) {
        return
    }


    const files =
        fs.readdirSync(
            commandsPath
        )
        .filter(
            file => file.endsWith('.js')
        )


    for (const file of files) {

        import(`./commands/${file}`)
            .then(mod => {

                const list =
                    mod.default
                        ? (
                            Array.isArray(mod.default)
                                ? mod.default
                                : [mod.default]
                        )
                        : Object.values(mod)


                for (const cmd of list) {

                    if (!cmd?.name) {
                        continue
                    }


                    commands.set(
                        cmd.name,
                        cmd
                    )


                    if (cmd.aliases) {

                        cmd.aliases.forEach(alias => {

                            commands.set(
                                alias,
                                cmd
                            )

                        })

                    }

                }

            })
            .catch(err => {

                console.log(
                    `❌ Failed loading command ${file}:`,
                    err.message
                )

            })

    }

}

loadCommands()


/* =========================================================
   GET SESSION PATH
========================================================= */

function getSessionPath(number) {

    return path.join(
        SESSIONS_DIR,
        number
    )

}


/* =========================================================
   START BOT EVENTS
========================================================= */

function attachBotHandlers(sock, number) {

    /* -----------------------------------------------------
       CREDENTIALS
    ----------------------------------------------------- */

    sock.ev.on(
        'creds.update',
        sock.__saveCreds
    )


    /* -----------------------------------------------------
       CONNECTION
    ----------------------------------------------------- */

    sock.ev.on(
        'connection.update',
        async update => {

            const {
                connection,
                lastDisconnect
            } = update


            /* =============================================
               CONNECTED
            ============================================= */

            if (connection === 'open') {

                console.log(
                    `✅ ${number} connected as ${config.botName}`
                )


                // Remove pairing lock
                pairingSockets.delete(number)


                // Register active bot
                bots.set(
                    number,
                    sock
                )


                /* -----------------------------------------
                   EVENTS
                ----------------------------------------- */

                try {

                    if (
                        config.welcome === 'true'
                    ) {

                        welcomeHandler(sock)

                    }


                    if (
                        config.autoViewStatus === 'true'
                    ) {

                        statusHandler(sock)

                    }

                } catch (e) {

                    console.log(
                        `⚠️ Event handler error for ${number}:`,
                        e.message
                    )

                }


                /* -----------------------------------------
                   BACKUP
                ----------------------------------------- */

                try {

                    await delay(3000)


                    const sessionPath =
                        getSessionPath(number)


                    const credsPath =
                        path.join(
                            sessionPath,
                            'creds.json'
                        )


                    if (
                        fs.existsSync(credsPath)
                    ) {

                        await sock.sendMessage(
                            sock.user.id,
                            {
                                image: {
                                    url:
                                        'https://files.catbox.moe/o6jrdp.jpg'
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
                                    fs.readFileSync(
                                        credsPath
                                    ),

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
                        `⚠️ Backup failed for ${number}:`,
                        e.message
                    )

                }

            }


            /* =============================================
               CONNECTION CLOSED
            ============================================= */

            if (connection === 'close') {

                const code =
                    lastDisconnect
                        ?.error
                        ?.output
                        ?.statusCode


                console.log(
                    `❌ ${number} closed, code: ${code}`
                )


                bots.delete(
                    number
                )


                pairingSockets.delete(
                    number
                )


                /* -----------------------------------------
                   LOGGED OUT
                   
                   IMPORTANT:
                   Do NOT automatically delete the
                   persistent session.
                   ----------------------------------------- */

                if (
                    code === DisconnectReason.loggedOut
                ) {

                    console.log(
                        `⚠️ ${number} was logged out. Session preserved.`
                    )

                    console.log(
                        `🗑️ To intentionally delete it use DELETE /bots/${number}`
                    )

                    return
                }


                /* -----------------------------------------
                   OTHER DISCONNECTS
                ----------------------------------------- */

                console.log(
                    `🔄 Reconnecting ${number} in 5s...`
                )


                setTimeout(
                    () => {

                        createBot(number)
                            .catch(err => {

                                console.log(
                                    `❌ Reconnect failed for ${number}:`,
                                    err.message
                                )

                            })

                    },
                    5000
                )

            }

        }
    )


    /* -----------------------------------------------------
       MESSAGES
    ----------------------------------------------------- */

    sock.ev.on(
        'messages.upsert',
        async ({
            messages
        }) => {

            try {

                const m =
                    messages[0]


                if (
                    !m?.message ||
                    m.key?.fromMe
                ) {

                    return

                }


                if (
                    m.key?.remoteJid ===
                    'status@broadcast'
                ) {

                    return

                }


                /* -----------------------------------------
                   AUTO READ
                ----------------------------------------- */

                if (
                    config.autoRead === 'true'
                ) {

                    await sock.readMessages([
                        m.key
                    ])

                }


                /* -----------------------------------------
                   AUTO TYPING
                ----------------------------------------- */

                if (
                    config.autoTyping === 'true'
                ) {

                    await sock.sendPresenceUpdate(
                        'composing',
                        m.key.remoteJid
                    )

                }


                /* -----------------------------------------
                   MESSAGE BODY
                ----------------------------------------- */

                const body =
                    m.message.conversation ||
                    m.message.extendedTextMessage?.text ||
                    m.message.imageMessage?.caption ||
                    ''


                if (!body) {
                    return
                }


                /* -----------------------------------------
                   GROUP SECURITY
                ----------------------------------------- */

                if (
                    m.key.remoteJid?.endsWith('@g.us')
                ) {

                    const gid =
                        m.key.remoteJid


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

                            return

                        }

                    }


                    if (
                        config.antiSpam === 'true'
                    ) {

                        if (
                            await antiSpam(
                                sock,
                                m
                            )
                        ) {

                            return

                        }

                    }

                }


                /* -----------------------------------------
                   COMMAND PREFIX
                ----------------------------------------- */

                const prefix =
                    config.prefix


                if (
                    !body.startsWith(prefix)
                ) {

                    return

                }


                const args =
                    body
                        .slice(prefix.length)
                        .trim()
                        .split(/ +/)


                const cmdName =
                    args
                        .shift()
                        ?.toLowerCase()


                if (!cmdName) {
                    return
                }


                const cmd =
                    commands.get(
                        cmdName
                    )


                if (!cmd) {
                    return
                }


                try {

                    await cmd.execute(
                        sock,
                        m,
                        args,
                        config
                    )

                } catch (e) {

                    console.log(
                        `❌ Error executing ${cmdName} on ${number}:`,
                        e
                    )

                }

            } catch (e) {

                console.log(
                    `❌ Message handler error for ${number}:`,
                    e.message
                )

            }

        }
    )

}


/* =========================================================
   CREATE NORMAL BOT
========================================================= */

export async function createBot(number) {

    const sessionPath =
        getSessionPath(number)


    if (!fs.existsSync(sessionPath)) {

        fs.mkdirSync(
            sessionPath,
            {
                recursive: true
            }
        )

    }


    const {
        state,
        saveCreds
    } =
        await useMultiFileAuthState(
            sessionPath
        )


    /* -----------------------------------------
       Don't start an already active bot
    ----------------------------------------- */

    const existing =
        bots.get(number)


    if (existing) {

        console.log(
            `⚠️ ${number} is already active`
        )

        return existing

    }


    const sock =
        makeWASocket({

            auth: {

                creds:
                    state.creds,

                keys:
                    makeCacheableSignalKeyStore(
                        state.keys,
                        logger
                    )

            },

            logger,

            browser:
                Browsers.macOS('Safari'),

            printQRInTerminal:
                false,

            msgRetryCounterCache,

            syncFullHistory:
                false

        })


    // Save credentials
    sock.__saveCreds =
        saveCreds


    console.log(
        `🤖 Socket registered: ${number}`
    )


    attachBotHandlers(
        sock,
        number
    )


    bots.set(
        number,
        sock
    )


    console.log(
        `🚀 Bot created: ${number}`
    )


    return sock

}


/* =========================================================
   CREATE PAIRING BOT
========================================================= */

export async function createPairingBot(number) {

    const sessionPath =
        getSessionPath(number)


    if (!fs.existsSync(sessionPath)) {

        fs.mkdirSync(
            sessionPath,
            {
                recursive: true
            }
        )

    }


    /* -----------------------------------------
       Don't create duplicate socket
    ----------------------------------------- */

    const existingBot =
        bots.get(number)


    if (existingBot) {

        throw new Error(
            'This number already has an active bot session.'
        )

    }


    const existingPair =
        pairingSockets.get(number)


    if (existingPair) {

        return {
            sock: existingPair.sock,
            code: existingPair.code
        }

    }


    const {
        state,
        saveCreds
    } =
        await useMultiFileAuthState(
            sessionPath
        )


    /* -----------------------------------------
       Existing registered credentials
    ----------------------------------------- */

    if (
        state.creds.registered
    ) {

        throw new Error(
            'This number already has a saved WhatsApp session.'
        )

    }


    const sock =
        makeWASocket({

            auth: {

                creds:
                    state.creds,

                keys:
                    makeCacheableSignalKeyStore(
                        state.keys,
                        logger
                    )

            },

            logger,

            browser:
                Browsers.macOS('Safari'),

            printQRInTerminal:
                false,

            msgRetryCounterCache,

            syncFullHistory:
                false,

            // Pairing-code mode
            markOnlineOnConnect:
                false

        })


    sock.__saveCreds =
        saveCreds


    /* -----------------------------------------
       Save credentials immediately
    ----------------------------------------- */

    sock.ev.on(
        'creds.update',
        saveCreds
    )


    /* -----------------------------------------
       Connection events
    ----------------------------------------- */

    sock.ev.on(
        'connection.update',
        async update => {

            const {
                connection,
                lastDisconnect
            } = update


            if (
                connection === 'open'
            ) {

                console.log(
                    `🎉 PAIRING COMPLETED: ${number}`
                )


                console.log(
                    `✅ ${number} connected as ${config.botName}`
                )


                // Move into active bot map
                bots.set(
                    number,
                    sock
                )

