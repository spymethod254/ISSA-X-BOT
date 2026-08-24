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

// Make sure sessions folder exists (for volume)
if (!fs.existsSync('/app/sessions')) {
    fs.mkdirSync('/app/sessions', { recursive: true })
    console.log('Created /app/sessions folder')
}

app.use('/pair', pairRoute)
app.use('/bots', botsRoute)

app.get('/', (req,res) => res.sendFile(path.join(__dirname, 'public/index.html')))
app.get('/health', (req,res) => res.json({ status: 'ok', uptime: process.uptime() }))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`✅ GWIJITECH MD running on ${PORT}`))
