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
}
]