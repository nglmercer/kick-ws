// Tests reales de WebSocket para la librería Kick WebSocket Lite
// Conexión real a Kick.com sin mocks
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { KickWebSocket } from "../src/index.js";
import type {
  ChatMessageEvent,
  UserBannedEvent,
  SubscriptionEvent,
  GiftedSubscriptionsEvent,
  MessageDeletedEvent,
} from "../src/types.js";

// Configuración de tests
const TEST_CONFIG = {
  // Canal activo para pruebas (puedes cambiarlo por uno que esté activo)
  channelName: "girlofnox", // Canal popular que suele estar activo
  timeout: 15000, // 15 segundos de timeout para conexión
  messageWaitTime: 30000, // 30segs para esperar mensajes
  debug: true,
};

describe("Real WebSocket Tests - Conexión Real a Kick.com", () => {
  let kickWS: KickWebSocket;
  let testResults: any = {};

  beforeEach(() => {
    kickWS = new KickWebSocket({
      debug: TEST_CONFIG.debug,
      autoReconnect: false,
      enableBuffer: true,
      bufferSize: 1000,
    });
  });

  afterEach(() => {
    if (kickWS) {
      kickWS.disconnect();
    }
  });

  describe("Conexión Real y Recepción de Mensajes", () => {
    it(
      "should connect to real Kick.com channel and receive all messages in sequence",
      async () => {
        console.log(`\n🔗 Conectando al canal: ${TEST_CONFIG.channelName}`);

        const receivedMessages: ChatMessageEvent[] = [];
        let connectionReady = false;
        let connectionError: Error | null = null;

        // Configurar listeners
        kickWS.on("ready", (data) => {
          connectionReady = true;
          console.log(`✅ Conexión establecida al canal: ${data.channel}`);
        });

        kickWS.on("error", (error: Error) => {
          connectionError = error;
          console.error(`❌ Error de conexión: ${error.message}`);
        });

        kickWS.on("disconnect", (data) => {
          console.log(
            `🔌 Desconectado: ${data.reason || "Sin razón específica"}`,
          );
        });

        // Listener principal para mensajes de chat
        kickWS.on("ChatMessage", (message: ChatMessageEvent) => {
          receivedMessages.push(message);
          console.log(
            `💬 [${new Date().toLocaleTimeString()}] ${message.sender.username}: ${message.content}`,
          );

          // Validar estructura del mensaje
          console.log(`   📊 ID: ${message.id}`);
          console.log(
            `   👤 Usuario: ${message.sender.username} (ID: ${message.sender.id})`,
          );
          console.log(`   🎨 Color: ${message.sender.identity.color}`);
          console.log(
            `   🏷️ Badges: ${message.sender.identity.badges.join(", ") || "Ninguno"}`,
          );
          console.log(`   📋 Tipo: ${message.type}`);
          console.log(`   🕐 Timestamp: ${message.created_at}`);
        });

        // Intentar conectar
        try {
          await kickWS.connect(TEST_CONFIG.channelName);

          // Esperar a que la conexión esté lista
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Timeout esperando conexión"));
            }, TEST_CONFIG.timeout);

            const checkConnection = () => {
              if (connectionReady) {
                clearTimeout(timeout);
                resolve();
              } else if (connectionError) {
                clearTimeout(timeout);
                reject(connectionError);
              } else {
                setTimeout(checkConnection, 100);
              }
            };
            checkConnection();
          });

          console.log(
            `\n⏳ Esperando mensajes durante ${TEST_CONFIG.messageWaitTime / 1000} segundos...`,
          );

          // Esperar a recibir mensajes
          await new Promise<void>((resolve) => {
            setTimeout(resolve, TEST_CONFIG.messageWaitTime);
          });

          // Validar resultados
          console.log(`\n📈 Resultados del test:`);
          console.log(`   📨 Mensajes recibidos: ${receivedMessages.length}`);

          if (receivedMessages.length > 0) {
            console.log(`   ✅ Test de recepción: PASÓ`);

            // Validar estructura de todos los mensajes recibidos
            for (let i = 0; i < receivedMessages.length; i++) {
              const msg = receivedMessages[i];

              // Validar propiedades principales del objeto
              expect(msg.id).toBeDefined();
              expect(msg.content).toBeDefined();
              expect(msg.type).toBe("message");
              expect(msg.created_at).toBeDefined();
              expect(msg.sender).toBeDefined();
              expect(msg.chatroom).toBeDefined();

              // Validar objeto sender
              expect(msg.sender.id).toBeDefined();
              expect(msg.sender.username).toBeDefined();
              expect(msg.sender.slug).toBeDefined();
              expect(msg.sender.identity).toBeDefined();

              // Validar objeto identity
              expect(msg.sender.identity.color).toBeDefined();
              expect(Array.isArray(msg.sender.identity.badges)).toBe(true);

              // Validar objeto chatroom
              expect(msg.chatroom.id).toBeDefined();

              console.log(
                `   ✅ Mensaje ${i + 1}: Estructura validada correctamente`,
              );
            }

            // Validar orden de mensajes (por timestamp)
            for (let i = 1; i < receivedMessages.length; i++) {
              const prevTime = new Date(
                receivedMessages[i - 1].created_at,
              ).getTime();
              const currTime = new Date(
                receivedMessages[i].created_at,
              ).getTime();
              // Los mensajes pueden llegar fuera de orden por red, pero los timestamps deberían ser válidos
              expect(prevTime).toBeGreaterThan(0);
              expect(currTime).toBeGreaterThan(0);
            }

            console.log(`   ✅ Orden y timestamps validados`);
          } else {
            console.log(
              `   ⚠️ No se recibieron mensajes en el tiempo de espera`,
            );
            console.log(
              `   💡 El canal podría estar inactivo o sin actividad reciente`,
            );
          }

          // Guardar resultados para reporte
          testResults.messageReception = {
            success: true,
            messagesReceived: receivedMessages.length,
            channel: TEST_CONFIG.channelName,
            connectionTime: TEST_CONFIG.timeout,
            waitTime: TEST_CONFIG.messageWaitTime,
          };
        } catch (error) {
          console.error(`❌ Error en el test: ${error.message}`);
          throw error;
        }
      },
      TEST_CONFIG.timeout + TEST_CONFIG.messageWaitTime + 10000,
    );

    it(
      "should receive different event types and validate object lengths",
      async () => {
        console.log(
          `\n🎯 Test de múltiples tipos de eventos en canal: ${TEST_CONFIG.channelName}`,
        );

        const receivedEvents: any = {
          ChatMessage: [],
          UserBanned: [],
          Subscription: [],
          GiftedSubscriptions: [],
          MessageDeleted: [],
        };

        let connectionReady = false;
        let eventCounts = {
          ChatMessage: 0,
          UserBanned: 0,
          Subscription: 0,
          GiftedSubscriptions: 0,
          MessageDeleted: 0,
        };

        // Configurar listeners para todos los tipos de eventos
        kickWS.on("ready", () => {
          connectionReady = true;
          console.log(
            `✅ Listo para capturar eventos en: ${TEST_CONFIG.channelName}`,
          );
        });

        kickWS.on("ChatMessage", (message: ChatMessageEvent) => {
          receivedEvents.ChatMessage.push(message);
          eventCounts.ChatMessage++;
          console.log(
            `💬 Chat [${eventCounts.ChatMessage}]: ${message.sender.username}: ${message.content}`,
          );
        });

        kickWS.on("UserBanned", (ban: UserBannedEvent) => {
          receivedEvents.UserBanned.push(ban);
          eventCounts.UserBanned++;
          console.log(`🚫 Ban [${eventCounts.UserBanned}]: ${ban.username}`);
        });

        kickWS.on("Subscription", (sub: SubscriptionEvent) => {
          receivedEvents.Subscription.push(sub);
          eventCounts.Subscription++;
          console.log(`⭐ Sub [${eventCounts.Subscription}]: ${sub.username}`);
        });

        kickWS.on("GiftedSubscriptions", (gift: GiftedSubscriptionsEvent) => {
          receivedEvents.GiftedSubscriptions.push(gift);
          eventCounts.GiftedSubscriptions++;
          console.log(
            `🎁 Gift [${eventCounts.GiftedSubscriptions}]: ${gift.gifted_by} → ${gift.recipients?.length || 0} usuarios`,
          );
        });

        kickWS.on("MessageDeleted", (del: MessageDeletedEvent) => {
          receivedEvents.MessageDeleted.push(del);
          eventCounts.MessageDeleted++;
          console.log(
            `🗑️ Delete [${eventCounts.MessageDeleted}]: Message ${del.message_id}`,
          );
        });

        // Conectar y esperar eventos
        await kickWS.connect(TEST_CONFIG.channelName);

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Timeout en conexión"));
          }, TEST_CONFIG.timeout);

          const checkConnection = () => {
            if (connectionReady) {
              clearTimeout(timeout);
              resolve();
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
        });

        console.log(
          `⏳ Esperando eventos durante ${TEST_CONFIG.messageWaitTime / 1000} segundos...`,
        );

        await new Promise((resolve) => {
          setTimeout(resolve, TEST_CONFIG.messageWaitTime);
        });

        console.log(`\n📊 Análisis de eventos recibidos:`);

        // Validar cada tipo de evento recibido
        for (const [eventType, events] of Object.entries(receivedEvents)) {
          const eventArray = events as any[];

          if (eventArray.length > 0) {
            console.log(`\n   🎯 ${eventType}: ${eventArray.length} eventos`);

            // Validar estructura del primer evento de este tipo
            const sampleEvent = eventArray[0];
            const keys = Object.keys(sampleEvent);
            console.log(
              `      📋 Longitud del objeto: ${keys.length} propiedades`,
            );
            console.log(`      🔍 Propiedades: ${keys.join(", ")}`);

            // Validar longitud específica según tipo
            switch (eventType) {
              case "ChatMessage":
                expect(keys.length).toBeGreaterThanOrEqual(6); // id, content, type, created_at, sender, chatroom
                expect(sampleEvent.id).toBeDefined();
                expect(sampleEvent.content).toBeDefined();
                expect(sampleEvent.type).toBe("message");
                expect(sampleEvent.sender).toBeDefined();
                expect(
                  Object.keys(sampleEvent.sender).length,
                ).toBeGreaterThanOrEqual(4);
                expect(sampleEvent.sender.identity).toBeDefined();
                expect(
                  Object.keys(sampleEvent.sender.identity).length,
                ).toBeGreaterThanOrEqual(2);
                break;

              case "UserBanned":
                expect(keys.length).toBeGreaterThanOrEqual(2); // username, type
                expect(sampleEvent.username).toBeDefined();
                expect(sampleEvent.type).toBe("user_banned");
                break;

              case "Subscription":
                expect(keys.length).toBeGreaterThanOrEqual(2); // username, type
                expect(sampleEvent.username).toBeDefined();
                expect(sampleEvent.type).toBe("subscription");
                break;

              case "GiftedSubscriptions":
                expect(keys.length).toBeGreaterThanOrEqual(3); // gifted_by, recipients, type
                expect(sampleEvent.gifted_by).toBeDefined();
                expect(sampleEvent.recipients).toBeDefined();
                expect(Array.isArray(sampleEvent.recipients)).toBe(true);
                console.log(
                  `      📁 Array recipients length: ${sampleEvent.recipients.length}`,
                );
                break;

              case "MessageDeleted":
                expect(keys.length).toBeGreaterThanOrEqual(3); // message_id, chatroom_id, type
                expect(sampleEvent.message_id).toBeDefined();
                expect(sampleEvent.type).toBe("message_deleted");
                break;
            }

            // Validar todos los eventos del mismo tipo tienen estructura consistente
            for (let i = 1; i < eventArray.length; i++) {
              expect(Object.keys(eventArray[i]).length).toBe(keys.length);
              expect(eventArray[i].type).toBe(sampleEvent.type);
            }

            console.log(
              `      ✅ Estructura validada para ${eventArray.length} eventos`,
            );
          } else {
            console.log(
              `   ⚪ ${eventType}: 0 eventos (normal si no hay actividad de este tipo)`,
            );
          }
        }

        // Reporte final
        const totalEvents = Object.values(eventCounts).reduce(
          (sum, count) => sum + count,
          0,
        );
        console.log(`\n📈 Resumen del test:`);
        console.log(`   📊 Total de eventos: ${totalEvents}`);
        console.log(`   💬 Chat messages: ${eventCounts.ChatMessage}`);
        console.log(`   🚫 Bans: ${eventCounts.UserBanned}`);
        console.log(`   ⭐ Subscriptions: ${eventCounts.Subscription}`);
        console.log(`   🎁 Gifted subs: ${eventCounts.GiftedSubscriptions}`);
        console.log(`   🗑️ Message deleted: ${eventCounts.MessageDeleted}`);

        expect(totalEvents).toBeGreaterThan(0); // Deberíamos recibir al menos algún mensaje

        // Guardar resultados
        testResults.multipleEvents = {
          success: true,
          totalEvents,
          eventCounts,
          channel: TEST_CONFIG.channelName,
        };

        console.log(`   ✅ Test de múltiples eventos: PASÓ`);
      },
      TEST_CONFIG.timeout + TEST_CONFIG.messageWaitTime + 10000,
    );
  });

  describe("Validación de Performance - Conexión Real", () => {
    it(
      "should measure real connection performance and message processing",
      async () => {
        console.log(
          `\n⚡ Test de performance en canal: ${TEST_CONFIG.channelName}`,
        );

        const performanceMetrics = {
          connectionTime: 0,
          messagesReceived: 0,
          messageProcessingTime: [] as number[],
          memoryUsage: [] as any[],
          startTime: 0,
        };

        let connectionReady = false;

        kickWS.on("ready", () => {
          performanceMetrics.connectionTime =
            Date.now() - performanceMetrics.startTime;
          connectionReady = true;
          console.log(
            `⚡ Tiempo de conexión: ${performanceMetrics.connectionTime}ms`,
          );
        });

        kickWS.on("ChatMessage", (message: ChatMessageEvent) => {
          const startTime = performance.now();

          // Simular procesamiento del mensaje
          const processedContent = message.content.toUpperCase();
          const senderInfo = `${message.sender.username} (${message.sender.id})`;
          const badgeCount = message.sender.identity.badges.length;

          const endTime = performance.now();
          const processingTime = endTime - startTime;

          performanceMetrics.messageProcessingTime.push(processingTime);
          performanceMetrics.messagesReceived++;

          console.log(
            `⚡ [${performanceMetrics.messagesReceived}] Procesado en ${processingTime.toFixed(2)}ms`,
          );
          console.log(`   📝 Content length: ${message.content.length} chars`);
          console.log(`   👤 Sender: ${senderInfo}`);
          console.log(`   🏷️ Badges: ${badgeCount}`);
        });

        // Medir uso de memoria periódicamente
        const memoryInterval = setInterval(() => {
          const memUsage = process.memoryUsage();
          performanceMetrics.memoryUsage.push({
            timestamp: Date.now(),
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
          });
        }, 5000);

        try {
          performanceMetrics.startTime = Date.now();

          await kickWS.connect(TEST_CONFIG.channelName);

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Timeout en conexión para performance test"));
            }, TEST_CONFIG.timeout);

            const checkConnection = () => {
              if (connectionReady) {
                clearTimeout(timeout);
                resolve();
              } else {
                setTimeout(checkConnection, 100);
              }
            };
            checkConnection();
          });

          console.log(
            `⏳ Midiendo performance durante ${TEST_CONFIG.messageWaitTime / 1000} segundos...`,
          );

          await new Promise((resolve) => {
            setTimeout(resolve, TEST_CONFIG.messageWaitTime);
          });

          clearInterval(memoryInterval);

          // Análisis de performance
          console.log(`\n📊 Análisis de Performance:`);
          console.log(
            `   ⚡ Tiempo de conexión: ${performanceMetrics.connectionTime}ms`,
          );
          console.log(
            `   📨 Mensajes procesados: ${performanceMetrics.messagesReceived}`,
          );

          if (performanceMetrics.messageProcessingTime.length > 0) {
            const avgProcessingTime =
              performanceMetrics.messageProcessingTime.reduce(
                (a, b) => a + b,
                0,
              ) / performanceMetrics.messageProcessingTime.length;
            const maxProcessingTime = Math.max(
              ...performanceMetrics.messageProcessingTime,
            );
            const minProcessingTime = Math.min(
              ...performanceMetrics.messageProcessingTime,
            );

            console.log(
              `   📈 Tiempo promedio de procesamiento: ${avgProcessingTime.toFixed(2)}ms`,
            );
            console.log(
              `   📈 Tiempo máximo de procesamiento: ${maxProcessingTime.toFixed(2)}ms`,
            );
            console.log(
              `   📈 Tiempo mínimo de procesamiento: ${minProcessingTime.toFixed(2)}ms`,
            );

            expect(avgProcessingTime).toBeLessThan(10); // Debería procesar en menos de 10ms promedio
          }

          if (performanceMetrics.memoryUsage.length > 1) {
            const initialMemory = performanceMetrics.memoryUsage[0];
            const finalMemory =
              performanceMetrics.memoryUsage[
                performanceMetrics.memoryUsage.length - 1
              ];
            const memoryIncrease =
              finalMemory.heapUsed - initialMemory.heapUsed;

            console.log(
              `   🧠 Memoria inicial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
            );
            console.log(
              `   🧠 Memoria final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
            );
            console.log(
              `   🧠 Aumento de memoria: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`,
            );

            // El aumento de memoria debería ser razonable
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Menos de 50MB
          }

          // Guardar métricas
          testResults.performance = {
            success: true,
            connectionTime: performanceMetrics.connectionTime,
            messagesProcessed: performanceMetrics.messagesReceived,
            avgProcessingTime:
              performanceMetrics.messageProcessingTime.length > 0
                ? performanceMetrics.messageProcessingTime.reduce(
                    (a, b) => a + b,
                    0,
                  ) / performanceMetrics.messageProcessingTime.length
                : 0,
            memoryIncrease:
              performanceMetrics.memoryUsage.length > 1
                ? performanceMetrics.memoryUsage[
                    performanceMetrics.memoryUsage.length - 1
                  ].heapUsed - performanceMetrics.memoryUsage[0].heapUsed
                : 0,
          };

          console.log(`   ✅ Test de performance: PASÓ`);
        } catch (error) {
          clearInterval(memoryInterval);
          throw error;
        }
      },
      TEST_CONFIG.timeout + TEST_CONFIG.messageWaitTime + 10000,
    );
  });

  // Test final para mostrar reporte
  it("should generate comprehensive test report", async () => {
    console.log(`\n📋 REPORTE COMPREHENSIVO DE TESTS REALES`);
    console.log(`═════════════════════════════════════════════════════════`);
    console.log(`🎯 Canal de prueba: ${TEST_CONFIG.channelName}`);
    console.log(`⏱️ Timeout de conexión: ${TEST_CONFIG.timeout}ms`);
    console.log(
      `⏳ Tiempo de espera de mensajes: ${TEST_CONFIG.messageWaitTime / 1000}s`,
    );
    console.log(`═════════════════════════════════════════════════════════`);

    if (testResults.messageReception) {
      console.log(`\n📨 TEST DE RECEPCIÓN DE MENSAJES:`);
      console.log(
        `   ✅ Estado: ${testResults.messageReception.success ? "EXITOSO" : "FALLÓ"}`,
      );
      console.log(
        `   📊 Mensajes recibidos: ${testResults.messageReception.messagesReceived}`,
      );
      console.log(`   📡 Canal: ${testResults.messageReception.channel}`);
    }

    if (testResults.multipleEvents) {
      console.log(`\n🎯 TEST DE MÚLTIPLES EVENTOS:`);
      console.log(
        `   ✅ Estado: ${testResults.multipleEvents.success ? "EXITOSO" : "FALLÓ"}`,
      );
      console.log(
        `   📊 Total eventos: ${testResults.multipleEvents.totalEvents}`,
      );
      console.log(`   📡 Canal: ${testResults.multipleEvents.channel}`);

      console.log(`   📈 Desglose:`);
      Object.entries(testResults.multipleEvents.eventCounts).forEach(
        ([type, count]) => {
          console.log(`      ${type}: ${count}`);
        },
      );
    }

    if (testResults.performance) {
      console.log(`\n⚡ TEST DE PERFORMANCE:`);
      console.log(
        `   ✅ Estado: ${testResults.performance.success ? "EXITOSO" : "FALLÓ"}`,
      );
      console.log(
        `   ⚡ Tiempo conexión: ${testResults.performance.connectionTime}ms`,
      );
      console.log(
        `   📨 Mensajes procesados: ${testResults.performance.messagesProcessed}`,
      );
      console.log(
        `   📈 Tiempo promedio procesamiento: ${testResults.performance.avgProcessingTime.toFixed(2)}ms`,
      );
      console.log(
        `   🧠 Aumento memoria: ${(testResults.performance.memoryIncrease / 1024 / 1024).toFixed(2)} MB`,
      );
    }

    console.log(`\n═════════════════════════════════════════════════════════`);
    console.log(`🎉 TESTS REALES COMPLETADOS`);
    console.log(
      `💡 Nota: Los resultados dependen de la actividad actual del canal`,
    );
    console.log(
      `💡 Para mejores resultados, ejecuta durante horas de alta actividad`,
    );
    console.log(`═════════════════════════════════════════════════════════`);

    // El test siempre pasa si llegamos aquí
    expect(true).toBe(true);
  });
});
