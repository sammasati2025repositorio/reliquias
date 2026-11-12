# Reliquias — v0.23

Reconstruido a partir de la v0.19, separado en archivos y optimizado.

## Probar
- **Un solo archivo:** abre `Reliquias-jugable.html` (lleva todo dentro, como tus versiones anteriores).
- **Carpeta:** abre `index.html`. Para regenerar el archivo único tras editar algo: `python3 empaquetar.py`.
- En ordenador, **F3** muestra FPS y tiempos.

## Qué archivo toca cada cosa
| Quiero cambiar... | Archivo |
|---|---|
| Velocidades, precios, textos, colores, teclas, fichas por planta, rendimiento | `config.js` |
| Mapas del dojo | `niveles.js` |
| Aldea, vecinos y diálogos | `aldea.js` |
| Zonas del mundo y sus misiones | `mundo.js` |
| Equipo, botín de cada planta y materiales | `equipo.js` |
| Tronco de entrenamiento y premios de la ruleta | `taller.js` |
| Dibujo de personajes en código | `personajes.js` |
| Música | `musica.js` |
| Cómo se pinta el mundo isométrico | `arte_iso.js` |
| Imágenes | carpeta `assets/` (lista en `arte.js`) |
| Lógica | `motor.js` |

## Publicar gratis
Netlify Drop: entra en https://app.netlify.com/drop y arrastra esta carpeta.

| `economia.js` | Rangos, premio diario, logros y mercado |
| `torre.js` | Torre del Dojo: 15 pisos, objetivos, 3 jefes, cartas y botín |
