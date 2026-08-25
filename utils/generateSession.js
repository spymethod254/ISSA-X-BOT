import fs from 'fs'

export function getSessionId(sessionPath) {
    try {
        const creds = fs.readFileSync(sessionPath, 'utf-8')
        const base64 = Buffer.from(creds).toString('base64')
        return `ISSA_X_ULTRA~${base64}`
    } catch {
        return null
    }
}