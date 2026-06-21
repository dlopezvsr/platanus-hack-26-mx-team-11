# Sentinel

<img src="./project-logo.png" alt="Sentinel logo" width="140" />

Sentinel es una capa de seguridad para equipos que usan Claude Code con miembros no técnicos. El equipo técnico define políticas para evitar riesgos como que se filtren datos sensibles, y Sentinel interviene cuando una sesión se sale de esos límites. Los miembros siguen construyendo con el agente, mientras el dashboard muestra actividad, decisiones y alertas en tiempo real.

## Demo

https://platanus-hack-26-mx-team-11.vercel.app/

## Cómo funciona

Para el miembro no técnico, Sentinel casi no cambia el flujo: instala una configuración de Claude Code y sigue construyendo con el agente. Si pide algo riesgoso, Sentinel puede agregar contexto seguro, sugerir una versión más segura o bloquear la acción con una explicación.

Para el equipo técnico, Sentinel funciona como una consola de control: el CTO invita miembros, los organiza en grupos, define políticas y revisa sesiones, riesgos y decisiones desde el dashboard.

```text
Miembro no técnico + Claude Code
          |
          | prompts y tool calls
          v
Sentinel
  - aplica políticas del grupo
  - guía o bloquea acciones riesgosas
  - registra sesiones y decisiones
          |
          v
Dashboard para CTO / equipo técnico
```

## Qué incluye

- Dashboard de sesiones y eventos de Claude Code.
- Grupos y políticas para miembros no técnicos.
- Evaluación de prompts antes de enviarlos al agente.
- Guard live para tool calls usando las políticas actuales.
- Modo demo local sin Supabase.

## Correr localmente

```bash
npm install
npm run dev
```

La app corre en modo demo sin Supabase. Con Supabase y Anthropic configurados, habilita auth, persistencia, tokens por miembro y análisis de riesgo con IA.

## Stack

Next.js, React, TypeScript, Supabase y Anthropic Claude.

## Equipo

- Diego Lopez ([@dlopezvsr](https://github.com/dlopezvsr))
- Juan Manuel Hernández Pérez ([@jma-hdz](https://github.com/jma-hdz))
- Alejandro Maguey Rentería ([@alexmaguey](https://github.com/alexmaguey))
- Alden Myers ([@kaldenm](https://github.com/kaldenm))
