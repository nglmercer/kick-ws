// Ejemplos de uso de la librería Kick WebSocket Lite

import { KickWebSocket } from "./index.js";
import type {
  ChatMessageEvent,
  SubscriptionEvent,
  UserBannedEvent,
  GiftedSubscriptionsEvent,
} from "./types.js";

/**
 * Ejemplo 1: Uso básico - Conectar y escuchar mensajes
 */
export function basicUsage() {
  console.log("=== Ejemplo 1: Uso Básico ===");

  const kickWS = new KickWebSocket({ debug: true });

  // Conectar a un canal
  kickWS.connect("nombre-del-canal");

  // Escuchar mensajes de chat
  kickWS.onChatMessage((message: ChatMessageEvent) => {
    console.log(`💬 ${message.sender.username}: ${message.content}`);
  });

  // Eventos de conexión
  kickWS.on("ready", () => {
    console.log("✅ Conectado exitosamente");
  });

  kickWS.on("disconnect", (data: { reason?: string }) => {
    console.log("❌ Desconectado:", data.reason);
  });

  kickWS.on("error", (error: Error) => {
    console.error("⚠️ Error:", error);
  });
}

/**
 * Ejemplo 2: Bot de registro de actividad
 */
export function activityLogger() {
  console.log("=== Ejemplo 2: Bot de Registro de Actividad ===");

  // Usar configuración para análisis
  const kickWS = KickWebSocket.createAnalytics("streamer-popular");

  let stats = {
    messages: 0,
    subscriptions: 0,
    bans: 0,
    giftedSubs: 0,
  };

  // Contar mensajes
  kickWS.onChatMessage((message: ChatMessageEvent) => {
    stats.messages++;

    // Detectar comandos
    if (message.content.startsWith("!")) {
      console.log(
        `🎯 Comando detectado: ${message.content} por ${message.sender.username}`,
      );
    }
  });

  // Contar suscripciones
  kickWS.onSubscription((sub: SubscriptionEvent) => {
    stats.subscriptions++;
    console.log(`⭐ Nueva suscripción: ${sub.username}`);
  });

  // Contar bans
  kickWS.onUserBanned((ban: UserBannedEvent) => {
    stats.bans++;
    console.log(`🔨 Usuario baneado: ${ban.username}`);
  });

  // Contear suscripciones regaladas
  kickWS.on("GiftedSubscriptions", (gift: GiftedSubscriptionsEvent) => {
    stats.giftedSubs += gift.recipients.length;
    console.log(
      `🎁 ${gift.gifted_by} regaló ${gift.recipients.length} suscripciones`,
    );
  });

  // Reporte cada 30 segundos
  setInterval(() => {
    console.log(`📊 Estadísticas (últimos 30s):
      Mensajes: ${stats.messages}
      Suscripciones: ${stats.subscriptions}
      Bans: ${stats.bans}
      Subs regaladas: ${stats.giftedSubs}
    `);

    // Resetear contadores
    stats = { messages: 0, subscriptions: 0, bans: 0, giftedSubs: 0 };
  }, 30000);
}

/**
 * Ejemplo 3: Monitor de múltiples canales
 */
export function multiChannelMonitor() {
  console.log("=== Ejemplo 3: Monitor de Múltiples Canales ===");

  const channels = ["streamer1", "streamer2", "streamer3"];
  const connections: Map<string, KickWebSocket> = new Map();

  channels.forEach((channelName) => {
    const kickWS = new KickWebSocket({
      debug: false,
      autoReconnect: true,
      filteredEvents: ["ChatMessage", "UserBanned", "Subscription"],
    });

    connections.set(channelName, kickWS);

    kickWS.connect(channelName);

    kickWS.onChatMessage((message: ChatMessageEvent) => {
      console.log(
        `[${channelName}] 💬 ${message.sender.username}: ${message.content}`,
      );
    });

    kickWS.onUserBanned((ban: UserBannedEvent) => {
      console.log(`[${channelName}] 🔨 Ban: ${ban.username}`);
    });

    kickWS.onSubscription((sub: SubscriptionEvent) => {
      console.log(`[${channelName}] ⭐ Sub: ${sub.username}`);
    });

    kickWS.on("ready", () => {
      console.log(`✅ Conectado a ${channelName}`);
    });
  });

  // Función para desconectar todos los canales
  function disconnectAll() {
    connections.forEach((ws, channel) => {
      ws.disconnect();
      console.log(`❌ Desconectado de ${channel}`);
    });
  }

  return { disconnectAll };
}

/**
 * Ejemplo 4: Sistema de notificaciones
 */
