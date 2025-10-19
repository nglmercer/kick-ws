// Ejemplo básico de uso de Kick WebSocket en Node.js
import { KickWebSocket } from "kick-wss";

// Crear instancia con opciones de debug
const kickWS = new KickWebSocket({
  debug: true,
  autoReconnect: true,
  reconnectInterval: 5000,
});

// Conectar a un canal
const channelName = process.argv[2] || "xqc";

console.log(`🚀 Conectando al canal: ${channelName}`);

// Eventos de conexión
kickWS.on("ready", () => {
  console.log("✅ Conectado exitosamente a:", kickWS.getChannelName());
  console.log("📊 ID del canal:", kickWS.getChannelId());
});

kickWS.on("disconnect", ({ reason }) => {
  console.log("❌ Desconectado:", reason);
});

kickWS.on("error", (error) => {
  console.error("⚠️ Error de conexión:", error.message);
});

// Eventos de chat
kickWS.onChatMessage((message) => {
  const timestamp = new Date().toLocaleTimeString();
  const username = message.sender.username;
  const color = message.sender.identity?.color || "white";
  const content = message.content;

  console.log(`[${timestamp}] ${username}: ${content}`);
});

// Eventos de usuarios
kickWS.onUserBanned((ban) => {
  console.log(`🚫 Usuario baneado: ${ban.username}`);
});

kickWS.onSubscription((sub) => {
  console.log(`⭐ Nueva suscripción: ${sub.username}`);
});

kickWS.onGiftedSubscriptions((gift) => {
  console.log(`🎁 Suscripciones regaladas por ${gift.gifter_username}`);
});

// Eventos de stream
kickWS.onStreamHost((host) => {
  console.log(`📺 Host: ${host.channel} está haciendo host a ${host.target}`);
});

// Conectar al canal
kickWS
  .connect(channelName)
  .then(() => {
    console.log("🎉 Iniciando conexión...");
  })
  .catch((error) => {
    console.error("❌ Error al conectar:", error.message);
    process.exit(1);
  });

// Manejar cierre graceful
process.on("SIGINT", () => {
  console.log("\n👋 Cerrando conexión...");
  kickWS.disconnect();
  process.exit(0);
});

// Mostrar estadísticas cada 30 segundos
setInterval(() => {
  const stats = kickWS.getStats();
  console.log(`📈 Estadísticas: ${stats.messagesReceived} mensajes recibidos`);
}, 30000);
