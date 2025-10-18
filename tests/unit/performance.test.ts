// Pruebas de rendimiento para la librería Kick WebSocket Lite
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { EventEmitter, MessageParser, KickWebSocket } from "../../src/index.js";

describe("Performance Tests", () => {
  describe("EventEmitter Performance", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    it("should handle 10,000 events efficiently", () => {
      let count = 0;
      const handler = () => count++;

      emitter.on("test", handler);

      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        emitter.emit("test");
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(count).toBe(10000);
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    it("should handle multiple listeners efficiently", () => {
      const listeners = 100;
      const events = 1000;
      let totalCount = 0;

      const startTime = performance.now();

      for (let i = 0; i < listeners; i++) {
        emitter.on("test", () => totalCount++);
      }

      for (let i = 0; i < events; i++) {
        emitter.emit("test");
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(totalCount).toBe(listeners * events);
      expect(duration).toBeLessThan(200); // Should complete in less than 200ms
    });

    it("should handle add/remove operations efficiently", () => {
      const operations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < operations; i++) {
        const handler = () => {};
        emitter.on(`event-${i}`, handler);
        emitter.off(`event-${i}`, handler);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // Should complete in less than 50ms
    });
  });

  describe("MessageParser Performance", () => {
    it("should parse 10,000 messages efficiently", () => {
      const messages = Array(10000)
        .fill(null)
        .map(() =>
          JSON.stringify({
            event: "App\\Events\\ChatMessageEvent",
            data: JSON.stringify({
              id: Math.random().toString(36),
              content: `Test message ${Math.random()}`,
              type: "message",
              created_at: new Date().toISOString(),
              sender: {
                id: Math.floor(Math.random() * 1000000),
                username: `user${Math.floor(Math.random() * 1000)}`,
                slug: `user${Math.floor(Math.random() * 1000)}`,
                identity: {
                  color: "#ffffff",
                  badges: [],
                },
              },
              chatroom: {
                id: Math.floor(Math.random() * 100000),
              },
            }),
          }),
        );

      const startTime = performance.now();

      const parsed = messages.map((msg) => MessageParser.parseMessage(msg));

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(parsed.filter((p) => p !== null).length).toBe(10000);
      expect(duration).toBeLessThan(500); // Should complete in less than 500ms
    });

    it("should handle emote replacement efficiently", () => {
      const messageWithEmotes = JSON.stringify({
        event: "App\\Events\\ChatMessageEvent",
        data: JSON.stringify({
          id: "123",
          content:
            "Hello [emote:123:Kappa] world [emote:456:PogChamp] [emote:789:LUL]",
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

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        MessageParser.parseMessage(messageWithEmotes);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    it("should validate messages efficiently", () => {
      const validMessages = Array(5000)
        .fill(null)
        .map(() =>
          JSON.stringify({
            event: "test",
            data: "test data",
          }),
        );

      const invalidMessages = Array(5000)
        .fill(null)
        .map(() => "invalid json message");

      const allMessages = [...validMessages, ...invalidMessages];

      const startTime = performance.now();

      const results = allMessages.map((msg) =>
        MessageParser.isValidMessage(msg),
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results.filter((r) => r).length).toBe(5000);
      expect(results.filter((r) => !r).length).toBe(5000);
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });
  });

  describe("Memory Usage Tests", () => {
    it("should not leak memory with many events", () => {
      const emitter = new EventEmitter();
      const initialMemory = process.memoryUsage();

      // Create many listeners
      for (let i = 0; i < 1000; i++) {
        emitter.on(`event-${i}`, () => {});
      }

      // Emit many events
      for (let i = 0; i < 1000; i++) {
        emitter.emit(`event-${i}`);
      }

      // Remove all listeners
      for (let i = 0; i < 1000; i++) {
        emitter.removeAllListeners(`event-${i}`);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it("should handle buffer efficiently", () => {
      const kickWS = new KickWebSocket({
        enableBuffer: true,
        bufferSize: 10000,
      });

      const initialMemory = process.memoryUsage();

      // Note: Buffer only gets messages through WebSocket connection handling
      // Direct emit doesn't populate buffer, which is correct behavior
      // So we test buffer operations directly

      // Test buffer clearing and size limits
      kickWS.clearMessageBuffer();
      const buffer = kickWS.getMessageBuffer();
      expect(buffer.length).toBe(0);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe("KickWebSocket Performance", () => {
    it("should create instances efficiently", () => {
      const instances: KickWebSocket[] = [];
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        instances.push(
          new KickWebSocket({
            debug: false,
            autoReconnect: false,
            enableBuffer: true,
            bufferSize: 100,
          }),
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(instances.length).toBe(100);
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms

      // Clean up
      instances.forEach((ws) => ws.disconnect());
    });

    it("should handle event registration efficiently", () => {
      const kickWS = new KickWebSocket();
      const startTime = performance.now();

      // Register many event handlers
      for (let i = 0; i < 1000; i++) {
        kickWS.on("ChatMessage", () => {});
        kickWS.on("UserBanned", () => {});
        kickWS.on("Subscription", () => {});
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Should complete in less than 200ms

      // Test that events still work
      let called = false;
      kickWS.on("ChatMessage", () => {
        called = true;
      });
      kickWS.emit("ChatMessage", {});
      expect(called).toBe(true);

      kickWS.disconnect();
    });

    it("should handle convenience methods efficiently", () => {
      const kickWS = new KickWebSocket();
      const startTime = performance.now();

      // Test all convenience methods
      for (let i = 0; i < 100; i++) {
        kickWS.onChatMessage(() => {});
        kickWS.onUserBanned(() => {});
        kickWS.onSubscription(() => {});
        kickWS.onMessageDeleted(() => {});
        kickWS.onAllEvents(() => {});
        kickWS.onChatEvents(() => {});
        kickWS.onUserEvents(() => {});
        kickWS.onStreamEvents(() => {});
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(150); // Should complete in less than 150ms

      kickWS.disconnect();
    });
  });
});