export function notificationSystem() {
  console.log("=== Ejemplo 4: Sistema de Notificaciones ===");

  const kickWS = new KickWebSocket({
    debug: false,
    enableBuffer: true,
    bufferSize: 100,
  });

  // Palabras clave para notificaciones
  const keywords = ["admin", "mod", "help", "bug", "issue"];
  const mentionedUsers = new Set<string>();

  kickWS.connect("monitored-channel");

  kickWS.onChatMessage((message: ChatMessageEvent) => {
    const content = message.content.toLowerCase();

    // Detectar palabras clave
    const keywordFound = keywords.some((keyword) => content.includes(keyword));
    if (keywordFound) {
      sendNotification(
        `🚨 Palabra clave detectada: "${message.content}" por ${message.sender.username}`,
      );
    }

    // Detectar menciones (formato simple @username)
    const mentions = message.content.match(/@(\w+)/g);
    if (mentions) {
      mentions.forEach((mention: string) => {
        const username = mention.substring(1);
        mentionedUsers.add(username);
        sendNotification(
          `📢 ${message.sender.username} mencionó a ${username}`,
        );
      });
    }

    // Detectar mensajes largos (posibles spam/importantes)
    if (message.content.length > 200) {
      sendNotification(
        `📝 Mensaje largo de ${message.sender.username} (${message.content.length} caracteres)`,
      );
    }
  });

  kickWS.onUserBanned((ban: UserBannedEvent) => {
    sendNotification(`🔨 Usuario baneado: ${ban.username}`);
  });

  kickWS.onSubscription((sub: SubscriptionEvent) => {
    sendNotification(`⭐ ¡Nueva suscripción! ${sub.username}`);
  });

  function sendNotification(message: string) {
    // Aquí implementarías tu sistema de notificaciones
    // Por ejemplo: Discord webhook, Slack, Telegram, etc.
    console.log(`🔔 NOTIFICACIÓN: ${message}`);

    // Ejemplo de webhook a Discord (comentado)
    /*
    fetch('https://discord.com/api/webhooks/YOUR_WEBHOOK_URL', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });
    */
  }

  return { mentionedUsers: Array.from(mentionedUsers) };
}

/**
 * Ejemplo 5: Analizador de sentimientos simple
 */
export function sentimentAnalyzer() {
  console.log("=== Ejemplo 5: Analizador de Sentimientos ===");

  const kickWS = KickWebSocket.createLightweight("target-channel");

  // Palabras para análisis de sentimientos
  const positiveWords = [
    "love",
    "awesome",
    "great",
    "amazing",
    "cool",
    "nice",
    "good",
    "happy",
    "lol",
    "lmao",
  ];
  const negativeWords = [
    "hate",
    "bad",
    "terrible",
    "awful",
    "sad",
    "angry",
    "mad",
    "sucks",
    "worst",
  ];

  let sentimentStats = {
    positive: 0,
    negative: 0,
    neutral: 0,
    total: 0,
  };

  kickWS.onChatMessage((message: ChatMessageEvent) => {
    const content = message.content.toLowerCase();
    let sentiment = "neutral";

    // Contar palabras positivas y negativas
    const positiveCount = positiveWords.filter((word) =>
      content.includes(word),
    ).length;
    const negativeCount = negativeWords.filter((word) =>
      content.includes(word),
    ).length;

    if (positiveCount > negativeCount) {
      sentiment = "positive";
      sentimentStats.positive++;
    } else if (negativeCount > positiveCount) {
      sentiment = "negative";
      sentimentStats.negative++;
    } else {
      sentimentStats.neutral++;
    }

    sentimentStats.total++;

    // Mostrar mensajes extremos
    if (positiveCount >= 2 || negativeCount >= 2) {
      console.log(
        `🎭 ${sentiment.toUpperCase()}: ${message.content} (${message.sender.username})`,
      );
    }
  });

  // Reporte de sentimientos cada 2 minutos
  setInterval(() => {
    if (sentimentStats.total > 0) {
      const positivePercent = (
        (sentimentStats.positive / sentimentStats.total) *
        100
      ).toFixed(1);
      const negativePercent = (
        (sentimentStats.negative / sentimentStats.total) *
        100
      ).toFixed(1);
      const neutralPercent = (
        (sentimentStats.neutral / sentimentStats.total) *
        100
      ).toFixed(1);

      console.log(`😊 Análisis de Sentimientos (últimos 2 min):
        Positivos: ${positivePercent}% (${sentimentStats.positive})
        Negativos: ${negativePercent}% (${sentimentStats.negative})
        Neutrales: ${neutralPercent}% (${sentimentStats.neutral})
        Total: ${sentimentStats.total} mensajes
      `);
    }

    // Resetear estadísticas
    sentimentStats = { positive: 0, negative: 0, neutral: 0, total: 0 };
  }, 120000);
}

/**
 * Ejemplo 6: Gestor de conexiones con reconexión automática
 */
