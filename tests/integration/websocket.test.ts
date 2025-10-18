// Pruebas de integración para la librería Kick WebSocket Lite
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "bun:test";
import { KickWebSocket, MessageParser } from "../../src/index.js";

// Mock global WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  public readyState = MockWebSocket.CONNECTING;
  public url = "";
  private onopen: ((event: Event) => void) | null = null;
  private onclose: ((event: CloseEvent) => void) | null = null;
  private onerror: ((event: Event) => void) | null = null;
  private onmessage: ((event: MessageEvent) => void) | null = null;
  public messageQueue: string[] = [];
  public connectionTimer: NodeJS.Timeout | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate connection after a delay
    this.connectionTimer = setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
      // Simulate successful subscription response
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage(
            new MessageEvent("message", {
              data: JSON.stringify({
                event: "pusher_internal:subscription_succeeded",
                channel: "chatrooms.67890.v2",
                data: "{}",
              }),
            }),
          );
        }
      }, 10);
    }, 50);
  }

  set onopen(handler: ((event: Event) => void) | null) {
    this.onopen = handler;
  }

  set onclose(handler: ((event: CloseEvent) => void) | null) {
    this.onclose = handler;
  }

  set onerror(handler: ((event: Event) => void) | null) {
    this.onerror = handler;
  }

  set onmessage(handler: ((event: MessageEvent) => void) | null) {
    this.onmessage = handler;
  }

  send(data: string): void {
    // Simulate successful send
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error("WebSocket is not open");
    }

    // Store sent messages for potential testing
    this.messageQueue.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(
        new CloseEvent("close", { code: code || 1000, reason: reason || "" }),
      );
    }
  }

  // Helper method for testing
  simulateMessage(data: string): void {
    if (this.onmessage && this.readyState === MockWebSocket.OPEN) {
      this.onmessage(new MessageEvent("message", { data }));
    }
  }

  // Helper method for testing
  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event("error"));
    }
  }
}

// Store original globals
const originalWebSocket = global.WebSocket;
const originalFetch = global.fetch;

