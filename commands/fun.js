export default [
{ name: 'joke', execute: async (sock,m) => {
  const jokes = ["Why don't scientists trust atoms? Because they make up everything! 😂","I told my wife she was drawing eyebrows too high. She looked surprised 😅"]
  await sock.sendMessage(m.key.remoteJid, {text: jokes[Math.floor(Math.random()*jokes.length)]}, {quoted:m})
}},
{ name: 'quote', execute: async (sock,m) => {
  await sock.sendMessage(m.key.remoteJid, {text:'*“Code is like humor. When you have to explain it, it’s bad.”* – Cory House'}, {quoted:m})
}},
{ name: 'ship', execute: async (sock,m) => {
  const perc = Math.floor(Math.random()*100)
  await sock.sendMessage(m.key.remoteJid, {text:`❤️ Ship Meter: ${perc}%\n${perc>70?'Perfect match! 💕':'Just friends 😅'}`}, {quoted:m})
}},
{ name: '8ball', execute: async (sock,m,args) => {
  const ans = ['Yes ✅','No ❌','Maybe 🤔','Definitely!','Ask again later']
  await sock.sendMessage(m.key.remoteJid, {text: ans[Math.floor(Math.random()*ans.length)]}, {quoted:m})
}}
]