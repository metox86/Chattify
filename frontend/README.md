# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## Video calls (PeerJS/WebRTC)

This app supports audio + video calling using PeerJS for WebRTC media and Socket.IO for signaling.

### TURN/STUN configuration (recommended for production)

Create a `.env` file in `frontend/` (or set env vars for your deployment) with either:

- `VITE_ICE_SERVERS` as a JSON array of `RTCIceServer` objects, or
- `VITE_STUN_URL` / `VITE_TURN_URL` / `VITE_TURN_USER` / `VITE_TURN_CRED`

See `frontend/.env.example` for examples.
