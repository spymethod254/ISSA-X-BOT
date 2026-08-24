export default [
{ name: 'calc', execute: async (sock,m,args) => {
  try{ const res = eval(args.join(' ')); await sock.sendMessage(m.key.remoteJid, {text:`= ${res}`}, {quoted:m}) }
  catch{ await sock.sendMessage(m.key.remoteJid, {text:'Invalid calc'}, {quoted:m}) }
}},
{ name: 'weather', execute: async (sock,m,args) => {
  await sock.sendMessage(m.key.remoteJid, {text:`🌤️ Weather for ${args.join(' ')}: 28°C Sunny\n_Mombasa vibe 🌊_`}, {quoted:m})
}},
{ name: 'removebg', execute: async (sock,m) => {
  await sock.sendMessage(m.key.remoteJid, {text:'Send image with.removebg (add API later)'}, {quoted:m})
}}
]