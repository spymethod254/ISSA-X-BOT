import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pino from 'pino'
import NodeCache from 'node-cache'
import makeWASocket, { 
  useMultiFileAuthState, 
  makeCacheableSignalKeyStore, 
  Browsers, 
  delay 
} from '@whiskeysockets/baileys'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Railway persistent path
const SESSIONS_DIR = process.env.SESSIONS_DIR || (fs.existsSync('/app') ? '/app/sessions' : path.join(__dirname, '../sessions'))
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true })

const logger = pino({ level: 'silent' })
const msgRetryCounterCache = new NodeCache()
const activeSessions = new Map() // number -> { sock, code, time }

router.all('/', async (req, res) => {
  let num = (req.query.number || req.body?.number || '').replace(/[^0-9]/g, '')
  
  if (!num || num.length < 10) {
    return res.status(400).json({ error: "Enter valid number with country code, e.g 2547xxxxxxx" })
  }

  // Anti-spam: 1 code per minute
  if (activeSessions.has(num)) {
    const old = activeSessions.get(num)
    if (Date.now() - old.time < 60000) {
      return res.json({ code: old.code, message: "Use that code! Don't request again" })
    }
  }

  const sessionDir = path.join(SESSIONS_DIR, num)

  try {
    // If old session exists and is already registered, delete it to allow re-pair
    if (fs.existsSync(sessionDir)) {
      const credsPath = path.join(sessionDir, 'creds.json')
      if (fs.existsSync(credsPath)) {
        try {
          const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'))
          if (creds.registered) {
            console.log(`♻️ Old session found for ${num}, deleting for re-pair`)
            fs.rmSync(sessionDir, { recursive: true, force: true })
          }
        } catch {}
      }
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      logger,
      printQRInTerminal: false,
      browser: Browsers.macOS("Safari"),
      msgRetryCounterCache,
      usePairingCode: true
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
      const { connection } = update
      if (connection === 'open') {
        console.log(`✅ SUCCESSFULLY PAIRED: ${num}`)
        // HERE START YOUR BOT LOGIC - load your handlers
        // await startBot(sock, num) 
        activeSessions.delete(num)
      }
      if (connection === 'close') {
        activeSessions.delete(num)
      }
    })

    await delay(3000)

    // Double check after delay
    if (state.creds.registered) {
       fs.rmSync(sessionDir, { recursive: true, force: true })
       return res.json({ error: "Number was already linked. Old session deleted, please request code again now!" })
    }

    const code = await sock.requestPairingCode(num)
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code

    console.log(`🔑 CODE FOR ${num}: ${formattedCode}`)
    activeSessions.set(num, { sock, code: formattedCode, time: Date.now() })

    // Auto-close socket after 120 seconds to save RAM
    setTimeout(() => {
      try {
        if (!sock.authState.creds.registered) {
          sock.end()
          if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true })
          console.log(`⏰ Session timeout for ${num}`)
        }
      } catch {}
      activeSessions.delete(num)
    }, 120000)

    return res.json({ code: formattedCode })

  } catch (err) {
    console.error("PAIR ERROR:", err.message)
    if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true })
    activeSessions.delete(num)
    return res.status(503).json({ error: "Failed to get code. Wait 2 minutes, update WhatsApp to latest version, then try again." })
  }
})

export default router