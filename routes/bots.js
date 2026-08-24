import express from 'express'
import { getAllBots } from '../botManager.js'
const router = express.Router()

router.get('/', (req,res) => {
    res.json({ total: getAllBots().length, bots: getAllBots() })
})
export default router