import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import {
    createPairingBot,
    getBot
} from '../botManager.js'

const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Railway persistent path
const SESSIONS_DIR =
    process.env.SESSIONS_DIR ||
    (
        fs.existsSync('/app')
            ? '/app/sessions'
            : path.join(__dirname, '../sessions')
    )

if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, {
        recursive: true
    })
}

// Keep track of pairing requests.
// number -> { code, time }
const pairingSessions = new Map()

// =====================================================
// GET /pair
// POST /pair
// =====================================================

router.all('/', async (req, res) => {

    let num =
        (
            req.query.number ||
            req.body?.number ||
            ''
        )
        .replace(/[^0-9]/g, '')

    // =================================================
    // VALIDATE NUMBER
    // =================================================

    if (!num || num.length < 10) {

        return res.status(400).json({
            error:
                'Enter valid number with country code, e.g 2547xxxxxxx'
        })
    }

    // =================================================
    // DON'T CREATE DUPLICATE PAIRING REQUESTS
    // =================================================

    const existingPair =
        pairingSessions.get(num)

    if (existingPair) {

        const age =
            Date.now() - existingPair.time

        // Keep existing code for 60 seconds
        if (age < 60000) {

            return res.json({
                code: existingPair.code,
                message:
                    "Use the existing code. Don't request another one."
            })
        }

        pairingSessions.delete(num)
    }

    // =================================================
    // CHECK IF BOT IS ALREADY ACTIVE
    // =================================================

    const existingBot =
        getBot(num)

    if (existingBot) {

        return res.status(409).json({
            error:
                'This number already has an active bot session.',
            number: num
        })
    }

    // =================================================
    // CHECK SAVED SESSION
    // =================================================

    const sessionDir =
        path.join(
            SESSIONS_DIR,
            num
        )

    const credsPath =
        path.join(
            sessionDir,
            'creds.json'
        )

    if (fs.existsSync(credsPath)) {

        try {

            const creds =
                JSON.parse(
                    fs.readFileSync(
                        credsPath,
                        'utf8'
                    )
                )

            if (creds.registered) {

                return res.status(409).json({
                    error:
                        'This number already has a saved WhatsApp session.',
                    message:
                        'Delete the existing session from /bots/:number before pairing again.',
                    number: num
                })
            }

        } catch (e) {

            console.log(
                `⚠️ Could not read credentials for ${num}:`,
                e.message
            )
        }
    }

    // =================================================
    // CREATE PAIRING BOT
    // =================================================

    try {

        console.log(
            `🔐 Starting pairing for ${num}...`
        )

        const {
            code
        } = await createPairingBot(num)

        const formattedCode =
            code
                ?.match(/.{1,4}/g)
                ?.join('-') ||
            code

        console.log(
            `🔑 CODE FOR ${num}: ${formattedCode}`
        )

        pairingSessions.set(
            num,
            {
                code: formattedCode,
                time: Date.now()
            }
        )

        // =================================================
        // REMOVE PAIRING LOCK AFTER 2 MINUTES
        // =================================================

        setTimeout(() => {

            const current =
                pairingSessions.get(num)

            if (
                current &&
                current.code === formattedCode
            ) {

                pairingSessions.delete(num)

                console.log(
                    `⏰ Pairing request expired: ${num}`
                )
            }

        }, 120000)

        return res.json({
            success: true,
            code: formattedCode,
            number: num,
            message:
                'Enter this code in WhatsApp → Linked Devices → Link a device → Link with phone number.'
        })

    } catch (err) {

        console.error(
            `❌ PAIR ERROR FOR ${num}:`,
            err
        )

        pairingSessions.delete(num)

        return res.status(503).json({
            error:
                err.message ||
                'Failed to generate pairing code.',
            message:
                'Wait a moment and try again.'
        })
    }
})

export default router