# 🐐 La Cabra - Documentación Técnica

**La Cabra** es un componente interactivo y mascota virtual tipo "Zen" construido con React. No es solo un GIF animado; es un agente inteligente renderizado en un `<canvas>` con su propio motor de física, máquina de estados, entorno procedimental y un sentido del humor muy técnico.

---

## 🌟 Características Principales

*   **Motor de Estados (State Machine)**: Transiciones orgánicas entre estados como `IDLE` (reposo), `SLEEPING` (durmiendo), `EATING` (comiendo), `ALERT` (alerta) y `WALKING` (caminando).
*   **Física y Arrastre (Drag & Drop)**: Puedes agarrar a la cabra y soltarla en cualquier parte de la pantalla. Si la dejas lejos de su "casa" por un minuto, volverá caminando sola.
*   **Modo Caos y Rebote (DVD Bounce)**: Al darle 10 clics rápidos, entra en pánico. Con clics adicionales, sale volando y rebota por los bordes de tu pantalla, manteniendo siempre sus límites físicos.
*   **Entorno Dinámico**: Genera pasto, flores y rocas de forma procedimental a su alrededor. Este bioma se oculta automáticamente cuando la cabra es arrastrada o entra en modo caos para centrar la atención.
*   **Auto-Espejado (Mirroring)**: Detecta en qué mitad de la pantalla se encuentra y gira su cuerpo para mirar siempre hacia el centro de tu área de trabajo.
*   **Sistema de Diálogos**: Al pasar el ratón por encima (hover), suelta frases aleatorias con humor para programadores. En modo Caos, usa un `React Portal` para asegurar que su grito de pánico ("¡NO SE PUEDE LEER MIENTRAS GIRO!") se mantenga fijo y legible en pantalla.
*   **Renderizado Pixel-Perfect**: Elimina el fondo blanco de los sprites al vuelo procesando el `ImageData` del canvas, manteniendo la estética retro nítida.

---

## 📂 Arquitectura de Archivos

El sistema está dividido siguiendo el principio de responsabilidad única (Separation of Concerns):

### 1. `GoatController.js` (El Cerebro)
Es una clase Vanilla JS puro que actúa como el "Controlador" o Máquina de Estados.
*   **Maneja la lógica del tiempo**: Determina cuánto tiempo pasa en cada estado y cuándo cambiar de animación.
*   **Gestiona el diálogo**: Contiene el banco de frases y la lógica de "habla pasiva" (hablar sola cada 25-45 segundos).
*   **Gestión de Clics**: Usa un array de marcas de tiempo (`timestamps`) para detectar clics rápidos y activar el Modo Caos.
*   **Independiente de React**: Al ser una clase pura, se ejecuta increíblemente rápido sin disparar re-renderizados innecesarios en React.

### 2. `LaCabra.jsx` (El Cuerpo y el Mundo)
Es el componente React que actúa como "Vista" y motor de renderizado.
*   **Bucle de Renderizado (`requestAnimationFrame`)**: Ejecuta un loop a 60fps para actualizar físicas, partículas y pintar el `<canvas>`.
*   **Físicas (Physics Engine)**: Calcula las colisiones con los bordes de la ventana (`window.innerWidth/Height`) y la interpolación lineal (`lerp`) para que la cabra regrese suavemente a su esquina.
*   **Eventos del DOM**: Maneja `onMouseDown`, `onMouseMove` y `onMouseUp` para el arrastre interactivo.
*   **React Portals**: Utiliza `ReactDOM.createPortal` para renderizar el bocadillo de texto en el `document.body` durante el modo Caos, escapando de las transformaciones del contenedor padre.

### 3. `LaCabra.css` (El Estilo)
*   Posiciona el contenedor principal fijo (`fixed`) en la esquina inferior derecha.
*   Define animaciones clave como el `pop-up` de los diálogos, el `biome-fade` al aparecer, y el `spam-shake` epiléptico para el texto en Modo Caos.
*   Maneja las clases de estado (`.is-dragging`, `.is-chaos`) para optimizar el rendimiento y desactivar interacciones no deseadas (como el `hover` durante el arrastre).

---

## 📦 Dependencias

El componente está diseñado para ser extremadamente ligero y no depende de grandes librerías de animación (como Framer Motion o GSAP). Sus únicas dependencias son:

*   **`react`** (Hooks: `useState`, `useEffect`, `useRef`, `useCallback`)
*   **`react-dom`** (Específicamente para `ReactDOM.createPortal`)
*   **Archivos de Imagen (Sprites)**: Depende de un directorio `/public/cabra/` que contiene ~46 imágenes PNG (ej. `idle_1.png`, `eat grass.png`, `flower blue.png`).

---

## ⚙️ Cómo Funciona (El Flujo Interno)

1.  **Inicialización (`useEffect` en JSX)**: Se cargan todas las imágenes de forma asíncrona. Una función especial lee los píxeles de cada imagen y convierte el color blanco en transparente.
2.  **Generación del Bioma**: Se calculan posiciones aleatorias para elementos de fondo (back) y frente (front) como hierba y flores.
3.  **El Loop Principal (`animate`)**:
    *   Llama a `controllerRef.current.update(deltaTime)` para saber qué frame de animación toca mostrar.
    *   Ejecuta `updatePhysics()` para mover el contenedor si está siendo arrastrado, rebotando, o regresando a casa.
    *   Ejecuta `renderScene()` que limpia el canvas y pinta las capas en orden: Bioma Trasero -> Partículas -> Cabra -> Bioma Frontal.
4.  **Sistema de Pivotes**: Un diccionario interno (`PIVOTS`) en el JSX sabe exactamente cuántos píxeles desplazar a la cabra hacia abajo cuando se tumba a dormir o se agacha a comer, asegurando que sus pezuñas nunca floten sobre el suelo.

---

## 🚀 Guía de Instalación

Para integrar "La Cabra" en cualquier proyecto React, sigue estos pasos rápidos y sencillos:

### Paso 1: Copiar los Sprites (Imágenes)
Copia la carpeta completa `cabra` (que contiene todas las imágenes `.png` auditadas) y pégala dentro del directorio público de tu proyecto web (generalmente la carpeta `public/` en Vite, Next.js o Create React App). 
El componente asume que las imágenes estarán accesibles en la ruta `/cabra/nombre_imagen.png`.

### Paso 2: Copiar el Código Fuente
Añade los tres archivos del sistema en un directorio de tu proyecto (por ejemplo, dentro de `src/components/LaCabra/`):
*   `LaCabra.jsx` (El componente de React)
*   `GoatController.js` (La lógica Vanilla JS)
*   `LaCabra.css` (Los estilos y animaciones)

### Paso 3: Importar y Montar
Importa el componente `LaCabra` en tu componente raíz (como `App.jsx` o un `Layout` global) y colócalo en la estructura. Al utilizar `position: fixed` por defecto, flotará sobre el resto del contenido y se situará en la esquina inferior derecha sin afectar al flujo normal del DOM.

```jsx
import React from 'react';
// Ajusta la ruta de importación según donde guardaste los archivos
import LaCabra from './components/LaCabra/LaCabra'; 

function App() {
  return (
    <div className="App">
      {/* ... El contenido principal de tu aplicación ... */}
      <h1>Bienvenido a mi web</h1>
      <p>Explora el contenido mientras la mascota te acompaña.</p>
      
      {/* Despliega a la Cabra */}
      <LaCabra />
    </div>
  );
}

export default App;
```

¡Y eso es todo! Al levantar tu entorno de desarrollo (`npm run dev` o `npm start`), la cabra aparecerá lista para acompañar a tus usuarios.
