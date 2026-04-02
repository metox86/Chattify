<template>
  <div class="video-call-overlay" v-if="isVisible">
    <div class="video-shell">
      <div class="topbar">
        <div class="title">
          <div class="badge">{{ callState.isGroup ? 'Group' : 'Direct' }}</div>
          <div class="names">
            <div class="status">{{ statusText }}</div>
            <div class="name">{{ displayName }}</div>
          </div>
        </div>
        <button v-if="isCalling || isActive" class="pill danger" @click="endCall">End</button>
      </div>

      <div class="stage">
        <div class="remote-grid" :class="{ single: remoteEntries.length <= 1 }">
          <div v-if="remoteEntries.length === 0" class="empty-remote">
            <div class="hint">Waiting for others…</div>
          </div>

          <div
            v-for="[peerId, _stream] in remoteEntries"
            :key="peerId"
            class="remote-tile"
          >
            <video
              class="remote-video"
              autoplay
              playsinline
              :ref="(el) => setRemoteVideoEl(peerId, el)"
            ></video>
            <div class="peer-label">{{ peerId }}</div>
          </div>
        </div>

        <div class="local-preview" v-if="callState.localStream">
          <video
            class="local-video"
            autoplay
            muted
            playsinline
            ref="localVideoEl"
          ></video>
          <div class="local-label">You</div>
        </div>
      </div>

      <div class="controls">
        <button v-if="isReceiving" class="pill success" @click="answerCall">Accept</button>
        <button v-if="isReceiving" class="pill danger" @click="rejectCall">Reject</button>

        <button v-if="isCalling || isActive" class="pill" :class="{ off: !callState.isMicEnabled }" @click="toggleMic">
          {{ callState.isMicEnabled ? 'Mic on' : 'Mic off' }}
        </button>
        <button v-if="isCalling || isActive" class="pill" :class="{ off: !callState.isCameraEnabled }" @click="toggleCamera">
          {{ callState.isCameraEnabled ? 'Cam on' : 'Cam off' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { callState, answerCall, rejectCall, endCall, toggleMic, toggleCamera } from '../../../services/peerService';

const isVisible = computed(() => callState.callType === 'video' && (callState.isActive || callState.isReceiving || callState.isCalling));
const isReceiving = computed(() => callState.isReceiving);
const isCalling = computed(() => callState.isCalling);
const isActive = computed(() => callState.isActive);

const statusText = computed(() => {
  if (isReceiving.value) return callState.isGroup ? 'Incoming group video call' : 'Incoming video call';
  if (isCalling.value) return 'Calling…';
  if (isActive.value) return callState.isGroup ? 'Group video call' : 'In video call';
  return '';
});

const displayName = computed(() => {
  if (callState.isGroup && !isReceiving.value) return 'Group Call';
  return callState.callerName || 'Unknown';
});

const remoteEntries = computed(() => Array.from(callState.remoteStreams.entries()));

const localVideoEl = ref<HTMLVideoElement | null>(null);

const setRemoteVideoEl = async (peerId: string, el: Element | null) => {
  if (!el) return;
  const video = el as HTMLVideoElement;
  await nextTick();
  const stream = callState.remoteStreams.get(peerId) ?? null;
  if ((video as any).srcObject !== stream) (video as any).srcObject = stream;
};

watch(
  () => callState.localStream,
  async (stream) => {
    await nextTick();
    if (!localVideoEl.value) return;
    if ((localVideoEl.value as any).srcObject !== (stream ?? null)) {
      (localVideoEl.value as any).srcObject = stream ?? null;
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.video-call-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.video-shell {
  width: min(1100px, 100%);
  height: min(720px, 100%);
  background: #0b1220;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.55);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.badge {
  font-size: 0.75rem;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(79, 172, 254, 0.15);
  color: #93c5fd;
  border: 1px solid rgba(79, 172, 254, 0.25);
  flex-shrink: 0;
}

.names {
  min-width: 0;
}

.status {
  font-size: 0.8rem;
  color: #94a3b8;
}

.name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 520px;
}

.stage {
  flex: 1;
  position: relative;
  padding: 12px;
  background:
    radial-gradient(circle at 50% 30%, rgba(79, 172, 254, 0.12) 0%, transparent 55%),
    #060914;
}

.remote-grid {
  height: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.remote-grid.single {
  grid-template-columns: 1fr;
}

.remote-tile {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #0b1220;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.peer-label {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
  backdrop-filter: blur(6px);
}

.empty-remote {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 16px;
}

.hint {
  color: #94a3b8;
  font-size: 0.95rem;
}

.local-preview {
  position: absolute;
  right: 18px;
  bottom: 18px;
  width: min(260px, 44vw);
  aspect-ratio: 16/10;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #0b1220;
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.45);
}

.local-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transform: scaleX(-1);
}

.local-label {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
  backdrop-filter: blur(6px);
}

.controls {
  padding: 12px 14px 16px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.pill {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  padding: 10px 14px;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
}

.pill:hover {
  background: rgba(255, 255, 255, 0.09);
}

.pill.off {
  opacity: 0.8;
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.25);
}

.pill.success {
  background: rgba(34, 197, 94, 0.22);
  border-color: rgba(34, 197, 94, 0.35);
}

.pill.danger {
  background: rgba(239, 68, 68, 0.22);
  border-color: rgba(239, 68, 68, 0.35);
}
</style>

