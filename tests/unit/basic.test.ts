// Pruebas básicas para la librería Kick WebSocket Lite
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { KickWebSocket, EventEmitter, MessageParser } from "../../src/index.js";

describe("EventEmitter", () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  it("debería registrar y emitir eventos", () => {
    let received = "";

    emitter.on("test", (data: string) => {
      received = data;
    });

    emitter.emit("test", "hello");
    expect(received).toBe("hello");
  });

  it("debería manejar múltiples listeners", () => {
    let count = 0;

    emitter.on("counter", () => count++);
    emitter.on("counter", () => count++);
    emitter.emit("counter");

    expect(count).toBe(2);
  });

  it("debería eliminar listeners correctamente", () => {
    let received = "";

    const handler = (data: string) => {
      received = data;
    };

    emitter.on("test", handler);
    emitter.off("test", handler);
    emitter.emit("test", "hello");

    expect(received).toBe("");
  });

  it("debería funcionar con once", () => {
    let count = 0;

    emitter.once("once-test", () => count++);
    emitter.emit("once-test");
    emitter.emit("once-test");

    expect(count).toBe(1);
  });
});

describe("MessageParser", () => {
  it("debería parsear mensajes de chat correctamente", () => {
    const rawMessage = JSON.stringify({
      event: "App\\Events\\ChatMessageEvent",
      data: JSON.stringify({
        id: "123",
        content: "Hola mundo",
        type: "message",
        created_at: "2024-01-01T00:00:00Z",
        sender: {
          id: 456,
          username: "testuser",
          slug: "testuser",
          identity: {
            color: "#ffffff",
            badges: [],
          },
        },
        chatroom: {
          id: 789,
        },
      }),
    });

    const parsed = MessageParser.parseMessage(rawMessage);

    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe("ChatMessage");
    expect(parsed!.data).toHaveProperty("content", "Hola mundo");
    expect(parsed!.data).toHaveProperty("sender");
    expect((parsed!.data as any).sender.username).toBe("testuser");
  });

  it("debería limpiar códigos de emote", () => {
    const rawMessage = JSON.stringify({
      event: "App\\Events\\ChatMessageEvent",
      data: JSON.stringify({
        id: "123",
        content: "Hola [emote:123:Kappa] mundo [emote:456:PogChamp]",
        type: "message",
        created_at: "2024-01-01T00:00:00Z",
        sender: {
          id: 456,
          username: "testuser",
          slug: "testuser",
          identity: {
            color: "#ffffff",
            badges: [],
          },
        },
        chatroom: {
          id: 789,
        },
      }),
    });

    const parsed = MessageParser.parseMessage(rawMessage);

    expect(parsed).not.toBeNull();
    expect((parsed!.data as any).content).toBe("Hola Kappa mundo PogChamp");
  });

  it("debería parsear eventos de bans", () => {
    const rawMessage = JSON.stringify({
      event: "App\\Events\\UserBannedEvent",
      data: JSON.stringify({
        username: "banned_user",
      }),
    });

    const parsed = MessageParser.parseMessage(rawMessage);

    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe("UserBanned");
    expect((parsed!.data as any).username).toBe("banned_user");
  });

  it("debería ignorar mensajes del sistema pusher", () => {
    const rawMessage = JSON.stringify({
      event: "pusher:connection_established",
      data: '{"socket_id":"123.456","activity_timeout":120}',
    });

    const parsed = MessageParser.parseMessage(rawMessage);
    expect(parsed).toBeNull();
  });

  it("debería manejar mensajes inválidos", () => {
    const invalidMessage = "invalid json";
    const parsed = MessageParser.parseMessage(invalidMessage);
    expect(parsed).toBeNull();
  });

  it("debería verificar si un mensaje es válido", () => {
    const validMessage = JSON.stringify({
      event: "test",
      data: "test data",
    });

    const invalidMessage = "not json";

    expect(MessageParser.isValidMessage(validMessage)).toBe(true);
    expect(MessageParser.isValidMessage(invalidMessage)).toBe(false);
  });
});

