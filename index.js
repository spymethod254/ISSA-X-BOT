import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import pairRoute from './routes/pair.js'
import botsRoute from './routes/bots.js'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())
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
    sessionsPath: SESSIONS_DIR 
}))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`✅ ISSA X ULTRA running on ${PORT}\n📁 Sessions: ${SESSIONS_DIR}`))
