<template>
  <div class="voice-call-overlay" v-if="isVisible">
    <div class="call-modal">
      <div class="avatar-pulse" :class="{ ringing: isReceiving || isCalling }">
        <div class="avatar">{{ displayName[0]?.toUpperCase() }}</div>
      </div>
      <h3 class="status-title">{{ statusText }}</h3>
      <p class="name">{{ displayName }}</p>
      
      <!-- Audio elements for remote streams -->
      <audio 
        v-for="[peerId, stream] in Array.from(callState.remoteStreams.entries())" 
        :key="peerId" 
        :srcObject="stream" 
        autoplay 
      ></audio>

      <div class="actions">
        <button v-if="isReceiving" class="btn accept" @click="answerCall">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
        </button>
        <button v-if="isReceiving" class="btn reject" @click="rejectCall">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
        </button>
        <button v-if="isCalling || isActive" class="btn reject end-call" @click="endCall">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { callState, answerCall, rejectCall, endCall } from '../../../services/peerService';

const isVisible = computed(() => callState.isActive || callState.isReceiving || callState.isCalling);
const isReceiving = computed(() => callState.isReceiving);
const isCalling = computed(() => callState.isCalling);
const isActive = computed(() => callState.isActive);

const statusText = computed(() => {
  if (isReceiving.value) return callState.isGroup ? 'Incoming Group Call' : 'Incoming Call';
  if (isCalling.value) return 'Calling...';
  if (isActive.value) return callState.isGroup ? 'Group Call in Progress' : 'In Call';
  return '';
});

const displayName = computed(() => {
  if (callState.isGroup && !isReceiving.value) return 'Group Call';
  return callState.callerName || 'Unknown';
});
</script>

<style scoped>
.voice-call-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.call-modal {
  background: #111822;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 40px;
  width: 90%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
}

.avatar-pulse {
  position: relative;
  width: 80px; height: 80px;
  margin-bottom: 24px;
}

.avatar-pulse.ringing::before {
  content: '';
  position: absolute;
  top: -10px; left: -10px; right: -10px; bottom: -10px;
  border-radius: 50%;
  background: rgba(79, 172, 254, 0.2);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.9); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}

.avatar {
  width: 100%; height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 600;
  color: white;
  position: relative;
  z-index: 2;
}

.status-title {
  color: #94a3b8;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 8px 0;
}

.name {
  color: #fff;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 32px 0;
}

.actions {
  display: flex;
  gap: 20px;
}

.btn {
  width: 60px; height: 60px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition: transform 0.2s;
}

.btn:hover {
  transform: scale(1.05);
}

.btn.accept {
  background: #22c55e;
  box-shadow: 0 10px 20px rgba(34, 197, 94, 0.3);
}

.btn.reject {
  background: #ef4444;
  box-shadow: 0 10px 20px rgba(239, 68, 68, 0.3);
}

.btn.end-call {
  width: 60px; height: 60px;
}
</style>
