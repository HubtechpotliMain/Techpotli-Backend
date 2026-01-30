# WebSocket Plan (Admin-Only Real-Time)

**Scope:** Admin-facing real-time updates only. No WebSockets for storefront users.

## Events to Emit

| Event             | When                                      | Payload (example)                                              |
|-------------------|-------------------------------------------|----------------------------------------------------------------|
| `banner.updated`  | After hero banner create/update/delete/batch | `{ id?, ids?, action: 'created' \| 'updated' \| 'deleted' \| 'reordered' }` |
| `product.updated` | After product create/update/delete (Medusa core) | `{ id }`                                                   |
| `order.updated`   | After order state change (e.g. placed, fulfilled) | `{ id, status? }`                                          |

## Implementation Outline

1. **Server**
   - Add Socket.IO (or Medusa-compatible WS) on the **admin** path only (e.g. mount under `/admin-ws` or same origin with admin auth).
   - Emit from:
     - Custom admin hero-banner routes: after successful mutation, call `invalidateHeroBannersCache` and emit `banner.updated`.
     - Medusa subscribers: for `product.updated` / `order.updated` (or equivalent), emit the event to the admin channel.
   - Restrict connection to authenticated admin users (verify JWT/session before accepting socket).

2. **Admin UI**
   - One socket connection per admin tab.
   - Listen for `banner.updated`, `product.updated`, `order.updated`.
   - On event: refetch the affected list or apply optimistic-update rollback/refresh so the UI stays in sync without full page reload.

3. **Lightweight**
   - No storefront socket connections; no broadcasting to anonymous users.
   - Keep payloads minimal (IDs + action).

## Suggested File Layout

- `src/websocket/` or `src/api/ws/`: initialize Socket.IO server and attach to the HTTP server (Medusa allows this in custom bootstrap or middleware).
- Reuse `src/subscribers/` for product/order events; add emission to the admin WebSocket channel there.
- Admin hero-banner routes already call `invalidateHeroBannersCache`; add one line to emit `banner.updated` when the WebSocket server is implemented.

## Dependencies

- Add `socket.io` (and optionally `@types/socket.io`) when implementing.
- Ensure the WebSocket server is created only when the Medusa HTTP server is ready (e.g. in a lifecycle hook or custom bootstrap).
