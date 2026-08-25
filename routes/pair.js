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

const sessions = new Map() // number -> { sock, code }

router.all('/', async (req, res) => {
  let num = (req.query.number || req.body?.number || '').replace(/[^0-9]/g,'')
  if(!num) return res.json({error:"Enter number e.g 2547xxxxxxx"})

  // Prevent spam
  if(sessions.has(num)){
    const old = sessions.get(num)
    if(Date.now() - old.time < 60000){
      return res.json({ code: old.code, message: "Use this code, don't request again!" })
    }
  }

  try{
    const dir = path.join(SESSIONS_DIR, num)
    if(fs.existsSync(dir)) fs.rmSync(dir, {recursive:true, force:true})

    const { state, saveCreds } = await useMultiFileAuthState(dir)
    const sock = makeWASocket({
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      printQRInTerminal: false,
      logger,
      browser: Browsers.macOS("Chrome"),
      usePairingCode: true
    })

    sock.ev.on('creds.update', saveCreds)
    
    sock.ev.on('connection.update', async (u)=>{
      const { connection } = u
      if(connection === 'open'){
        console.log(`✅ ${num} PAIRED SUCCESS`)
        sessions.delete(num)
        // Start your bot here
      }
      if(connection === 'close'){
        sessions.delete(num)
      }
    })

    await delay(3500)

    if(state.creds.registered){
      return res.json({error:"Number already linked, delete session first"})
    }

    const code = await sock.requestPairingCode(num)
    console.log(`🔑 CODE FOR ${num}: ${code}`)
    
    sessions.set(num, { sock, code, time: Date.now() })

    // Keep alive for 90s
    setTimeout(()=>{ 
      try{ if(!sock.authState.creds.registered) sock.end() }catch{}
      sessions.delete(num)
    }, 90000)

    return res.json({ code })

  }catch(e){
    console.error("PAIR ERROR:", e.message)
    sessions.delete(num)
    return res.json({error:"Failed. Wait 3 mins, update WhatsApp, try again. Don't spam!"})
  }
})

export default router