# Interview Prep Studio: Web

React frontend for Interview Prep Studio, a self-study app for technical interviews. Learners look up a topic, read its definition and Java example, get an explanation streamed from Claude Haiku, and discuss questions live with other learners and an AI tutor. Editors manage the content in **Prep Studio**.

- Backend and gRPC contracts: [interview-prep-studio-api](https://github.com/srilav/interview-prep-studio-api)
- Architecture and design: [interview-prep-studio](https://github.com/srilav/interview-prep-studio)

## Pages

| Route | What it does | Backend calls |
|---|---|---|
| `/` | Search published keys, filter by language or platform | `CatalogService.SearchKeys`, `TaxonomyAdminService.ListTree` |
| `/keys/:keyId` | Definition, Java example, streamed explanation, live discussion | `CatalogService.GetKey`, `LearningService.StreamExplanation` (server streaming), `DiscussionService.*`, STOMP |
| `/studio` | Manage Language/Platform › Category › Subcategory and keys | `TaxonomyAdminService.*` |
| `/progress` | Activity summary for the current learner | `ProgressService.GetSummary` |

There is no login yet. The app asks for a display name once, stores it in `localStorage`, and sends it as the author / learner.

## Stack

- React 18, TypeScript, Vite, React Router
- gRPC-Web via [Connect-ES v2](https://connectrpc.com/docs/web/getting-started) (`createGrpcWebTransport`) to Envoy, which forwards to the gRPC server
- STOMP over native WebSocket (`@stomp/stompjs`) for discussion
- `react-markdown` for streamed explanations

## Setup

1. Start the backend first. In the API repo, run `docker compose up -d` (Postgres and Envoy) and the Spring Boot app (see its README). Envoy serves gRPC-Web on `:8081`; the app serves WebSocket on `:8080/ws`.
2. Install and run the frontend:

```bash
npm install
cp .env.example .env   # adjust URLs if needed
npm run dev            # http://localhost:5173
```

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `VITE_GRPC_WEB_URL` | `http://localhost:8081` | Envoy gRPC-Web endpoint |
| `VITE_WS_URL` | `ws://localhost:8080/ws` | STOMP WebSocket endpoint |

## Generated code

TypeScript for the protos lives in `src/gen` and is committed, so the app builds without buf. Regenerate after the contracts change:

```bash
npm run gen         # from the API repo on GitHub (main branch, proto/ folder)
npm run gen:local   # from ../interview-prep-studio-api/proto (sibling checkout)
```

## Discussion protocol (WebSocket)

- Send to `/app/threads/{threadId}/messages`: `{"author": "...", "content": "..."}`. Mention `@tutor` to get an AI reply.
- Subscribe to `/topic/threads/{threadId}`. Frames:
  - `{"type":"message","message":{...}}` a posted message (learner or AI tutor)
  - `{"type":"ai_chunk","threadId","replyId","delta"}` streamed AI tutor text
  - `{"type":"ai_error","threadId","replyId","error"}`

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run typecheck` | Type-check only |
| `npm run gen` / `gen:local` | Regenerate `src/gen` from the protos |

## Layout

```
src/
  gen/                 generated protobuf + service descriptors (do not edit)
  lib/                 transport, clients, STOMP, learner name, labels, errors
  features/
    learn/             search page
    key/               key page with streamed explanation
    discussion/        live discussion panel
    studio/            Prep Studio admin (tree, key list, editor, preview)
    progress/          progress summary
  styles/              design tokens (light + dark) and Studio styles
```
