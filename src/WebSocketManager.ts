// Gestor principal de conexión WebSocket para Kick.com
import { EventEmitter } from "./EventEmitter.js";
import { MessageParser } from "./MessageParser.js";
import type {
  KickEventType,
  KickWebSocketOptions,
  ConnectionState,
  EventHandler,
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
  EventDataMap,
} from "./types.js";

export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private channelName: string = "";
  private channelId: number = 0;
  private connectionState: ConnectionState = "disconnected";
  private options: Required<KickWebSocketOptions>;
  private reconnectTimer: number | null = null;
  private messageBuffer: string[] = [];
  private isManualDisconnect: boolean = false;

  // URL del WebSocket de Kick.com
  private readonly WEBSOCKET_URL =
    "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679";
  private readonly WS_PARAMS = {
    protocol: "7",
    client: "js",
    version: "8.4.0",
    flash: "false",
  };

  // Custom WebSocket URL and params (si se necesita personalizar)
  private customWebSocketUrl?: string;
  private customWebSocketParams?: Record<string, string>;

  constructor(options: KickWebSocketOptions = {}) {
    super();

    // Opciones por defecto
    this.options = {
      debug: false,
      autoReconnect: true,
      reconnectInterval: 5000,
      enableBuffer: false,
      bufferSize: 1000,
      filteredEvents: [],
      ...options,
    };

    this.log("WebSocketManager initialized with options:", this.options);
  }

  /**
   * Conecta al WebSocket de un canal específico
   */
  async connect(channelName: string): Promise<void> {
    if (
      this.connectionState === "connected" ||
      this.connectionState === "connecting"
    ) {
      this.log("Already connected or connecting");
      return;
    }

    this.channelName = channelName;
    this.isManualDisconnect = false;

    try {
      await this.performConnection();
    } catch (error) {
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  /**
   * Realiza la conexión al WebSocket
   */
  private async performConnection(): Promise<void> {
    this.setConnectionState("connecting");
    this.log(`Connecting to channel: ${this.channelName}`);

    // Obtener información del canal
    const channelInfo = await this.getChannelInfo(this.channelName);
    this.channelId = channelInfo.chatroom.id;

    // Construir URL del WebSocket
    const wsUrl = this.buildWebSocketUrl();

    // Crear conexión WebSocket
    this.ws = new WebSocket(wsUrl);

    // Configurar manejadores de eventos
    this.setupWebSocketHandlers();
  }

  /**
   * Construye la URL del WebSocket con parámetros
   */
  private buildWebSocketUrl(): string {
    const baseUrl = this.customWebSocketUrl || this.WEBSOCKET_URL;
    const params = new URLSearchParams({
      ...this.WS_PARAMS,
      ...this.customWebSocketParams,
    });
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Establece una URL personalizada para el WebSocket
   */
  setWebSocketUrl(url: string): void {
    this.customWebSocketUrl = url;
    this.log(`Custom WebSocket URL set: ${url}`);
  }

  /**
   * Establece parámetros personalizados para el WebSocket
   */
  setWebSocketParams(params: Record<string, string>): void {
    this.customWebSocketParams = { ...this.customWebSocketParams, ...params };
    this.log(`Custom WebSocket params set:`, this.customWebSocketParams);
  }

  /**
   * Restablece la URL y parámetros del WebSocket a los valores por defecto
   */
  resetWebSocketConfig(): void {
    this.customWebSocketUrl = undefined;
    this.customWebSocketParams = undefined;
    this.log("WebSocket configuration reset to defaults");
  }

  /**
   * Configura los manejadores de eventos del WebSocket
   */
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.log("WebSocket connection opened");
      this.subscribeToChannel();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data as string);
    };

    this.ws.onclose = (event) => {
      this.log(`WebSocket closed: ${event.code} - ${event.reason}`);
      this.handleDisconnect(event.code, event.reason);
    };

    this.ws.onerror = (error) => {
      this.log("WebSocket error:", error);
      this.emit("error", error);
    };
  }

  /**
   * Se suscribe al canal del chat
   */
  private subscribeToChannel(): void {
    if (!this.ws) return;

    const subscribeMessage = {
      event: "pusher:subscribe",
      data: {
        auth: "",
        channel: `chatrooms.${this.channelId}.v2`,
      },
    };

    this.ws.send(JSON.stringify(subscribeMessage));
    this.log(`Subscribed to channel: chatrooms.${this.channelId}.v2`);

    this.setConnectionState("connected");
    this.emit("ready", { channel: this.channelName });
  }

  /**
   * Maneja los mensajes recibidos del WebSocket
   */
  private handleMessage(rawMessage: string): void {
    // Emitir mensaje raw primero
    this.emit("rawMessage", rawMessage);

    // Agregar al buffer si está habilitado
    if (this.options.enableBuffer) {
      this.addToBuffer(rawMessage);
    }

    // Filtrar eventos de sistema de Pusher temprano
    try {
      const message = JSON.parse(rawMessage);
      if (
        message.event?.startsWith("pusher:") ||
        message.event?.startsWith("pusher_internal:")
      ) {
        this.log(`Ignoring Pusher system event: ${message.event}`);
        return;
      }
    } catch (e) {
      // Si no es JSON válido, continuamos con el procesamiento normal
    }

    // Verificar si el evento está filtrado
    const eventType = MessageParser.extractEventType(rawMessage);
    if (eventType && this.isEventFiltered(eventType)) {
      this.log(`Event filtered: ${eventType}`);
      return;
    }

    // Parsear el mensaje
    const parsedMessage = MessageParser.parseMessage(rawMessage);
    if (parsedMessage) {
      this.log(`Parsed event: ${parsedMessage.type}`);
      this.emit(parsedMessage.type, parsedMessage.data);
    }
  }

  /**
   * Exporta el buffer de mensajes raw
   */
  exportRawMessages(): string[] {
    return [...this.messageBuffer];
  }

  /**
   * Exporta un rango de mensajes raw del buffer
   */
  exportRawMessagesInRange(startIndex: number, endIndex?: number): string[] {
    const buffer = [...this.messageBuffer];
    return endIndex
      ? buffer.slice(startIndex, endIndex)
      : buffer.slice(startIndex);
  }

  /**
   * Exporta mensajes raw filtrados por tipo de evento
   */
  exportRawMessagesByEventType(eventType: KickEventType): string[] {
    return this.messageBuffer.filter((message) => {
      const parsed = MessageParser.parseMessage(message);
      return parsed && parsed.type === eventType;
    });
  }

  /**
   * Limpia mensajes raw del buffer por tipo de evento
   */
  clearRawMessagesByEventType(eventType: KickEventType): void {
    this.messageBuffer = this.messageBuffer.filter((message) => {
      const parsed = MessageParser.parseMessage(message);
      return !(parsed && parsed.type === eventType);
    });
  }

  /**
   * Obtiene estadísticas del buffer de mensajes raw
   */
  getRawMessageStats(): {
    total: number;
    byType: Record<string, number>;
    oldestTimestamp?: Date;
    newestTimestamp?: Date;
  } {
    const stats = {
      total: this.messageBuffer.length,
      byType: {} as Record<string, number>,
      oldestTimestamp: undefined as Date | undefined,
      newestTimestamp: undefined as Date | undefined,
    };

    this.messageBuffer.forEach((message) => {
      try {
        const parsed = MessageParser.parseMessage(message);
        if (parsed) {
          stats.byType[parsed.type] = (stats.byType[parsed.type] || 0) + 1;
        }
      } catch (e) {
        // Ignorar errores al parsear para estadísticas
      }
    });

    return stats;
  }

  /**
   * Agrega un mensaje al buffer
   */
  private addToBuffer(message: string): void {
    this.messageBuffer.push(message);

    // Mantener el tamaño del buffer
    if (this.messageBuffer.length > this.options.bufferSize) {
      this.messageBuffer.shift();
    }
  }

  /**
   * Verifica si un evento está filtrado
   */
  private isEventFiltered(eventType: string): boolean {
    if (this.options.filteredEvents.length === 0) {
      return false;
    }

    // Mapear eventos de Kick.com a tipos estándar
    const eventTypeMap: { [key: string]: KickEventType } = {
      "App\\Events\\ChatMessageEvent": "ChatMessage",
      "App\\Events\\MessageDeletedEvent": "MessageDeleted",
      "App\\Events\\UserBannedEvent": "UserBanned",
      "App\\Events\\UserUnbannedEvent": "UserUnbanned",
      "App\\Events\\SubscriptionEvent": "Subscription",
      "App\\Events\\GiftedSubscriptionsEvent": "GiftedSubscriptions",
      "App\\Events\\PinnedMessageCreatedEvent": "PinnedMessageCreated",
      "App\\Events\\StreamHostEvent": "StreamHost",
      "App\\Events\\PollUpdateEvent": "PollUpdate",
      "App\\Events\\PollDeleteEvent": "PollDelete",
    };

    const standardEventType = eventTypeMap[eventType];
    return standardEventType
      ? !this.options.filteredEvents.includes(standardEventType)
      : false;
  }

  /**
   * Maneja la desconexión
   */
  private handleDisconnect(code: number, reason: string): void {
    this.setConnectionState("disconnected");
    this.emit("disconnect", { code, reason });

    // Reconexión automática si no es desconexión manual
    if (this.options.autoReconnect && !this.isManualDisconnect) {
      this.scheduleReconnect();
    }
  }

  /**
   * Maneja errores de conexión
   */
  private handleConnectionError(error: Error): void {
    this.setConnectionState("error");
    this.emit("error", error);

    if (this.options.autoReconnect && !this.isManualDisconnect) {
      this.scheduleReconnect();
    }
  }

  /**
   * Programa una reconexión
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.setConnectionState("reconnecting");
    this.log(`Scheduling reconnect in ${this.options.reconnectInterval}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.log("Attempting to reconnect...");
      this.performConnection().catch((error) => {
        this.log("Reconnection failed:", error);
      });
    }, this.options.reconnectInterval) as unknown as number;
  }

  /**
   * Desconecta manualmente
   */
  disconnect(): void {
    this.isManualDisconnect = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, "Manual disconnect");
      this.ws = null;
    }

    this.setConnectionState("disconnected");
    this.log("Manual disconnect completed");
  }

  /**
   * Obtiene información del canal
   */
  private async getChannelInfo(channelName: string): Promise<KickChannel> {
    const url = `https://kick.com/api/v2/channels/${channelName}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as KickChannel;
      return data;
    } catch (error) {
      this.log("Error fetching channel info:", error);
      throw new Error(
        `Failed to fetch channel info for ${channelName}: ${String(error)}`,
      );
    }
  }

  /**
   * Establece el estado de conexión
   */
  private setConnectionState(state: ConnectionState): void {
    const oldState = this.connectionState;
    this.connectionState = state;
    this.log(`Connection state changed: ${oldState} -> ${state}`);
  }

  /**
   * Registra mensajes de debug si está habilitado
   */
  private log(...args: unknown[]): void {
    if (this.options.debug) {
      console.log("[KickWebSocket]", ...args);
    }
  }

  /**
   * Registra un listener para un evento específico
   */
  override on<K extends keyof EventDataMap>(
    event: K,
    handler: EventHandler<EventDataMap[K]>,
  ): void {
    super.on(event, handler as EventHandler<unknown>);
  }

  /**
   * Registra un listener que se ejecuta solo una vez
   */
  override once<K extends keyof EventDataMap>(
    event: K,
    handler: EventHandler<EventDataMap[K]>,
  ): void {
    super.once(event, handler as EventHandler<unknown>);
  }

  /**
   * Elimina un listener
   */
  override off<K extends keyof EventDataMap>(
    event: K,
    handler: EventHandler<EventDataMap[K]>,
  ): void {
    super.off(event, handler as EventHandler<unknown>);
  }

  /**
   * Helper method: Escucha mensajes de chat
   */
  onChatMessage(handler: EventHandler<ChatMessageEvent>): void {
    this.on("ChatMessage", handler);
  }

  /**
   * Helper method: Escucha mensajes eliminados
   */
  onMessageDeleted(handler: EventHandler<MessageDeletedEvent>): void {
    this.on("MessageDeleted", handler);
  }

  /**
   * Helper method: Escucha usuarios baneados
   */
  onUserBanned(handler: EventHandler<UserBannedEvent>): void {
    this.on("UserBanned", handler);
  }

  /**
   * Helper method: Escucha usuarios desbaneados
   */
  onUserUnbanned(handler: EventHandler<UserUnbannedEvent>): void {
    this.on("UserUnbanned", handler);
  }

  /**
   * Helper method: Escucha suscripciones
   */
  onSubscription(handler: EventHandler<SubscriptionEvent>): void {
    this.on("Subscription", handler);
  }

  /**
   * Helper method: Escucha suscripciones regaladas
   */
  onGiftedSubscriptions(handler: EventHandler<GiftedSubscriptionsEvent>): void {
    this.on("GiftedSubscriptions", handler);
  }

  /**
   * Helper method: Escucha mensajes fijados
   */
  onPinnedMessageCreated(
    handler: EventHandler<PinnedMessageCreatedEvent>,
  ): void {
    this.on("PinnedMessageCreated", handler);
  }

  /**
   * Helper method: Escucha eventos de host
   */
  onStreamHost(handler: EventHandler<StreamHostEvent>): void {
    this.on("StreamHost", handler);
  }

  /**
   * Helper method: Escucha actualizaciones de encuestas
   */
  onPollUpdate(handler: EventHandler<PollUpdateEvent>): void {
    this.on("PollUpdate", handler);
  }

  /**
   * Helper method: Escucha eliminación de encuestas
   */
  onPollDelete(handler: EventHandler<PollDeleteEvent>): void {
    this.on("PollDelete", handler);
  }

  /**
   * Helper method: Escucha cuando la conexión está lista
   */
  onReady(handler: EventHandler<{ channel: string }>): void {
    this.on("ready", handler);
  }

  /**
   * Helper method: Escucha desconexiones
   */
  onDisconnect(
    handler: EventHandler<{ code?: number; reason?: string }>,
  ): void {
    this.on("disconnect", handler);
  }

  /**
   * Helper method: Escucha errores
   */
  onError(handler: EventHandler<Error>): void {
    this.on("error", handler);
  }

  /**
   * Helper method: Escucha mensajes raw
   */
  onRawMessage(handler: EventHandler<string>): void {
    this.on("rawMessage", handler);
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return (
      this.connectionState === "connected" &&
      this.ws?.readyState === WebSocket.OPEN
    );
  }

  /**
   * Obtiene el estado actual de conexión
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Obtiene el nombre del canal actual
   */
  getChannelName(): string {
    return this.channelName;
  }

  /**
   * Obtiene el ID del canal actual
   */
  getChannelId(): number {
    return this.channelId;
  }

  /**
   * Obtiene el buffer de mensajes
   */
  getMessageBuffer(): string[] {
    return [...this.messageBuffer];
  }

  /**
   * Limpia el buffer de mensajes
   */
  clearMessageBuffer(): void {
    this.messageBuffer = [];
  }

  /**
   * Actualiza las opciones en tiempo de ejecución
   */
  updateOptions(newOptions: Partial<KickWebSocketOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.log("Options updated:", this.options);
  }

  /**
   * Obtiene estadísticas de conexión
   */
  getStats(): {
    connectionState: ConnectionState;
    channelName: string;
    channelId: number;
    messageBufferSize: number;
    listenerCount: number;
    eventNames: string[];
    rawMessageStats: {
      total: number;
      byType: Record<string, number>;
      oldestTimestamp?: Date;
      newestTimestamp?: Date;
    };
    customWebSocketConfig: {
      url?: string;
      params?: Record<string, string>;
    };
  } {
    return {
      connectionState: this.connectionState,
      channelName: this.channelName,
      channelId: this.channelId,
      messageBufferSize: this.messageBuffer.length,
      listenerCount: this.eventNames().length,
      eventNames: this.eventNames(),
      rawMessageStats: this.getRawMessageStats(),
      customWebSocketConfig: {
        url: this.customWebSocketUrl,
        params: this.customWebSocketParams,
      },
    };
  }
}