export function connectionManager() {
  console.log("=== Ejemplo 6: Gestor de Conexiones ===");

  class ConnectionManager {
    public connections: Map<string, KickWebSocket> = new Map();
    public maxRetries = 5;
    public retryDelay = 5000;

    addChannel(channelName: string) {
      if (this.connections.has(channelName)) {
        console.log(`⚠️ Ya existe conexión para ${channelName}`);
        return;
      }

      const kickWS = new KickWebSocket({
        debug: true,
        autoReconnect: true,
        reconnectInterval: this.retryDelay,
      });

      this.connections.set(channelName, kickWS);
      this.setupConnectionHandlers(channelName, kickWS);

      kickWS.connect(channelName).catch((error) => {
        console.error(`❌ Error conectando a ${channelName}:`, error);
      });
    }

    public setupConnectionHandlers(channelName: string, kickWS: KickWebSocket) {
      kickWS.on("ready", () => {
        console.log(`✅ Conectado a ${channelName}`);
      });

      kickWS.on("disconnect", (data: { reason?: string }) => {
        console.log(`❌ Desconectado de ${channelName}: ${data.reason}`);
      });

      kickWS.on("error", (error: Error) => {
        console.error(`❌ Error en ${channelName}:`, error.message);
      });

      kickWS.onChatMessage((message: ChatMessageEvent) => {
        console.log(
          `[${channelName}] ${message.sender.username}: ${message.content}`,
        );
      });
    }

    removeChannel(channelName: string) {
      const kickWS = this.connections.get(channelName);
      if (kickWS) {
        kickWS.disconnect();
        this.connections.delete(channelName);
        console.log(`🗑️ Conexión eliminada: ${channelName}`);
      }
    }

    getStatus() {
      const status: Record<
        string,
        {
          connected: boolean;
          state: string;
          stats: any;
        }
      > = {};
      this.connections.forEach((ws, channelName) => {
        status[channelName] = {
          connected: ws.isConnected(),
          state: ws.getConnectionState(),
          stats: ws.getStats(),
        };
      });
      return status;
    }

    disconnectAll() {
      this.connections.forEach((ws) => {
        ws.disconnect();
      });
      this.connections.clear();
      console.log("🔌 Todas las conexiones desconectadas");
    }
  }

  const manager = new ConnectionManager();

  // Agregar canales
  manager.addChannel("channel1");
  manager.addChannel("channel2");

  // Monitorear estado cada 30 segundos
  setInterval(() => {
    console.log("📊 Estado de conexiones:", manager.getStatus());
  }, 30000);

  return manager;
}

/**
 * Ejemplo 7: Logger de mensajes con filtrado
 */
export function messageLogger() {
  console.log("=== Ejemplo 7: Logger de Mensajes con Filtrado ===");

  const kickWS = new KickWebSocket({
    debug: false,
    enableBuffer: true,
    bufferSize: 500,
    filteredEvents: ["ChatMessage"], // Solo mensajes
  });

  kickWS.connect("target-channel");

  // Filtros configurables
  const filters = {
    minMessageLength: 5,
    excludeUsers: ["bot", "spam_user"],
    includeKeywords: [] as string[],
    excludeKeywords: ["spam", "advert"],
  };

  kickWS.onChatMessage((message: ChatMessageEvent) => {
    // Aplicar filtros
    if (message.content.length < filters.minMessageLength) return;
    if (filters.excludeUsers.includes(message.sender.username.toLowerCase()))
      return;
    if (
      filters.excludeKeywords.some((keyword) =>
        message.content.toLowerCase().includes(keyword),
      )
    )
      return;
    if (
      filters.includeKeywords.length > 0 &&
      !filters.includeKeywords.some((keyword) =>
        message.content.toLowerCase().includes(keyword),
      )
    )
      return;

    // Formatear mensaje para log
    const logEntry = {
      timestamp: new Date().toISOString(),
      channel: kickWS.getChannelName(),
      user: message.sender.username,
      userId: message.sender.id,
      message: message.content,
      messageId: message.id,
      badges: message.sender.identity.badges,
    };

    // Guardar en log
    console.log("📝 LOG:", JSON.stringify(logEntry));

    // Aquí podrías guardar en archivo o base de datos
    // saveToFile(logEntry);
  });

  // Exportar buffer periódicamente
  setInterval(() => {
    const buffer = kickWS.getMessageBuffer();
    if (buffer.length > 0) {
      console.log(`💾 Exportando ${buffer.length} mensajes del buffer`);
      // processBuffer(buffer);
      kickWS.clearMessageBuffer();
    }
  }, 60000); // Cada minuto

  return {
    updateFilters: (newFilters: Partial<typeof filters>) => {
      Object.assign(filters, newFilters);
    },
    exportBuffer: () => kickWS.getMessageBuffer(),
  };
}

// Exportar todos los ejemplos
export const examples = {
  basicUsage,
  activityLogger,
  multiChannelMonitor,
  notificationSystem,
  sentimentAnalyzer,
  connectionManager,
  messageLogger,
};

// Función para ejecutar todos los ejemplos (con cuidado)
export function runAllExamples() {
  console.log("⚠️ ADVERTENCIA: Esto creará múltiples conexiones WebSocket");
  console.log("Ejecuta los ejemplos individualmente para evitar sobrecarga");

  // Descomentar para ejecutar (con precaución)
  // basicUsage();
  // setTimeout(() => activityLogger(), 5000);
  // setTimeout(() => multiChannelMonitor(), 10000);
}
