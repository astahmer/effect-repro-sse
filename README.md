## Issue

HMR gets stuck when frontend is connected to SSE endpoint using
`Effect.PubSub/Stream`

```sh
Restarting './src/main.ts'
Waiting for graceful termination...
# this never ends
```

## Steps to minimal reproduction

```sh
pnpm i
pnpm -F front -F back --parallel dev
```

- then visit http://localhost:5173/
- then try saving any src file in the backend folder, ex:
  [./back/src/http/demo.live.ts](./back/src/http/demo.live.ts)
- see the issue ("Waiting for graceful termination...")

-> commenting [line 9 of ./front/src/App.tsx](./front/src/App.tsx#L9) fixes the
issue:
