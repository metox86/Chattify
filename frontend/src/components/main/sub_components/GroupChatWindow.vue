<template>
  <div class="chat-window group-chat-window">
    <div class="chat-header">
      <div class="contact-info">
        <button v-if="props.showBack" class="back-btn" @click="emit('back')" title="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div class="avatar group-avatar">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        </div>
        <div class="contact-text">
          <span class="username">{{ group.name }}</span>
          <span class="status">Group Chat</span>
        </div>
      </div>
      <div class="header-actions">
        <!-- Voice/Video buttons are NOT disabled in group chat based on friendship -->
        <button class="icon-btn" title="Voice Call">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
        </button>
        <button class="icon-btn" title="Video Call">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" class="video-icon"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
        </button>
      </div>
    </div>

    <div class="messages-container" ref="messagesContainer">
      <div v-if="!group.messages || group.messages.length === 0" class="no-messages">
        <p>No messages yet. Say hi to the group!</p>
      </div>
      
      <div v-else class="message-list">
        <div 
          v-for="(msg, index) in group.messages" 
          :key="msg.id || index"
          class="message-wrapper"
          :class="['message-wrapper', msg.sender_id === currentUser ? 'sent' : 'received']"
        >
          <div class="message-bubble">
            <span class="sender-name" v-if="msg.sender_id !== currentUser">{{ msg.sender_username }}</span>
            <span class="text">{{ msg.content }}</span>
            <span class="time">{{ formatTime(msg.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-input-area">
      <!-- Typing indicator logic omitted for group for simplicity -- or can be added -->
      <form @submit.prevent="submitMessage" class="input-form">
        <button type="button" class="attach-btn" title="Attach File">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
        </button>
        <input 
          type="text" 
          v-model="newMessage" 
          placeholder="Type a message to the group..." 
          @input="onInput"
        />
        <button type="submit" class="send-btn" :disabled="!newMessage.trim()">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" class="send-icon"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';

const props = defineProps<{
  group: any;
  currentUser: number;
  showBack?: boolean;
}>();

const emit = defineEmits(['send-group-message', 'typing', 'back']);

const newMessage = ref<string>('');
const messagesContainer = ref<HTMLElement | null>(null);

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

watch(() => props.group.messages, () => {
  scrollToBottom();
}, { deep: true, flush: 'post' });

watch(() => props.group?.id, () => {
  scrollToBottom();
}, { immediate: true, flush: 'post' });

onMounted(() => {
  scrollToBottom();
});

const formatTime = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const onInput = () => {
  emit('typing');
};

const submitMessage = () => {
  if (!newMessage.value.trim()) return;
  emit('send-group-message', newMessage.value.trim());
  newMessage.value = '';
};
</script>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #090a0f;
  background-image: radial-gradient(circle at 50% 50%, rgba(79, 172, 254, 0.03) 0%, transparent 80%);
}

.chat-header {
  height: 60px;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 10;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.icon-btn, .attach-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-btn:hover, .attach-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #4facfe;
}

.contact-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #fff;
}

.group-avatar {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.contact-text {
  display: flex;
  flex-direction: column;
}

.username {
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
}

.status {
  font-size: 0.8rem;
  color: #22c55e;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.messages-container::-webkit-scrollbar {
  width: 6px;
}
.messages-container::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
}

.no-messages {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-style: italic;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-wrapper {
  display: flex;
  width: 100%;
}

.message-wrapper.sent {
  justify-content: flex-end;
}

.message-wrapper.received {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 65%;
  padding: 10px 14px;
  border-radius: 16px;
  position: relative;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.sender-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: #10b981;
  margin-bottom: 4px;
}

.message-wrapper.sent .message-bubble {
  background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message-wrapper.received .message-bubble {
  background: #1e293b;
  color: #e2e8f0;
  border-bottom-left-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.text {
  font-size: 0.95rem;
  line-height: 1.4;
  word-wrap: break-word;
}

.time {
  font-size: 0.65rem;
  align-self: flex-end;
  margin-top: 4px;
  opacity: 0.7;
}

.chat-input-area {
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
}

.input-form {
  display: flex;
  gap: 12px;
  align-items: center;
}

input {
  flex: 1;
  background: #111822; /* Darker background inside input */
  border: 1px solid rgba(255,255,255,0.1);
  padding: 14px 20px;
  border-radius: 24px;
  color: #fff;
  font-size: 1rem;
  outline: none;
  transition: all 0.2s;
}

input:focus {
  border-color: #4facfe;
  box-shadow: 0 0 0 2px rgba(79, 172, 254, 0.2);
}

.send-btn {
  background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
  border: none;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.send-btn:disabled {
  background: #334155;
  color: #64748b;
  cursor: not-allowed;
}

.send-icon {
  margin-right: 2px;
  margin-top: 2px;
}

.back-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 4px;
  transition: all 0.2s;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #4facfe;
}

@media (max-width: 768px) {
  .chat-header {
    padding: 0 12px;
  }

  .username {
    font-size: 1rem;
  }

  .message-bubble {
    max-width: 82%;
  }

  .chat-input-area {
    padding: 10px 12px;
  }

  input {
    padding: 12px 16px;
  }
}

@media (max-width: 480px) {
  .chat-header {
    height: 54px;
    padding: 0 10px;
  }

  .avatar {
    width: 34px;
    height: 34px;
  }

  .username {
    font-size: 0.9rem;
  }

  .messages-container {
    padding: 12px 10px;
  }

  .message-bubble {
    max-width: 90%;
    padding: 8px 12px;
  }

  .text {
    font-size: 0.9rem;
  }

  .chat-input-area {
    padding: 8px 10px;
    padding-bottom: max(8px, env(safe-area-inset-bottom));
  }

  input {
    padding: 10px 14px;
    font-size: 0.95rem;
  }

  .send-btn {
    width: 42px;
    height: 42px;
  }
}
</style>
