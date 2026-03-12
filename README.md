# ♟️ Master Chess - Edition Premium

¡Bienvenido a **Master Chess**, una plataforma de ajedrez profesional diseñada para ofrecer una experiencia estética, fluida y competitiva! Este proyecto ha sido desarrollado siguiendo los estándares de la FIDE para garantizar la precisión en cada jugada.

## 🚀 De qué trata el juego

Master Chess es más que un simple tablero; es un entorno completo para aprender, practicar y competir. Permite desde resolver tutoriales tácticos hasta enfrentarse a una Inteligencia Artificial avanzada o jugar contra oponentes de todo el mundo.

### Características Principales:
- **Reglas FIDE Completas**: Detección de Jaque Mate, Ahogado (Stalemate), Triple Repetición, Regla de 50 movimientos y Material Insuficiente.
- **Reloj de Ajedrez Profesional**: Sistema de tiempo con incrementos (Fischer) configurable (Bullet, Blitz, Rapid, Clásico).
- **IA Desafiante**: Un motor de ajedrez integrado para practicar en cualquier momento.
- **Multijugador Online**: Sistema de salas privadas utilizando tecnologías modernas de comunicación en tiempo real.
- **Herramientas Técnicas**: Soporte para copiar PGN y cargar posiciones FEN.
- **Diseño Glassmorphism**: Una interfaz moderna y futurista con efectos de brillo, animaciones fluidas y modo oscuro.

## 🛠️ Tecnologías y Herramientas Utilizadas

Este proyecto fue construido utilizando un stack de tecnologías web modernas, priorizando el rendimiento y la experiencia de usuario.

### Frontend:
- **HTML5 Semántico**: Para una estructura sólida y accesible.
- **CSS3 (Vanilla)**: Implementación de un sistema de diseño personalizado con variables, Flexbox/Grid y animaciones avanzadas.
- **JavaScript (ES6+)**: Lógica central del juego, gestión de estados y conectividad.
- **Chess.js**: Motor de validación de reglas de ajedrez.
- **Canvas-Confetti**: Efectos visuales de victoria.
- **FontAwesome & Outfit Google Font**: Iconografía y tipografía premium.

### Backend & Comunicación:
- **Node.js**: Servidor para el despliegue y gestión de conexiones.
- **WebSockets (ws)**: Servidor de señalización para conectar jugadores de forma instantánea.
- **WebRTC**: Utilizado para la comunicación directa punto a punto entre jugadores en modo Online.

## 🏗️ Proceso de Desarrollo

El desarrollo se centró en cuatro pilares fundamentales:

1.  **Validación Rigurosa**: Integración de motores de validación para asegurar que cada movimiento cumpla con las leyes del ajedrez profesional.
2.  **Interfaz de Usuario (UI/UX)**: Creación de un diseño "premium" que se aleja de los tableros tradicionales, usando efectos de vidrio y micro-animaciones (como el pulso "Touch Move").
3.  **Lógica del Tiempo**: Implementación de una clase `ChessClock` precisa que maneja milisegundos para evitar el lag y asegurar la equidad competitiva.
4.  **Optimización**: Uso de Web Workers para la IA, permitiendo que el navegador no se bloquee mientras la computadora "piensa".

## 📦 Cómo ejecutarlo localmente

1.  Clona o descarga el proyecto.
2.  Asegúrate de tener [Node.js](https://nodejs.org/) instalado.
3.  Abre una terminal en la carpeta del proyecto y ejecuta:
    ```bash
    npm install
    npm start
    ```
4.  Abre tu navegador en `http://localhost:3003`.

## 🌐 Despliegue

Este proyecto está preparado para ser desplegado en plataformas como **Render** o **Heroku**, detectando automáticamente el puerto asignado para el servidor WebSocket.

---
*Desarrollado con pasión para los amantes del ajedrez.*
