# 🌐 Uso en Navegador (Client-Side)

Kick WebSocket Lite es totalmente compatible con el uso en navegadores modernos. Esta guía te muestra cómo integrar la librería en aplicaciones web del lado del cliente.

## 📋 Requisitos del Navegador

### ✅ Navegadores Soportados
- Chrome 80+
- Firefox 72+
- Safari 13.1+
- Edge 80+

### 🔧 APIs Requeridas
- **WebSocket API** - Para conexión en tiempo real
- **Fetch API** - Para obtener información del canal (con polyfill opcional)
- **ES2020** - Soporte de características modernas de JavaScript

## 🚀 Instalación y Uso

### Opción 1: CDN (Recomendado para prototipos)

```html
<!-- Versión minificada -->
<script src="https://unpkg.com/kick-ws@latest/dist/browser/kick-ws.min.js"></script>

<!-- O versión development -->
<script src="https://unpkg.com/kick-ws@latest/dist/browser/index.js"></script>
```

### Opción 2: Módulos ES (Recomendado para producción)

```html
<script type="module">
  import { KickWebSocket } from 'https://unpkg.com/kick-ws@latest/dist/browser/index.js';

  // Tu código aquí
</script>
```

### Opción 3: Bundler (Webpack, Vite, Rollup)

```bash
npm install kick-ws
```

```javascript
import { KickWebSocket } from 'kick-ws/browser';

// Tu código aquí
```

## 📖 Ejemplos de Uso

### Ejemplo Básico

```html
<!DOCTYPE html>
<html>
<head>
    <title>Kick WebSocket - Ejemplo</title>
</head>
<body>
    <div id="messages"></div>

    <script type="module">
        import { KickWebSocket } from 'https://unpkg.com/kick-ws@latest/dist/browser/index.js';

        const kickWS = new KickWebSocket({ debug: true });
        const messagesDiv = document.getElementById('messages');

        // Conectar a un canal
        kickWS.connect('xqc');

        // Escuchar mensajes de chat
        kickWS.onChatMessage((message) => {
            const messageEl = document.createElement('div');
            messageEl.innerHTML = `
                <strong>${message.sender.username}:</strong> ${message.content}
            `;
            messagesDiv.appendChild(messageEl);
        });

        // Eventos de conexión
        kickWS.on('ready', () => {
            console.log('✅ Conectado exitosamente');
        });

        kickWS.on('error', (error) => {
            console.error('❌ Error:', error);
        });
    </script>
</body>
</html>
```

### Verificación de Compatibilidad

```javascript
import { checkBrowserCompatibility, createKickWebSocket } from 'kick-ws/browser';

// Verificar compatibilidad
const compatibility = checkBrowserCompatibility();

if (!compatibility.compatible) {
    console.error('❌ Navegador no compatible:', compatibility.missing);
    // Mostrar mensaje al usuario
} else {
    console.log('✅ Navegador compatible');

    // Crear instancia con verificación automática
    const { instance } = createKickWebSocket({ debug: true });
    instance.connect('nombre-del-canal');
}
```

### Aplicación React

```jsx
import React, { useState, useEffect } from 'react';
import { KickWebSocket } from 'kick-ws/browser';

function ChatComponent({ channelName }) {
    const [messages, setMessages] = useState([]);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const kickWS = new KickWebSocket({ debug: true });

        kickWS.onChatMessage((message) => {
            setMessages(prev => [...prev, message]);
        });

        kickWS.on('ready', () => {
            setConnected(true);
        });

        kickWS.on('disconnect', () => {
            setConnected(false);
        });

        kickWS.connect(channelName);

        return () => {
            kickWS.disconnect();
        };
    }, [channelName]);

    return (
        <div>
            <div>Estado: {connected ? '🟢 Conectado' : '🔴 Desconectado'}</div>
            <div>
                {messages.map((msg, idx) => (
                    <div key={idx}>
                        <strong>{msg.sender.username}:</strong> {msg.content}
                    </div>
                ))}
            </div>
        </div>
    );
}
```

### Aplicación Vue

