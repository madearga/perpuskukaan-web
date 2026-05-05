import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";

const botEndpoint = process.env.BOT_MESSAGE_ENDPOINT ?? "http://localhost:3000/api/bot/message";

async function forwardToBotLayer(input: {
  providerUserId: string;
  messageId: string;
  text: string;
}) {
  const response = await fetch(botEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: "whatsapp",
      providerUserId: input.providerUserId,
      messageId: input.messageId,
      text: input.text,
    }),
  });

  if (!response.ok) {
    return { text: "Maaf, Perpuskukaan sedang gagal memproses pesan WhatsApp ini." };
  }

  return await response.json() as { text: string };
}

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth/whatsapp");
  const sock = makeWASocket({ auth: state });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const shouldReconnect = update.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    if (update.connection === "close" && shouldReconnect) {
      void startWhatsApp();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const message of messages) {
      const text = message.message?.conversation ?? message.message?.extendedTextMessage?.text;
      const remoteJid = message.key.remoteJid;
      const messageId = message.key.id;

      if (!text || !remoteJid || !messageId || message.key.fromMe) continue;

      const botResponse = await forwardToBotLayer({
        providerUserId: remoteJid,
        messageId,
        text,
      });

      await sock.sendMessage(remoteJid, { text: botResponse.text });
    }
  });
}

void startWhatsApp();
