# Origen de esta copia

- **Fuente:** https://github.com/heygen-com/hyperframes, etiqueta `v0.8.150`, carpeta `skills/`.
- **Licencia:** Apache-2.0 (`LICENSE`).
- **Se quitó:** los archivos de prueba `*.test.mjs`.

## Por qué existe

La versión 0.9.x ya no trae `faceless-explainer` ni `general-video`, dos flujos completos para hacer un video desde un tema, con voz, guion y escenas. Además, esta versión trae los paquetes de estilo y los planos de escena que esos flujos usan.

Usa estos flujos con `npx hyperframes@0.8.150`, nunca con 0.9.9 en el mismo proyecto. Para lo demás, usa `library/hyperframes`.

Ten en cuenta que `faceless-explainer` pide música a un servicio de HeyGen que necesita sesión. Haz la música con `tools/audio/musica.py` y pon `bgm_pending:false`. Sus pruebas fallan en Windows por cómo arman las rutas; el flujo en sí funciona.
