import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getAllBots, getBot, deleteSession, createBot } from '../botManager.js'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SESSIONS_DIR = process.env.SESSIONS_DIR || 
  (fs.existsSync('/app') ? '/app/sessions' : path.join(__dirname, '../sessions'))

// GET /bots - list all active + saved
router.get('/', (req, res) => {
    try {
        const active = getAllBots()
        const saved = fs.existsSync(SESSIONS_DIR) 
            ? fs.readdirSync(SESSIONS_DIR).filter(f => !f.includes('.json') && fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory())
            : []

        res.json({ 
            total_active: active.length,
            total_saved: saved.length,
            active_bots: active,
            saved_sessions: saved,
            message: "Use DELETE /bots/:number to delete a session"
        })
    } catch(e) {
        res.json({ total: 0, bots: [] })
    }
})

// DELETE /bots/:number - THIS IS WHAT FIXES "Already linked" ERROR
router.delete('/:number', (req, res) => {
    const num = req.params.number.replace(/[^0-9]/g, '')
    if(!num) return res.status(400).json({ error: "Provide number" })

    try {
        deleteSession(num)
        console.log(`🗑️ Deleted session via API: ${num}`)
        return res.json({ success: true, message: `Session ${num} deleted. You can pair again now!` })
    } catch(e) {
        return res.status(500).json({ error: e.message })
    }
})

// GET /bots/:number - check status
router.get('/:number', (req, res) => {
    const num = req.params.number.replace(/[^0-9]/g, '')
    const bot = getBot(num)
    const sessionPath = path.join(SESSIONS_DIR, num)
    const exists = fs.existsSync(sessionPath)

    res.json({
        number: num,
        active: !!bot,
        saved_on_disk: exists,
        can_pair: !exists
    })
})

export default router