describe("KickWebSocket", () => {
  let kickWS: KickWebSocket;

  beforeEach(() => {
    kickWS = new KickWebSocket({
      debug: false,
      autoReconnect: false,
    });
  });

  afterEach(() => {
    kickWS.disconnect();
  });

  it("debería crearse con opciones por defecto", () => {
    const defaultWS = new KickWebSocket();
    expect(defaultWS.isConnected()).toBe(false);
    expect(defaultWS.getConnectionState()).toBe("disconnected");
  });

  it("debería actualizar opciones", () => {
    kickWS.updateOptions({ debug: true });
    // No hay forma directa de verificar las opciones privadas,
    // pero esto no debería lanzar error
    expect(() =>
      kickWS.updateOptions({ reconnectInterval: 1000 }),
    ).not.toThrow();
  });

  it("debería registrar y eliminar eventos", () => {
    let called = false;

    const handler = () => {
      called = true;
    };

    kickWS.on("test", handler);
    kickWS.emit("test");
    expect(called).toBe(true);

    called = false;
    kickWS.off("test", handler);
    kickWS.emit("test");
    expect(called).toBe(false);
  });

  it("debería tener métodos de conveniencia", () => {
    expect(() => {
      kickWS.onChatMessage(() => {});
      kickWS.onUserBanned(() => {});
      kickWS.onSubscription(() => {});
      kickWS.onMessageDeleted(() => {});
      kickWS.onAllEvents(() => {});
      kickWS.onChatEvents(() => {});
      kickWS.onUserEvents(() => {});
      kickWS.onStreamEvents(() => {});
    }).not.toThrow();
  });

  it("debería obtener estadísticas", () => {
    const stats = kickWS.getStats();

    expect(stats).toHaveProperty("connectionState", "disconnected");
    expect(stats).toHaveProperty("channelName", "");
    expect(stats).toHaveProperty("channelId", 0);
    expect(stats).toHaveProperty("messageBufferSize", 0);
    expect(stats).toHaveProperty("listenerCount");
    expect(stats).toHaveProperty("eventNames");
  });

  it("debería manejar buffer de mensajes", () => {
    // Habilitar buffer
    kickWS.updateOptions({ enableBuffer: true });

    const buffer = kickWS.getMessageBuffer();
    expect(Array.isArray(buffer)).toBe(true);
    expect(buffer.length).toBe(0);

    // Limpiar buffer no debería lanzar error
    expect(() => kickWS.clearMessageBuffer()).not.toThrow();
  });

  it("debería crear instancias preconfiguradas", () => {
    expect(() => {
      const lightweight = KickWebSocket.createLightweight();
      const debug = KickWebSocket.createDebug();
      const analytics = KickWebSocket.createAnalytics();

      // Limpiar
      lightweight.disconnect();
      debug.disconnect();
      analytics.disconnect();
    }).not.toThrow();
  });
});

describe("Integration Tests", () => {
  it("debería simular flujo completo de conexión", async () => {
    // Este es un test de integración simulado
    // En un escenario real, necesitaríamos mockear WebSocket y fetch

    const kickWS = new KickWebSocket({
      debug: true,
      autoReconnect: false,
    });

    let readyCalled = false;
    let messageReceived = false;

    kickWS.on("ready", () => {
      readyCalled = true;
    });

    kickWS.onChatMessage(() => {
      messageReceived = true;
    });

    // Simular que la conexión falla (no hay canal real)
    try {
      await kickWS.connect("nonexistent-channel-12345");
    } catch (error) {
      // Esperamos que falle porque el canal no existe
      expect(error).toBeInstanceOf(Error);
    }

    expect(readyCalled).toBe(false);
    expect(messageReceived).toBe(false);
    expect(kickWS.isConnected()).toBe(false);

    kickWS.disconnect();
  });

  it("debería manejar múltiples conexiones", () => {
    const connections: KickWebSocket[] = [];

    for (let i = 0; i < 3; i++) {
      const ws = new KickWebSocket({
        debug: false,
        autoReconnect: false,
      });
      connections.push(ws);
    }

    // Todas deberían estar desconectadas inicialmente
    connections.forEach((ws) => {
      expect(ws.isConnected()).toBe(false);
    });

    // Limpiar
    connections.forEach((ws) => ws.disconnect());
  });
});

describe("Error Handling", () => {
  it("debería manejar errores en los listeners", () => {
    const emitter = new EventEmitter();
    let errorLogged = false;

    // Capturar console.error
    const originalConsoleError = console.error;
    console.error = () => {
      errorLogged = true;
    };

    emitter.on("error-test", () => {
      throw new Error("Test error");
    });

    emitter.emit("error-test");

    expect(errorLogged).toBe(true);

    // Restaurar console.error
    console.error = originalConsoleError;
  });

  it("debería manejar mensajes malformados", () => {
    const malformedMessages = [
      "",
      "not json",
      '{"event": "test"}', // sin data
      '{"data": "test"}', // sin event
      '{"event": "", "data": ""}', // eventos vacíos
    ];

    malformedMessages.forEach((message) => {
      const parsed = MessageParser.parseMessage(message);
      expect(parsed).toBeNull();
    });
  });
});
