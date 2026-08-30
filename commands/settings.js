import fs from 'fs'
let settings = {}
try { settings = JSON.parse(fs.readFileSync('/app/sessions/settings.json')) } catch { settings = {} }

function save() { fs.writeFileSync('/app/sessions/settings.json', JSON.stringify(settings)) }

export default [
{
 name: 'antilink', execute: async (sock,m,args) => {
   const gid = m.key.remoteJid
   if(!settings[gid]) settings[gid] = {}
   if(args[0]==='on') { settings[gid].antilink = true; save(); await sock.sendMessage(gid, {text:'✅ Anti-link ON'}, {quoted:m}) }
   else if(args[0]==='off') { settings[gid].antilink = false; save(); await sock.sendMessage(gid, {text:'❌ Anti-link OFF'}, {quoted:m}) }
   else await sock.sendMessage(gid, {text:`Antilink: ${settings[gid].antilink?'ON':'OFF'}\nUse.antilink on/off`}, {quoted:m})
 }
},
{
 name: 'welcome', execute: async (sock,m,args) => {
   const gid = m.key.remoteJid
   if(!settings[gid]) settings[gid] = {}
   if(args[0]==='on') { settings[gid].welcome = true; save(); await sock.sendMessage(gid, {text:'✅ Welcome ON'}, {quoted:m}) }
   else if(args[0]==='off') { settings[gid].welcome = false; save(); await sock.sendMessage(gid, {text:'❌ Welcome OFF'}, {quoted:m}) }
   else await sock.sendMessage(gid, {text:`Welcome: ${settings[gid].welcome?'ON':'OFF'}`}, {quoted:m})
 }
},
{
 name: 'autostatus', aliases: ['autoview'], execute: async (sock,m,args) => {
   await sock.sendMessage(m.key.remoteJid, {text:`✅ Auto Status View is always ON in this version\nBot will view & react to all statuses`}, {quoted:m})
 }
},
{
 name: 'presence',
 aliases: ['autotyping', 'autorecord', 'typing'],
 execute: async (sock,m,args) => {
   const jid = m.key.remoteJid
   const isGroup = jid.endsWith('@g.us')
   if(!settings[jid]) settings[jid] = {}
   if(!settings['global']) settings['global'] = {}

   const action = args[0]?.toLowerCase() // on/off/mode
   const scope = args[1]?.toLowerCase() // all/group/private/modeName
   const modeArg = args[2]?.toLowerCase() || args[1]?.toLowerCase()

   // ON/OFF
   if(['on','off'].includes(action)) {
     const enable = action === 'on'

     if(scope === 'all' || scope === 'both') {
       // save for global and all existing groups
       settings['global'].presence = enable
       settings['global'].presenceMode = settings['global'].presenceMode || 'random'
       Object.keys(settings).forEach(k => {
         settings[k].presence = enable
       })
       save()
       await sock.sendMessage(jid, {text: `✅ Presence ${enable?'ON':'OFF'} for *ALL* (groups + private)`}, {quoted:m})
       return
     }

     if(scope === 'group' || scope === 'groups') {
       if(!isGroup) { await sock.sendMessage(jid, {text:'❌ Use in group for group scope'}, {quoted:m}); return }
       settings[jid].presence = enable
       save()
       await sock.sendMessage(jid, {text: `✅ Presence ${enable?'ON':'OFF'} for THIS GROUP`}, {quoted:m})
       return
     }

     if(scope === 'private' || scope === 'pm' || scope === 'inbox') {
       settings['global'].presence = enable
       settings['global'].presenceMode = settings['global'].presenceMode || 'random'
       save()
       await sock.sendMessage(jid, {text: `✅ Presence ${enable?'ON':'OFF'} for PRIVATE CHATS`}, {quoted:m})
       return
     }

     // current chat only (default)
     settings[jid].presence = enable
     settings[jid].presenceMode = settings[jid].presenceMode || 'random'
     save()
     await sock.sendMessage(jid, {text: `✅ Presence ${enable?'ON':'OFF'} for ${isGroup?'THIS GROUP':'THIS PRIVATE CHAT'}`}, {quoted:m})
     return
   }

   // MODE
   if(action === 'mode') {
     const valid = ['typing','recording','random','both']
     if(!valid.includes(modeArg)) {
       await sock.sendMessage(jid, {text:`❌ Use:.presence mode typing / recording / random / both\nAdd 'all' for all chats\nEx:.presence mode random all`}, {quoted:m})
       return
     }
     const target = args[2] // if user typed ".presence mode random all"
     if(target === 'all' || target === 'both') {
       settings['global'].presenceMode = modeArg
       settings['global'].presence = true
       Object.keys(settings).forEach(k => settings[k].presenceMode = modeArg)
       save()
       await sock.sendMessage(jid, {text:`✅ Presence mode *${modeArg}* for ALL`}, {quoted:m})
     } else {
       settings[jid].presenceMode = modeArg
       settings[jid].presence = true
       save()
       await sock.sendMessage(jid, {text:`✅ Presence mode *${modeArg}* for THIS CHAT`}, {quoted:m})
     }
     return
   }

   // STATUS
   const cur = settings[jid]?.presence
   const curMode = settings[jid]?.presenceMode || settings['global']?.presenceMode || 'random'
   await sock.sendMessage(jid, {text:`
*PRESENCE SETTINGS*
Current: ${cur!==false?'ON':'OFF'} | Mode: ${curMode}

*ON/OFF:*
.presence on - this chat
.presence off - this chat
.presence on all - groups+private
.presence off all - groups+private
.presence on group
.presence on private

*MODE:*
.presence mode typing
.presence mode recording
.presence mode random
.presence mode both
.presence mode random all
`.trim()}, {quoted:m})
 }
}
]