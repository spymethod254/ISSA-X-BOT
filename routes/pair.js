import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pino from 'pino'
import makeWASocket, { useMultiFileAuthState, makeCacheableSignalKeyStore, Browsers, delay } from '@whiskeysockets/baileys'

const router = express.Router()
const logger = pino({ level: 'silent' })
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SESSIONS_DIR = process.env.SESSIONS_DIR || (fs.existsSync('/app') ? '/app/sessions' : path.join(__dirname, '../sessions'))

// Store active sockets so they don't die
const activeSockets = new Map()

router.all('/', async (req, res) => {
  let num = (req.query.number || req.body?.number || '').replace(/[^0-9]/g,'')
  if(!num) return res.json({error:"Enter number"})

  // If already trying, don't spam
  if(activeSockets.has(num)){
    let old = activeSockets.get(num)
    try{ old.code && res.json({code: old.code}) }catch{}
    return
  }

  try{
    const sessionPath = path.join(SESSIONS_DIR, num)
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    
    const sock = makeWASocket({
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      printQRInTerminal: false,
      logger,
      browser: Browsers.ubuntu("Chrome"),
      usePairingCode: true
    })

    sock.ev.on('creds.update', saveCreds)

    await delay(3000)

    if(state.creds.registered){
      return res.json({error:"Already linked! Delete session in /bots/list"})
    }

    const code = await sock.requestPairingCode(num)
    console.log(`✅ NEW CODE ${num}: ${code}`)
    
    activeSockets.set(num, { sock, code, time: Date.now() })
    
    // Keep socket alive for 2 minutes for you to enter code
    setTimeout(() => {
      try{ sock.end() }catch{}
      activeSockets.delete(num)
    }, 120000) // 2 mins

    sock.ev.on('connection.update', async (u) => {
      if(u.connection === 'open'){
        console.log(`🎉 ${num} LINKED SUCCESSFULLY!`)
        activeSockets.delete(num)
        // Here you can start your bot logic
      }
    })

    return res.json({ code })

  }catch(e){
    console.error(e)
    activeSockets.delete(num)
    res.json({error: e.message || "Failed, wait 5 mins"})
  }
})

export default router
