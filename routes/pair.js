import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pino from 'pino'
import makeWASocket, { useMultiFileAuthState, makeCacheableSignalKeyStore, Browsers } from '@whiskeysockets/baileys'

const router = express.Router()
const logger = pino({ level: 'silent' })
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SESSIONS_DIR = process.env.SESSIONS_DIR || (fs.existsSync('/app') ? '/app/sessions' : path.join(__dirname, '../sessions'))

router.all('/', async (req, res) => {
  let num = (req.query.number || req.body?.number || '').replace(/[^0-9]/g,'')
  console.log("Pair req:", num)
  if(!num) return res.json({error:"Enter number"})

  try{
    const { state, saveCreds } = await useMultiFileAuthState(path.join(SESSIONS_DIR, num))
    const sock = makeWASocket({
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      printQRInTerminal: false,
      logger,
      browser: Browsers.ubuntu("Chrome"),
      usePairingCode: true
    })
    sock.ev.on('creds.update', saveCreds)
    await new Promise(r=>setTimeout(r,3000))
    const code = await sock.requestPairingCode(num)
    console.log(`✅ ${num} => ${code}`)
    res.json({ code })
  }catch(e){
    console.log(e)
    res.json({error: e.message})
  }
})
export default router