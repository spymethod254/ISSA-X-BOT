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

const SESSIONS_DIR =
    process.env.SESSIONS_DIR ||
    (
        fs.existsSync('/app')
            ? '/app/sessions'
            : path.join(__dirname, '../sessions')
    )

if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(
        SESSIONS_DIR,
        {
            recursive: true
        }
    )
}


// number -> { code, time }
const activePairings = new Map()


router.all('/', async (req, res) => {

    const number =
        (
            req.query.number ||
            req.body?.number ||
            ''
        )
        .replace(/[^0-9]/g, '')


    // =====================================================
    // VALIDATE NUMBER
    // =====================================================

    if (!number || number.length < 10) {

        return res.status(400).json({
            error:
                'Enter valid number with country code, e.g 2547xxxxxxx'
        })
    }


    // =====================================================
    // EXISTING ACTIVE BOT
    // =====================================================

    if (getBot(number)) {

        return res.status(409).json({
            error:
                'This number already has an active bot session.'
        })
    }


    // =====================================================
    // EXISTING PAIRING CODE
    // =====================================================

    const existing =
        activePairings.get(number)


    if (existing) {

        if (
            Date.now() - existing.time <
            120000
        ) {

            return res.json({
                code: existing.code,
                message:
                    "Use that code! Don't request again."
            })
        }

        activePairings.delete(number)
    }


    // =====================================================
    // EXISTING SAVED SESSION
    // =====================================================

    const sessionDir =
        path.join(
            SESSIONS_DIR,
            number
        )


    if (fs.existsSync(sessionDir)) {

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
                            'This number already has a saved WhatsApp session. Delete the old session first.'
                    })
                }

            } catch {}

        }
    }


    // =====================================================
    // CREATE PAIRING SOCKET
    // =====================================================

    try {

        console.log(
            `🔐 Starting pairing for ${number}...`
        )


        const {
            sock,
            code
        } =
            await createPairingBot(
                number
            )


        const formattedCode =
            code
                ?.match(/.{1,4}/g)
                ?.join('-') ||
            code


        console.log(
            `🔑 PAIRING CODE FOR ${number}: ${formattedCode}`
        )


        activePairings.set(
            number,
            {
                sock,
                code: formattedCode,
                time: Date.now()
            }
        )


        // =================================================
        // PAIRING COMPLETED
        // =================================================

        const checkConnection =
            () => {

                const session =
                    activePairings.get(
                        number
                    )


                if (!session) {
                    return
                }


                if (
                    sock.authState?.creds?.registered
                ) {

                    activePairings.delete(
                        number
                    )

                    console.log(
                        `✅ Pairing completed for ${number}`
                    )
                }
            }


        sock.ev.on(
            'connection.update',
            checkConnection
        )


        // =================================================
        // 120 SECOND TIMEOUT
        // =================================================

        setTimeout(
            () => {

                const session =
                    activePairings.get(
                        number
                    )


                if (!session) {
                    return
                }


                activePairings.delete(
                    number
                )


                try {

                    if (
                        !sock.authState?.creds?.registered
                    ) {

                        sock.end(
                            new Error(
                                'Pairing timeout'
                            )
                        )

                        console.log(
                            `⏰ Pairing timeout for ${number}`
                        )

                    }

                } catch {}

            },
            120000
        )


        return res.json({
            code: formattedCode,
            message:
                'Pairing code generated successfully.'
        })


    } catch (err) {

        console.error(
            `❌ PAIR ERROR FOR ${number}:`,
            err
        )


        activePairings.delete(
            number
        )


        return res.status(503).json({
            error:
                err.message ||
                'Failed to generate pairing code.'
        })

    }

})


export default router