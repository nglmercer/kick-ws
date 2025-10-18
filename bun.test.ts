// Configuración principal para tests con Bun
import { expect, describe, it, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";

// Configuración global para tests
beforeAll(async () => {
  // Configurar timezone para tests consistentes
  process.env.TZ = "UTC";

  // Habilitar garbage collection para tests de memoria si está disponible
  if (global.gc) {
    global.gc();
  }

  console.log("🧪 Iniciando tests con Bun");
});

afterAll(async () => {
  // Limpiar después de todos los tests
  if (global.gc) {
    global.gc();
  }

  console.log("✅ Tests completados");
});

// Configuración para cada test
beforeEach(() => {
  // Limpiar console mocks si existen
  if (console.log.mockRestore) {
    console.log.mockRestore();
  }
  if (console.error.mockRestore) {
    console.error.mockRestore();
  }
});

afterEach(() => {
  // Forzar garbage collection entre tests para tests de memoria
  if (global.gc) {
    global.gc();
  }
});

// Exportar utilidades de testing
export const testUtils = {
  // Crear un mock de WebSocket para testing
  createMockWebSocket: () => {
    const listeners: { [key: string]: Function[] } = {};

    return {
      readyState: 1, // OPEN
      addEventListener: (event: string, listener: Function) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(listener);
      },
      removeEventListener: (event: string, listener: Function) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter(l => l !== listener);
        }
      },
      send: (data: string) => {
        // Mock send - no hace nada
      },
      close: () => {
        // Mock close
      },
      // Método helper para simular eventos
      simulateEvent: (event: string, data?: any) => {
        if (listeners[event]) {
          listeners[event].forEach(listener => listener(data));
        }
      }
    };
  },

  // Crear datos de prueba para mensajes
  createTestMessage: (overrides: any = {}) => ({
    id: "test-msg-123",
    content: "Test message",
    type: "message",
    created_at: "2024-01-01T00:00:00Z",
    sender: {
      id: 12345,
      username: "testuser",
      slug: "testuser",
      identity: {
        color: "#ffffff",
        badges: []
      }
    },
    chatroom: {
      id: 67890
    },
    ...overrides
  }),

  // Crear datos de prueba para eventos
  createTestEvent: (eventType: string, data: any = {}) => ({
    event: `App\\Events\\${eventType}`,
    data: JSON.stringify(data)
  }),

  // Esperar un tiempo específico (para tests asíncronos)
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Medir tiempo de ejecución
  measureTime: async (fn: Function): Promise<{ result: any; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return { result, duration: end - start };
  },

  // Verificar uso de memoria
  getMemoryUsage: () => {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100, // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100 // MB
    };
  }
};

// Configuración específica para diferentes tipos de tests
export const testConfig = {
  // Tests de rendimiento - límites de tiempo
  performance: {
    maxEventProcessingTime: 100, // ms
    maxMessageParsingTime: 50,   // ms
    maxConnectionTime: 1000,     // ms
    maxMemoryIncrease: 10 * 1024 * 1024 // 10MB
  },

  // Tests de integración - timeouts
  integration: {
    connectionTimeout: 5000,     // ms
    messageTimeout: 2000,        // ms
    disconnectionTimeout: 1000   // ms
  },

  // Mock data - canales de prueba
  mockChannels: {
    valid: "test-channel-123",
    invalid: "nonexistent-channel-99999",
    empty: "",
    special: "channel-with-special-chars_123"
  }
};

// Matchers personalizados para tests
expect.extend({
  // Verificar que un objeto tenga las propiedades de un evento Kick
  toBeKickEvent(received: any, eventType: string) {
    const pass = received &&
                 received.type === eventType &&
                 typeof received.data === 'object';

    return {
      pass,
      message: () => `expected ${received} to be a valid ${eventType} event`
    };
  },

  // Verificar que una conexión esté en un estado específico
  toBeInConnectionState(received: any, state: string) {
    const pass = received &&
                 typeof received.getConnectionState === 'function' &&
                 received.getConnectionState() === state;

    return {
      pass,
      message: () => `expected connection to be in state ${state}`
    };
  },

  // Verificar que el tiempo de ejecución sea aceptable
  toCompleteInTime(received: number, maxTime: number) {
    const pass = received <= maxTime;

    return {
      pass,
      message: () => `expected operation to complete in ${maxTime}ms, but took ${received}ms`
    };
  }
});

// Exportar configuración por defecto para usar en otros archivos de test
export default {
  expect,
  describe,
  it,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  testUtils,
  testConfig
};