```vue
<template>
    <div>
        <div>Estado: {{ connected ? '🟢 Conectado' : '🔴 Desconectado' }}</div>
        <div v-for="message in messages" :key="message.id">
            <strong>{{ message.sender.username }}:</strong> {{ message.content }}
        </div>
    </div>
</template>

<script>
import { KickWebSocket } from 'kick-ws/browser';

export default {
    props: ['channelName'],
    data() {
        return {
            kickWS: null,
            messages: [],
            connected: false
        };
    },
    mounted() {
        this.kickWS = new KickWebSocket({ debug: true });

        this.kickWS.onChatMessage((message) => {
            this.messages.push(message);
        });

        this.kickWS.on('ready', () => {
            this.connected = true;
        });

        this.kickWS.on('disconnect', () => {
            this.connected = false;
        });

        this.kickWS.connect(this.channelName);
    },
    beforeUnmount() {
        if (this.kickWS) {
            this.kickWS.disconnect();
        }
    }
};
</script>
```

## ⚙️ Configuración Avanzada

### Polyfills para Navegadores Antiguos

```html
<!-- Polyfill para Fetch API -->
<script src="https://cdn.jsdelivr.net/npm/whatwg-fetch@3.6.2/dist/fetch.umd.js"></script>

<!-- Polyfill para WebSocket (si es necesario) -->
<script src="https://cdn.jsdelivr.net/npm/websocket-polyfill@0.0.3/index.js"></script>

<!-- Luego la librería -->
<script src="https://unpkg.com/kick-ws@latest/dist/browser/kick-ws.min.js"></script>
```

### Configuración CORS

Para evitar problemas de CORS, asegúrate de que el servidor de Kick.com permita las solicitudes desde tu dominio. La librería hace solicitudes a:

- `https://kick.com/api/v2/channels/{channel}` - Para obtener información del canal
- `wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679` - Para conexión WebSocket

### Manejo de Errores

```javascript
import { KickWebSocket } from 'kick-ws/browser';

const kickWS = new KickWebSocket();

kickWS.on('error', (error) => {
    if (error.message.includes('CORS')) {
        console.error('Error de CORS - considera usar un proxy');
        // Implementar lógica de proxy si es necesario
    } else if (error.message.includes('WebSocket')) {
        console.error('Error de conexión WebSocket');
        // Implementar lógica de reconexión
    } else {
        console.error('Error general:', error);
    }
});

kickWS.on('disconnect', ({ reason }) => {
    console.log('Desconectado:', reason);
    // Implementar lógica de reconexión automática
});
```

## 🔧 Herramientas de Depuración

La librería expone utilidades de depuración en el objeto global `window.KickWebSocketLite`:

```javascript
// Acceder a información de depuración
console.log(window.KickWebSocketLite.VERSION);
console.log(window.KickWebSocketLite.BROWSER_INFO);

// Verificar compatibilidad
const compat = window.KickWebSocketLite.checkBrowserCompatibility();
console.log('Compatible:', compat.compatible);
console.log('Faltantes:', compat.missing);
```

## 📱 Consideraciones Móviles

### Optimizaciones para Móvil

```javascript
const kickWS = new KickWebSocket({
    debug: false, // Desactivar debug en producción
    autoReconnect: true,
    reconnectInterval: 10000, // Intervalo más largo para móviles
    enableBuffer: true,
    bufferSize: 500, // Buffer más pequeño para ahorrar memoria
});
```

### Manejo de Conexión Inestable

```javascript
// Detectar cambios de conexión
window.addEventListener('online', () => {
    console.log('Conexión restaurada');
    if (!kickWS.isConnected()) {
        kickWS.connect(channelName);
    }
});

window.addEventListener('offline', () => {
    console.log('Conexión perdida');
    // La librería manejará la reconexión automáticamente
});
```

## 🚨 Limitaciones y Consideraciones

1. **CORS**: Las solicitudes a la API de Kick pueden estar sujetas a políticas CORS
2. **Conexiones Múltiples**: Limita el número de pestañas con conexiones activas
3. **Batería**: Las conexiones WebSocket consumen batería en dispositivos móviles
4. **Red**: Considera el uso de datos móviles en conexiones inestables

## 📚 Ejemplos Completos

Puedes encontrar ejemplos completos en la carpeta `examples/browser/` del repositorio:

- `index.html` - Ejemplo básico con UI completa
- `react-example.html` - Integración con React
- `vue-example.html` - Integración con Vue.js
- `mobile-optimized.html` - Versión optimizada para móviles

## 🆘 Soporte

Si encuentras problemas específicos del navegador:

1. Verifica la compatibilidad con `checkBrowserCompatibility()`
2. Revisa la consola para errores específicos
3. Prueba con polyfills si usas navegadores antiguos
4. Considera usar un proxy si tienes problemas de CORS

Para más ayuda, abre un issue en el repositorio del proyecto.
