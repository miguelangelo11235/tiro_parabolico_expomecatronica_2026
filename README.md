# 🎮 Tiro Parabólico — Simulador Arcade

![Modo Oscuro](https://img.shields.io/badge/Est%C3%A9tica-Arcade%20%2F%20Retro-ff2d95?style=flat-square) ![JS Puro](https://img.shields.io/badge/Tecnolog%C3%ADa-Vanilla%20JS-f7df1e?style=flat-square)

Una aplicación web de una sola página diseñada para simular y comprender la física del tiro parabólico. Combina el rigor matemático con una interfaz estilizada que recuerda a los videojuegos arcade clásicos de los 80s y 90s.

## ✨ Funcionalidades Principales

*   **Física en Tiempo Real:** Simulación cinemática precisa del movimiento de un proyectil sujeto a la gravedad (9.8 m/s²).
*   **Estética Retrogaming:** Gráficos pixelados, tipografía "Press Start 2P" (carga desde Google Fonts), colores de neón intensos, scanlines CRT y partículas dinámicas.
*   **Controles Precisos:** 
    *   Ajuste simultáneo mediante sliders responsivos y cuadros de texto directo para Ángulo (0°-90°) y Velocidad (1-100 m/s). 
    *   Atajos de teclado (`Barra Espaciadora` / `Enter` para disparar/reiniciar).
*   **Fórmulas Inteligentes (Panel KaTeX):** Las fórmulas y ecuaciones del tiro parabólico se dibujan de manera elegante en el panel lateral gracias a KaTeX (estilo $\LaTeX$), permitiendo ver los datos dinámicos como altura máxima, tiempo y velocidad en todo momento.
*   **Soporte Dark / Light Mode:** Alterna en tiempo real entre la intensa estética oscura retro de neón y una paleta geométrica y limpia de colores claros para luz de día. Totalmente persistente en tus sesiones.
*   **Cero Dependencias Externas (Vanilla):** Lógica creada completamente sin librerías pesadas (como React o Three.js). Solo HTML nativo, Canvas2D API de Javascript puro y CSS3.

## 🏆 Modos de Juego (Desafíos)

La simulación deja de ser aburrida para convertirse en un videojuego:
1.  **Modo Libre:** Experimenta la física natural sin restricciones.
2.  **Reto Alcance (Distancia):** El simulador generará un objetivo aleatorio con una **bandera en el terreno** bajo una distancia determinada en metros. Usa las leyes del tiro parabólico para lograr un impacto directo.
3.  **Reto Globo (Objetivo en altura):** Trata de golpear o sobreponer tu disparo a un **globo naranja flotando en el aire** mediante el ángulo exacto durante su descenso o ascenso.

## 📁 Arquitectura y Estructura del Código

El proyecto ha sido rigurosamente refactorizado para separar sus responsabilidades y promover las mejores prácticas del desarrollo web "Vanilla".

*   `index.html`: La cáscara estructural HTML, carga las fuentes, incluye importaciones a KaTeX e inicializa los recursos y la carga de scripts.
*   `styles.css`: Hojas de estilo robustas que alojan ambos esquemas visuales (`:root` y `[data-theme="light"]`) utilizando CSS variables. Manejo responsivo total para teléfonos, tabletas y PC.
*   `physics.js`: Modulo matemático puro sin conexión al DOM. Contiene las funciones de posición, trigonometría, variables G y el conversor de magnitudes globales.
*   `renderer.js`: Módulo estricto del "Canvas". Se encarga unicamente de dibujar sobre la pantalla, abarcando estelas, física de partículas, renderizado de nubes, montañas estilo pixel, banderas de reto, targets flotantes e hitboxes.
*   `app.js`: Componente integrador de Eventos. Comunica los disparadores (inputs) con HTML, la simulación de colisión para las mecánicas de juegos de Reto, el loop del "requestAnimationFrame", y el control asincrónico del tiempo de animación.

## 🚀 Cómo ejecutarlo

Es un entorno local libre de configuraciones. Para ejecutar la simulación y visualizarla en todo su esplendor tienes muchas opciones:

**Opción A (Sencilla)**
Haz doble clic para abrir el archivo `index.html` en tu navegador de preferencia (Recomendados: Chrome, Firefox, Safari o Edge - *Debe soportar ECMAScript 5/6, HTML5 Canvas y CSS Var*).

**Opción B (Servidor Local - Recomendada para evitar bloqueos por CORS)**
Si tienes instalado Python3, abre la terminal en esa carpeta y corre:
```bash
python -m http.server 8080
```
Luego ve a `http://localhost:8080` en tu navegador. 

--

*Desarrollado para exposición de proyectos (Expo-Mecatrónica / Software libre educativo)*
