import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import pairRoute from './routes/pair.js'
import botsRoute from './routes/bots.js'
import { createBot } from './botManager.js' // <--- YOU MISSED THIS

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

// === SMART SESSIONS PATH ===
const SESSIONS_DIR = process.env.SESSIONS_DIR || 
  (fs.existsSync('/app') ? '/app/sessions' : path.join(__dirname, 'sessions'))

if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true })
    console.log(`Created sessions folder at: ${SESSIONS_DIR}`)
}

app.use('/pair', pairRoute)
app.use('/bots', botsRoute)

app.get('/', (req,res) => res.sendFile(path.join(__dirname, 'public/index.html')))
app.get('/health', (req,res) => res.json({ 
    status: 'ok', 
    uptime: process.uptime(),
    sessionsPath: SESSIONS_DIR,
    activeBots: fs.readdirSync(SESSIONS_DIR).filter(f => !f.includes('.json')).length
}))

const PORT = process.env.PORT || 3000
app.listen(PORT, async () => {
    console.log(`✅ ISSA X ULTRA running on ${PORT}`)
    console.log(`📁 Sessions: ${SESSIONS_DIR}`)

    // === AUTO LOAD ALL SAVED BOTS ON STARTUP - THIS FIXES PAIRING FAIL ===
    try {
        const folders = fs.readdirSync(SESSIONS_DIR)
        for (const folder of folders) {
            if (folder.includes('.json')) continue // skip settings.json
            const fullPath = path.join(SESSIONS_DIR, folder)
            const credsPath = path.join(fullPath, 'creds.json')
            
            if (fs.statSync(fullPath).isDirectory() && fs.existsSync(credsPath)) {
                console.log(`🔄 Restoring bot: ${folder}`)
                await createBot(folder)
                await new Promise(r => setTimeout(r, 2000)) // avoid spam
            }
        }
        console.log(`✅ Restored ${folders.length} sessions`)
    } catch (e) {
        console.log("No sessions to restore:", e.message)
    }
})