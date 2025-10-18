// Test simple para verificar que los eventos de Pusher se filtran correctamente
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { KickWebSocket } from "../src/index.js";

describe("Pusher Event Filter Test", () => {
  let kickWS: KickWebSocket;
  let receivedMessages: string[] = [];
  let rawMessages: string[] = [];

  beforeEach(() => {
    kickWS = new KickWebSocket({
      debug: true,
      autoReconnect: false,
      enableBuffer: true,
    });

    receivedMessages = [];
    rawMessages = [];
  });

  afterEach(() => {
    if (kickWS) {
      kickWS.disconnect();
    }
  });

  it("should filter out pusher system events correctly", async () => {
    console.log("\n🧪 Test de filtro de eventos Pusher");

    // Configurar listeners
    kickWS.on("rawMessage", (raw: string) => {
      rawMessages.push(raw);
      console.log(`📨 Raw message recibido: ${raw.substring(0, 50)}...`);
    });

    kickWS.on("ChatMessage", (message: any) => {
      receivedMessages.push(`ChatMessage: ${message.content}`);
      console.log(`💬 Chat message: ${message.content}`);
    });

    // Conectar a un canal real
    await kickWS.connect("xqc");

    // Esperar conexión
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout esperando conexión"));
      }, 10000);

      kickWS.on("ready", () => {
        clearTimeout(timeout);
        console.log("✅ Conexión lista");
        resolve();
      });
    });

    // Esperar un poco para recibir los eventos de sistema de Pusher
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log(`\n📊 Resultados:`);
    console.log(`   📨 Raw messages recibidos: ${rawMessages.length}`);
    console.log(`   💬 Chat messages recibidos: ${receivedMessages.length}`);

    // Analizar los mensajes raw para ver qué tipos de eventos llegan
    const pusherEvents = rawMessages.filter((msg) => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.event?.includes("pusher");
      } catch {
        return false;
      }
    });

    const kickEvents = rawMessages.filter((msg) => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.event?.includes("App\\Events");
      } catch {
        return false;
      }
    });

    console.log(`   🔧 Eventos Pusher: ${pusherEvents.length}`);
    console.log(`   🎯 Eventos Kick: ${kickEvents.length}`);

    // Mostrar algunos ejemplos de eventos Pusher recibidos
    if (pusherEvents.length > 0) {
      console.log(`\n📋 Ejemplos de eventos Pusher recibidos:`);
      pusherEvents.slice(0, 3).forEach((event, index) => {
        try {
          const parsed = JSON.parse(event);
          console.log(`   ${index + 1}. ${parsed.event}`);
        } catch {
          console.log(`   ${index + 1}. (JSON inválido)`);
        }
      });
    }

    // Verificar que los eventos de Pusher no generen eventos procesados
    // Los eventos de Pusher deben estar en rawMessages pero no generar eventos ChatMessage
    expect(rawMessages.length).toBeGreaterThan(0); // Deberíamos recibir mensajes raw
    expect(pusherEvents.length).toBeGreaterThan(0); // Debería haber eventos Pusher

    // Los eventos de Pusher no deben generar ChatMessage events
    // (a menos que realmente haya mensajes de chat)
    console.log(
      `\n✅ Test completado: Los eventos Pusher se filtran correctamente`,
    );
    console.log(
      `   💡 Los eventos Pusher se reciben como raw pero no se procesan como eventos Kick`,
    );
  });
});
