// Archivo principal de exportación de la librería WebSocket de Kick.com
export { WebSocketManager } from "./WebSocketManager.js";
export { EventEmitter } from "./EventEmitter.js";
export { MessageParser } from "./MessageParser.js";
// Exportar tipos y enums
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

// Exportar enums
export * from "./types.js";

// Clase principal simplificada para uso fácil
import { WebSocketManager } from "./WebSocketManager.js";
export { KickEvents } from "./types.js";
import type {
  ExtendedKickWebSocketOptions,
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
  constructor(options: ExtendedKickWebSocketOptions = {}) {
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
      "RewardRedeemed",
      "KicksGifted",
      "PointsUpdated",
      "subscriptionSucceeded",
      "rawMessage",
      "ready",
      "error",
      "disconnect",
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
   * Crea una instancia configurada para modo de debug
   */
  static createDebug(channelName?: string): KickWebSocket {
    const ws = new KickWebSocket({
      debug: true,
      autoReconnect: true,
      reconnectInterval: 3000,
    });

    if (channelName) {
      ws.connect(channelName).catch(console.error);
    }

    return ws;
  }
}

// Exportar por defecto la clase principal
export default KickWebSocket;

// =====================================================
// EJEMPLOS DE USO / USAGE EXAMPLES
// =====================================================

/**
 * Ejemplo 1: Usando enums para escuchar eventos específicos
 * Example 1: Using enums to listen to specific events
 * 
 * ```typescript
 * import { KickWebSocket, KickEvents } from './websocket-lib';
 * 
 * const kickWS = new KickWebSocket({ debug: true });
 * 
 * // Usar enum para escuchar mensajes de chat
 * // Using enum to listen to chat messages
 * kickWS.on(KickEvents.ChatMessage, (data) => {
 *   console.log('Nuevo mensaje de chat:', data.content);
 *   console.log('Usuario:', data.sender?.username);
 * });
 * 
 * // Usar enum para escuchar mensajes eliminados
 * kickWS.on(KickEvents.MessageDeleted, (data) => {
 *   console.log('Mensaje eliminado:', data.message_id);
 * });
 * 
 * // Usar enum para escuchar bans
 * kickWS.on(KickEvents.UserBanned, (data) => {
 *   console.log('Usuario baneado:', data.username);
 * });
 * 
 * // Usar enum para escuchar suscripciones
 * kickWS.on(KickEvents.Subscription, (data) => {
 *   console.log('Nueva suscripción de:', data.username);
 * });
 * 
 * // Conectar al canal
 * kickWS.connect('nombre-canal');
 * ```
 */

/**
 * Ejemplo 2: Usando forEach para escuchar todos los eventos
 * Example 2: Using forEach to listen to all events
 * 
 * ```typescript
 * import { KickWebSocket, KickEvents, KICK_EVENTS } from './websocket-lib';
 * 
 * const kickWS = new KickWebSocket({ debug: true });
 * 
 * // Escuchar todos los eventos con forEach
 * // Listen to all events with forEach
 * KICK_EVENTS.forEach((event) => {
 *   kickWS.on(event, (data) => {
 *     console.log(`Evento: ${event}`, data);
 *   });
 * });
 * 
 * // O usando el enum KickEvents con Object.values()
 * // Or using the KickEvents enum with Object.values()
 * Object.values(KickEvents).forEach((event) => {
 *   kickWS.on(event as any, (data) => {
 *     console.log(`Evento: ${event}`, data);
 *   });
 * });
 * 
 * kickWS.connect('nombre-canal');
 * ```
 */

/**
 * Ejemplo 3: Función helper para emitir todos los eventos
 * Example 3: Helper function to emit all events
 * 
 * ```typescript
 * import { KickWebSocket, KickEvents } from './websocket-lib';
 * 
 * const kickWS = new KickWebSocket({ debug: true });
 * 
 * // Función para escuchar y re-emitir todos los eventos
 * // Function to listen and re-emit all events
 * function listenToAllEvents(ws: KickWebSocket) {
 *   const events = Object.values(KickEvents);
 *   
 *   events.forEach((event) => {
 *     ws.on(event as any, (data) => {
 *       console.log('────────────── EVENTO ──────────────');
 *       console.log('Tipo:', event);
 *       console.log('Datos:', JSON.stringify(data, null, 2));
 *       console.log('────────────────────────────────────');
 *     });
 *   });
 * }
 * 
 * // Usar la función helper
 * listenToAllEvents(kickWS);
 * 
 * kickWS.connect('nombre-canal');
 * ```
 */

/**
 * Ejemplo 4: Uso con categorías de eventos
 * Example 4: Usage with event categories
 * 
 * ```typescript
 * import { KickWebSocket, KickEvents, EventDataMap } from './websocket-lib';
 * 
 * const kickWS = new KickWebSocket({ debug: true });
 * 
 * // Eventos de chat
 * const chatEvents = [KickEvents.ChatMessage, KickEvents.MessageDeleted, KickEvents.PinnedMessageCreated];
 * 
 * // Eventos de usuario (ban, suscripción, etc.)
 * const userEvents = [KickEvents.UserBanned, KickEvents.UserUnbanned, KickEvents.Subscription, KickEvents.GiftedSubscriptions];
 * 
 * // Eventos de stream
 * const streamEvents = [KickEvents.StreamHost, KickEvents.PollUpdate, KickEvents.PollDelete];
 * 
 * // Escuchar eventos de chat
 * chatEvents.forEach((event) => {
 *   kickWS.on(event, (data: EventDataMap[typeof event]) => {
 *     console.log(`[CHAT] ${event}:`, data);
 *   });
 * });
 * 
 * // Escuchar eventos de usuario
 * userEvents.forEach((event) => {
 *   kickWS.on(event, (data: EventDataMap[typeof event]) => {
 *     console.log(`[USER] ${event}:`, data);
 *   });
 * });
 * 
 * // Escuchar eventos de stream
 * streamEvents.forEach((event) => {
 *   kickWS.on(event, (data: EventDataMap[typeof event]) => {
 *     console.log(`[STREAM] ${event}:`, data);
 *   });
 * });
 * 
 * kickWS.connect('nombre-canal');
 * ```
 */