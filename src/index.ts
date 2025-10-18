// Archivo principal de exportación de la librería WebSocket de Kick.com
export { WebSocketManager } from "./WebSocketManager.js";
export { EventEmitter } from "./EventEmitter.js";
export { MessageParser } from "./MessageParser.js";

// Exportar tipos
export type {
  KickMessage,
  KickUser,
  KickChannel,
  ChatMessageEvent,
  MessageDeletedEvent,
  UserBannedEvent,
  UserUnbannedEvent,
  SubscriptionEvent,
  GiftedSubscriptionsEvent,
  PinnedMessageCreatedEvent,
  StreamHostEvent,
  PollUpdateEvent,
  PollDeleteEvent,
  KickEventType,
  KickEventData,
  KickWebSocketOptions,
  WebSocketMessage,
  ConnectionState,
  EventHandler,
  IKickWebSocket,
  EventDataMap,
} from "./types.js";

// Clase principal simplificada para uso fácil
import { WebSocketManager } from "./WebSocketManager.js";
import type {
  KickWebSocketOptions,
  KickEventType,
  EventHandler,
} from "./types.js";

/**
 * Clase principal para conectar a los WebSockets de Kick.com
 *
 * Ejemplo de uso:
 * ```typescript
 * import { KickWebSocket } from './websocket-lib';
 *
 * const kickWS = new KickWebSocket({ debug: true });
 *
 * kickWS.connect('nombre-del-canal');
 *
 * kickWS.on('ChatMessage', (message) => {
 *   console.log('Nuevo mensaje:', message.content);
 * });
 *
 * kickWS.on('ready', () => {
 *   console.log('Conectado exitosamente');
 * });
 * ```
 */
export class KickWebSocket extends WebSocketManager {
  constructor(options: KickWebSocketOptions = {}) {
    super(options);
  }

  /**
   * Método de conveniencia para escuchar todos los eventos
   */
  onAllEvents(handler: EventHandler<unknown>): void {
    const events: KickEventType[] = [
      "ChatMessage",
      "MessageDeleted",
      "UserBanned",
      "UserUnbanned",
      "Subscription",
      "GiftedSubscriptions",
      "PinnedMessageCreated",
      "StreamHost",
      "PollUpdate",
      "PollDelete",
    ];

    events.forEach((event) => {
      this.on(event, handler);
    });
  }

  /**
   * Método de conveniencia para escuchar solo eventos de chat
   */
  onChatEvents(handler: EventHandler<unknown>): void {
    const chatEvents: KickEventType[] = [
      "ChatMessage",
      "MessageDeleted",
      "PinnedMessageCreated",
    ];

    chatEvents.forEach((event) => {
      this.on(event, handler);
    });
  }

  /**
   * Método de conveniencia para escuchar solo eventos de usuarios
   */
  onUserEvents(handler: EventHandler<unknown>): void {
    const userEvents: KickEventType[] = [
      "UserBanned",
      "UserUnbanned",
      "Subscription",
      "GiftedSubscriptions",
    ];

    userEvents.forEach((event) => {
      this.on(event, handler);
    });
  }

  /**
   * Método de conveniencia para escuchar solo eventos de stream
   */
  onStreamEvents(handler: EventHandler<unknown>): void {
    const streamEvents: KickEventType[] = [
      "StreamHost",
      "PollUpdate",
      "PollDelete",
    ];

    streamEvents.forEach((event) => {
      this.on(event, handler);
    });
  }

  /**
   * Crea una instancia configurada para modo de bajo consumo
   */
  static createLightweight(channelName?: string): KickWebSocket {
    const ws = new KickWebSocket({
      debug: false,
      autoReconnect: true,
      reconnectInterval: 10000,
      enableBuffer: false,
      filteredEvents: ["ChatMessage"], // Solo mensajes de chat
    });

    if (channelName) {
      ws.connect(channelName).catch(console.error);
    }

    return ws;
  }

  /**
   * Crea una instancia configurada para modo de debug
   */
  static createDebug(channelName?: string): KickWebSocket {
    const ws = new KickWebSocket({
      debug: true,
      autoReconnect: true,
      reconnectInterval: 3000,
      enableBuffer: true,
      bufferSize: 500,
    });

    if (channelName) {
      ws.connect(channelName).catch(console.error);
    }

    return ws;
  }

  /**
   * Crea una instancia configurada para análisis de datos
   */
  static createAnalytics(channelName?: string): KickWebSocket {
    const ws = new KickWebSocket({
      debug: false,
      autoReconnect: true,
      reconnectInterval: 5000,
      enableBuffer: true,
      bufferSize: 2000,
      filteredEvents: [
        "ChatMessage",
        "UserBanned",
        "Subscription",
        "GiftedSubscriptions",
      ],
    });

    if (channelName) {
      ws.connect(channelName).catch(console.error);
    }

    return ws;
  }
}

// Exportar por defecto la clase principal
export default KickWebSocket;
