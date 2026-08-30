export default {
    name: 'presence',
    alias: ['autotyping', 'autorecord', 'typing'],
    description: 'Control fake typing/recording',

    async execute(sock, m, args, config) {
        const jid = m.key.remoteJid
        const isGroup = jid.endsWith('@g.us')
        const settings = config.settings

        if (!settings[jid]) settings[jid] = {}
        if (!settings['global']) settings['global'] = { presence: true, presenceMode: 'random' }

        const sub = args[0]?.toLowerCase() // on | off | mode
        const target = args[1]?.toLowerCase() // group | private | all
        const mode = args[2]?.toLowerCase() || args[1]?.toLowerCase() // for mode command

        const save = () => {
            // your save function - adjust to your db
            if (config.saveSettings) config.saveSettings()
        }

        //.presence on /.presence off
        if (['on', 'off', 'enable', 'disable'].includes(sub)) {
            const enable = sub === 'on' || sub === 'enable'
            const scope = target || (isGroup? 'group' : 'private')

            if (scope === 'all' || scope === 'both') {
                settings['global'].presence = enable
                // apply to all groups
                Object.keys(settings).forEach(k => {
                    if (k.endsWith('@g.us') || k === 'global') settings[k].presence = enable
                })
                await sock.sendMessage(jid, { text: `✅ Presence ${enable? 'ON' : 'OFF'} for *ALL* (groups + private)` })
            } else if (scope === 'group' || scope === 'groups') {
                if (!isGroup) return sock.sendMessage(jid, { text: '❌ Use this in a group' })
                settings[jid].presence = enable
                await sock.sendMessage(jid, { text: `✅ Presence ${enable? 'ON' : 'OFF'} for *THIS GROUP*` })
            } else if (scope === 'private' || scope === 'pm' || scope === 'inbox') {
                settings['global'].presence = enable
                await sock.sendMessage(jid, { text: `✅ Presence ${enable? 'ON' : 'OFF'} for *PRIVATE CHAT*` })
            } else {
                // current chat only
                settings[jid].presence = enable
                await sock.sendMessage(jid, { text: `✅ Presence ${enable? 'ON' : 'OFF'} for *THIS CHAT* ${isGroup? '(group)' : '(private)'}` })
            }
            save()
            return
        }

        //.presence mode typing/recording/random/both
        if (sub === 'mode') {
            if (!['typing', 'recording', 'random', 'both'].includes(mode)) {
                return sock.sendMessage(jid, { text: `❌ Invalid mode\nUse:.presence mode typing | recording | random | both` })
            }
            const scope = args[2] || 'current' // you can do.presence mode random all
            if (args[2] === 'all' || args[2] === 'both') {
                settings['global'].presenceMode = mode
                Object.keys(settings).forEach(k => settings[k].presenceMode = mode)
                await sock.sendMessage(jid, { text: `✅ Mode set to *${mode}* for ALL` })
            } else {
                settings[jid].presenceMode = mode
                await sock.sendMessage(jid, { text: `✅ Mode set to *${mode}* for THIS CHAT` })
            }
            save()
            return
        }

        // help
        return sock.sendMessage(jid, { text: `
*PRESENCE CONTROL*

*.presence on* - ON for this chat
*.presence off* - OFF for this chat

*.presence on all* - ON for groups + private
*.presence off all* - OFF for groups + private

*.presence on group* - ON for this group only
*.presence on private* - ON for private only

*.presence mode typing* - only typing
*.presence mode recording* - only recording 🎙️
*.presence mode random* - random mix (best)
*.presence mode both* - typing -> recording

*.presence mode random all* - set random for all
        `.trim() })
    }
}