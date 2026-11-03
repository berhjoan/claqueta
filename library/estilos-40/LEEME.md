# Atlas de 40 estilos

Catálogo de estilos de video con recetas y dos prompts por estilo, uno para crear y otro para editar.

| Archivo | Qué es |
|---|---|
| `GUIA_ESTILOS_CLAUDE.md` | Las 40 fichas: cómo reconocer cada estilo, cómo hacerlo, qué evitar y cómo revisarlo |
| `CATALOGO_ESTILOS.json` | Lo mismo como datos, para que una IA lo consulte |
| `PROMPT_MAESTRO.txt` | Encargo base con la regla de mezcla |
| `BRIEF_EJEMPLO.json` | Ejemplo de encargo como datos |
| `referencias/` | Esquemas de S21 a S40 |

## Regla de mezcla

Base 70 %, secundario 20 %, acento 10 %. Prueba de reconocimiento: oculta la etiqueta y comprueba si se identifican dos o tres rasgos propios del estilo. Si no, solo cambiaste el color.

## Qué se dejó fuera

- **Capturas de S01 a S20.** Son fotogramas de un video de @MILLEE.MD y pertenecen a su autor. Aquí queda la descripción, y las miniaturas del panel son de producción propia.
- **El atlas en PDF.** Contiene esas capturas.

## Al leerlo con otra IA

- La guía nombra a Claude Opus 5.5 como modelo objetivo. Léelo como «la IA que estés usando».
- La guía usa Remotion como motor frecuente. En este sistema el motor por defecto es HyperFrames, y la receta se traduce: revisa `library/guias/motores.md`.