beforeAll(() => {
  // Mock WebSocket constructor
  global.WebSocket = MockWebSocket as any;

  // Mock fetch for channel info
  global.fetch = async (url: string) => {
    if (url.includes("kick.com/api/v2/channels/test-channel")) {
      return new Response(
        JSON.stringify({
          id: 12345,
          slug: "test-channel",
          user: {
            username: "testuser",
          },
          chatroom: {
            id: 67890,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (url.includes("kick.com/api/v2/channels/nonexistent-channel")) {
      return new Response("Channel not found", { status: 404 });
    }

    return new Response("Not Found", { status: 404 });
  };
});

afterAll(() => {
  // Restore original globals
  global.WebSocket = originalWebSocket;
  global.fetch = originalFetch;
});

describe("WebSocket Integration Tests", () => {
  let kickWS: KickWebSocket;

  beforeEach(() => {
    kickWS = new KickWebSocket({
      debug: false,
      autoReconnect: false, // Disable auto-reconnect for predictable test behavior
      enableBuffer: true,
      bufferSize: 100,
    });
  });

  afterEach(() => {
    kickWS.disconnect();
  });

  it("should connect to a channel successfully", async () => {
    let readyCalled = false;
    let channelName = "";

    kickWS.on("ready", (data: any) => {
      readyCalled = true;
      channelName = data.channel;
    });

    await kickWS.connect("test-channel");

    // Wait a bit for the async connection to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(readyCalled).toBe(true);
    expect(channelName).toBe("test-channel");
    expect(kickWS.isConnected()).toBe(true);
    expect(kickWS.getConnectionState()).toBe("connected");
  });

  it("should handle connection errors gracefully", async () => {
    let errorCalled = false;
    let errorMessage = "";

    kickWS.on("error", (error: Error) => {
      errorCalled = true;
      errorMessage = error.message;
    });

    try {
      await kickWS.connect("nonexistent-channel");
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }

    expect(kickWS.isConnected()).toBe(false);
    expect(kickWS.getConnectionState()).toBe("error");
  });

  it("should receive and parse chat messages", async () => {
    let messageReceived = false;
    let receivedMessage: any = null;

    kickWS.onChatMessage((message: any) => {
      messageReceived = true;
      receivedMessage = message;
    });

    await kickWS.connect("test-channel");

    // Wait a bit for the async connection to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate receiving a chat message
    const chatMessage = JSON.stringify({
      event: "App\\Events\\ChatMessageEvent",
      data: JSON.stringify({
        id: "msg-123",
        content: "Hello world!",
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
          id: 67890,
        },
      }),
    });

    // Get the WebSocket instance and simulate message
    const wsInstance = (kickWS as any).ws;
    if (wsInstance) {
      wsInstance.simulateMessage(chatMessage);
      // Wait a bit for message processing
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    expect(messageReceived).toBe(true);
    expect(receivedMessage).not.toBeNull();
    expect(receivedMessage.content).toBe("Hello world!");
    expect(receivedMessage.sender.username).toBe("testuser");
  });

  it("should handle user ban events", async () => {
    let banReceived = false;
    let banData: any = null;

    kickWS.onUserBanned((ban: any) => {
      banReceived = true;
      banData = ban;
    });

    await kickWS.connect("test-channel");

    // Wait for connection to be fully established
    await new Promise((resolve) => setTimeout(resolve, 100));

    const wsInstance = (kickWS as any).ws;

    // Simulate receiving a ban event
    const banEvent = JSON.stringify({
      event: "App\\Events\\UserBannedEvent",
      data: JSON.stringify({
        username: "banned-user",
        type: "user_banned",
      }),
    });

    if (wsInstance && wsInstance.readyState === MockWebSocket.OPEN) {
      wsInstance.simulateMessage(banEvent);
      // Wait a bit for message processing
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    expect(banReceived).toBe(true);
    expect(banData).not.toBeNull();
    expect(banData.username).toBe("banned-user");
  });

  it("should handle subscription events", async () => {
    let subReceived = false;
    let subData: any = null;

    kickWS.onSubscription((sub: any) => {
      subReceived = true;
      subData = sub;
    });

    await kickWS.connect("test-channel");

    // Wait for connection to be fully established
    await new Promise((resolve) => setTimeout(resolve, 100));

    const wsInstance = (kickWS as any).ws;

    // Simulate receiving a subscription event
    const subEvent = JSON.stringify({
      event: "App\\Events\\SubscriptionEvent",
      data: JSON.stringify({
        username: "subscriber",
        type: "subscription",
      }),
    });

    if (wsInstance && wsInstance.readyState === MockWebSocket.OPEN) {
      wsInstance.simulateMessage(subEvent);
      // Wait a bit for message processing
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    expect(subReceived).toBe(true);
    expect(subData).not.toBeNull();
    expect(subData.username).toBe("subscriber");
  });

  it("should handle disconnection properly", async () => {
    let disconnectCalled = false;
    let disconnectReason = "";

    kickWS.on("disconnect", (data: any) => {
      disconnectCalled = true;
      disconnectReason = data.reason || "Unknown";
    });

    await kickWS.connect("test-channel");

    // Wait a bit for the async connection to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(kickWS.isConnected()).toBe(true);

    // Manually disconnect
    kickWS.disconnect();

    expect(disconnectCalled).toBe(true);
    expect(kickWS.isConnected()).toBe(false);
    expect(kickWS.getConnectionState()).toBe("disconnected");
  });

  it("should buffer messages when enabled", async () => {
    await kickWS.connect("test-channel");

    // Wait a bit for the async connection to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    const wsInstance = (kickWS as any).ws;

    // Send multiple messages through WebSocket simulation
    const messages = [
      JSON.stringify({
        event: "App\\Events\\ChatMessageEvent",
        data: JSON.stringify({
          id: "msg-1",
          content: "message 1",
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
            id: 67890,
          },
        }),
      }),
      JSON.stringify({
        event: "App\\Events\\ChatMessageEvent",
        data: JSON.stringify({
          id: "msg-2",
          content: "message 2",
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
            id: 67890,
          },
        }),
      }),
      JSON.stringify({
        event: "App\\Events\\ChatMessageEvent",
        data: JSON.stringify({
          id: "msg-3",
          content: "message 3",
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
            id: 67890,
          },
        }),
      }),
    ];

    messages.forEach((msg) => {
      if (wsInstance.simulateMessage) {
        wsInstance.simulateMessage(msg);
      }
    });

    // Wait a bit for message processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    const buffer = kickWS.getMessageBuffer();
    // Buffer will have 4 messages (3 chat messages + 1 subscription message)
    expect(buffer.length).toBe(4);
    expect(buffer.some((msg) => msg.includes("message 1"))).toBe(true);
    expect(buffer.some((msg) => msg.includes("message 2"))).toBe(true);
    expect(buffer.some((msg) => msg.includes("message 3"))).toBe(true);

    // Clear buffer
    kickWS.clearMessageBuffer();
    expect(kickWS.getMessageBuffer().length).toBe(0);
  });

  it("should handle filtered events", async () => {
    const kickWSFiltered = new KickWebSocket({
      filteredEvents: ["ChatMessage"], // Only allow chat messages
    });

    let chatMessageReceived = false;
    let banMessageReceived = false;

    kickWSFiltered.onChatMessage(() => {
      chatMessageReceived = true;
    });

    kickWSFiltered.onUserBanned(() => {
      banMessageReceived = true;
    });

    await kickWSFiltered.connect("test-channel");

    // Wait a bit for the async connection to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    const wsInstance = (kickWSFiltered as any).ws;

    // Send chat message (should be received)
    const chatMessage = JSON.stringify({
      event: "App\\Events\\ChatMessageEvent",
      data: JSON.stringify({
        id: "msg-123",
        content: "Hello!",
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
          id: 67890,
        },
      }),
    });

    // Send ban message (should be filtered out)
    const banMessage = JSON.stringify({
      event: "App\\Events\\UserBannedEvent",
      data: JSON.stringify({
        username: "banned-user",
        type: "user_banned",
      }),
    });

    if (wsInstance.simulateMessage) {
      wsInstance.simulateMessage(chatMessage);
      wsInstance.simulateMessage(banMessage);
      // Wait a bit for message processing
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    expect(chatMessageReceived).toBe(true);
    expect(banMessageReceived).toBe(false);

    kickWSFiltered.disconnect();
  });

  it("should handle convenience methods correctly", async () => {
    let chatEventCount = 0;
    let userEventCount = 0;
    let streamEventCount = 0;

    kickWS.onChatEvents(() => {
      chatEventCount++;
    });

    kickWS.onUserEvents(() => {
      userEventCount++;
    });

    kickWS.onStreamEvents(() => {
      streamEventCount++;
    });

    await kickWS.connect("test-channel");

    // Wait a bit for the async connection to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    const wsInstance = (kickWS as any).ws;

    // Send different types of events
    const events = [
      {
        event: "App\\Events\\ChatMessageEvent",
        data: JSON.stringify({
          id: "msg-1",
          content: "Hello!",
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
            id: 67890,
          },
        }),
      },
      {
        event: "App\\Events\\UserBannedEvent",
        data: JSON.stringify({
          username: "banned-user",
          type: "user_banned",
        }),
      },
      {
        event: "App\\Events\\PollUpdateEvent",
        data: JSON.stringify({
          poll_id: "poll-123",
          question: "Test poll",
          options: [
            { id: "1", text: "Option 1", votes: 5 },
            { id: "2", text: "Option 2", votes: 3 },
          ],
          type: "poll_update",
        }),
      },
    ];

    events.forEach((event) => {
      if (wsInstance.simulateMessage) {
        wsInstance.simulateMessage(JSON.stringify(event));
      }
    });

    // Wait a bit for message processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(chatEventCount).toBe(1); // Only chat message
    expect(userEventCount).toBe(1); // Only ban event
    expect(streamEventCount).toBe(1); // Only poll event
  });

  it("should provide accurate statistics", async () => {
    await kickWS.connect("test-channel");

    // Wait a bit for the async connection to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    const stats = kickWS.getStats();

    expect(stats).toHaveProperty("connectionState", "connected");
    expect(stats).toHaveProperty("channelName", "test-channel");
    expect(stats).toHaveProperty("channelId", 67890);
    expect(stats).toHaveProperty("messageBufferSize", 1); // 1 subscription message
    expect(stats).toHaveProperty("listenerCount");
    expect(stats).toHaveProperty("eventNames");

    // Note: Adding messages via emit doesn't affect buffer since buffer only gets messages from WebSocket
    // So we expect the buffer size to remain the same
    const updatedStats = kickWS.getStats();
    expect(updatedStats.messageBufferSize).toBe(1); // Still 1 subscription message
  });
});

describe("WebSocket Error Handling", () => {
  it("should handle WebSocket connection errors", async () => {
    const kickWS = new KickWebSocket();

    let errorCalled = false;
    kickWS.on("error", () => {
      errorCalled = true;
    });

    // Mock WebSocket to throw error on connection
    class ErrorWebSocket extends MockWebSocket {
      constructor(url: string) {
        super(url);
        // Override the automatic connection to simulate error
        if (this.connectionTimer) {
          clearTimeout(this.connectionTimer);
        }

        // Simulate immediate error
        setTimeout(() => {
          this.readyState = MockWebSocket.CLOSED;
          if (this.onerror) {
            this.onerror(new Event("error"));
          }
          if (this.onclose) {
            this.onclose(
              new CloseEvent("close", {
                code: 1006,
                reason: "Connection failed",
              }),
            );
          }
        }, 10);
      }
    }

    global.WebSocket = ErrorWebSocket as any;
    kickWS.updateOptions({ autoReconnect: false }); // Disable auto-reconnect for this test

    // With autoReconnect disabled, the connection will fail but not transition to disconnected
    // It will stay in error state since we manually handle the error
    try {
      await kickWS.connect("test-channel");
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      // Expected to fail
    }

    // Wait a bit for the connection to fail
    await new Promise((resolve) => setTimeout(resolve, 100));

    // The connection state should be disconnected after handling the error
    expect(kickWS.getConnectionState()).toBe("disconnected");
    kickWS.disconnect();
  });

  it("should handle malformed messages gracefully", async () => {
    // Reset WebSocket to the normal MockWebSocket
    global.WebSocket = MockWebSocket as any;

    const kickWS = new KickWebSocket({
      debug: false,
      autoReconnect: false,
    });
    let errorCount = 0;

    kickWS.on("error", () => {
      errorCount++;
    });

    await kickWS.connect("test-channel");

    // Wait a bit for the async connection to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Connection should be established
    expect(kickWS.isConnected()).toBe(true);

    const wsInstance = (kickWS as any).ws;

    // Send malformed messages
    const malformedMessages = [
      "invalid json",
      '{"event": "test"}', // missing data
      '{"data": "test"}', // missing event
      '{"event": "", "data": ""}', // empty event
      null,
      undefined,
    ];

    malformedMessages.forEach((msg) => {
      if (wsInstance.simulateMessage) {
        wsInstance.simulateMessage(msg);
      }
    });

    // Wait a bit for message processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should not crash, but may log errors - connection should still be active
    expect(kickWS.isConnected()).toBe(true);
    kickWS.disconnect();
  });
});
