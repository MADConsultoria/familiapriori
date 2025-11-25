# Plataforma de Indicação – Estrutura

Este projeto está preparado para ter `frontend` e `backend`.
Por enquanto, o foco é apenas no frontend, mas já deixamos um backend (Express) pronto para quando você quiser começar a API.

## Como rodar o frontend (localhost)

- Pré‑requisitos: Node 18+ (recomendado 20+)
- Passos:
  1. Instale dependências na raiz: `npm install`
  2. Inicie o servidor local do front: `npm run dev`
  3. Abra: `http://localhost:5173`

O Vite usa `frontend/` como raiz do projeto (configurado em `vite.config.js`). Seus arquivos foram movidos para lá (`frontend/index.html`, `frontend/app.js`, `frontend/styles.css`).

## Como rodar o backend (opcional)

- Instale dependências do backend: `npm --prefix backend install`
- Suba a API em modo dev: `npm run dev:backend`
- Healthcheck: `http://localhost:3001/health`

Você também pode rodar os dois juntos:

```
npm run dev:all
```

O `vite.config.js` já está configurado com proxy para `/api` -> `http://localhost:3001`.
Assim, no frontend você pode fazer `fetch('/api/...')` quando começar a implementar a API.

## Estrutura atual

- `frontend/` (index.html, app.js, styles.css)
- `backend/` (API Express)
- `dist/` (build gerado pelo Vite)
