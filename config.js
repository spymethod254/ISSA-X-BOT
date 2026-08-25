import dotenv from 'dotenv'
try { dotenv.config() } catch {}

export default {
    ownerNumber: process.env.OWNER_NUMBER || '255xxxxxxxxx',
    ownerName: process.env.OWNER_NAME || 'GWIJITECH',
    botName: process.env.BOT_NAME || 'ISSA X ULTRA',
    prefix: process.env.PREFIX || '.',
    sessionName: process.env.SESSION_NAME || 'gwijitech',
    autoViewStatus: process.env.AUTO_VIEW_STATUS || 'true',
    autoReactStatus: process.env.AUTO_REACT_STATUS || 'true',
    autoRead: process.env.AUTO_READ || 'false',
    autoTyping: process.env.AUTO_TYPING || 'false',
    antiLink: process.env.ANTI_LINK || 'true',
    antiSpam: process.env.ANTI_SPAM || 'true',
    welcome: process.env.WELCOME || 'true',
    antiDelete: process.env.ANTI_DELETE || 'true',
    port: process.env.PORT || 3000
}
