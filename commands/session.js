module.exports = {
  name: "session",
  aliases: ["whoami", "mysession"],

  async execute(sock, m) {
    const sessionId = sock.user?.id || "UNKNOWN";
    const remoteJid = m.key?.remoteJid || "UNKNOWN";
    const participant = m.key?.participant || "UNKNOWN";

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🧪 SESSION ISOLATION TEST");
    console.log("🤖 SOCKET USER:", sessionId);
    console.log("📩 REMOTE JID:", remoteJid);
    console.log("👤 PARTICIPANT:", participant);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    await sock.sendMessage(remoteJid, {
      text:
        `🧪 *SESSION TEST*\n\n` +
        `🤖 Bot session: ${sessionId}\n` +
        `📩 Chat: ${remoteJid}\n` +
        `👤 Participant: ${participant}`
    });
  }
};