import express from 'express'
import { createBot, getBot } from '../botManager.js'
const router = express.Router()

router.get('/', async (req,res) => {
    let number = req.query.number?.replace(/[^0-9]/g,'')
    if(!number) return res.json({ error: 'Use /pair?number=2547XXXXXXXX' })

    try {
        let sock = getBot(number)
        if(!sock) sock = await createBot(number)

        // Wait 3s for socket to init
        await new Promise(r => setTimeout(r, 3000))

        if(sock.authState.creds.registered) {
            return res.json({ success: true, message: 'Already connected', number })
        }

        const code = await sock.requestPairingCode(number)
        res.json({ success: true, number, pairing_code: code, instruction: 'WhatsApp > Linked Devices > Link with phone number' })
    } catch(e) {
        res.json({ error: e.message })
    }
})
export default router