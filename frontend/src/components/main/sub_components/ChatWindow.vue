<template>
  <div class="chat-window">
    <ImageModal v-if="imageModal" :src="imageModal.src" :alt="imageModal.alt" @close="imageModal = null" @download="downloadImageOnModal(imageModal.id)" />
    <div class="chat-header">
      <div class="contact-info">
        <!-- Mobile back button -->
        <button v-if="props.showBack" class="back-btn" @click="emit('back')" title="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div class="avatar">{{ conversation.username[0]?.toUpperCase() }}</div>
        <div class="contact-text">
          <span class="username">{{ conversation.username }}</span>
          <span class="status" v-if="conversation.online">Online</span>
          <span class="status offline" v-else>Offline</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="icon-btn" :disabled="friendshipStatus !== 'accepted'" title="Voice Call" @click="startCall(conversation.id)">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
        </button>
        <button class="icon-btn" :disabled="friendshipStatus !== 'accepted'" title="Video Call" @click="startVideoCall(conversation.id)">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" class="video-icon"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
        </button>
      </div>
    </div>

    <div v-if="friendshipStatus === 'none'" class="friendship-banner">
      <p>You are not friends with {{ conversation.username }}. Features are limited.</p>
      <button class="action-btn" @click="sendFriendRequest">Add Friend</button>
    </div>
    <div v-else-if="friendshipStatus === 'pending'" class="friendship-banner pending">
      <p>Friend request sent. Waiting for {{ conversation.username }} to accept.</p>
    </div>
    <div v-else-if="friendshipStatus === 'received'" class="friendship-banner action-required">
      <p>{{ conversation.username }} wants to be your friend.</p>
      <button class="action-btn success" @click="acceptFriendRequest">Accept Request</button>
    </div>

    <div class="messages-container" ref="messagesContainer">
      <div v-if="!conversation.messages || conversation.messages.length === 0" class="no-messages">
        <p>No messages yet. Say hi!</p>
      </div>
      
      <div v-else class="message-list">
        <!-- Add a date separator logic if needed, but for now just map messages -->
        <div 
          v-for="(msg, index) in conversation.messages" 
          :key="msg.id || index"
          class="message-wrapper"
          :class="['message-wrapper', msg.sender_id === currentUser ? 'sent' : 'received']"
        >
          <div class="message-bubble">
            <MessageAttachments :attachments="msg.attachments || []" @open-image="openImageModal" />
            <span class="text">{{ msg.content }}</span>
            <span class="time">{{ formatTime(msg.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-input-area">
      <div v-if="conversation.typing" class="typing-indicator">
        {{ conversation.username }} is typing...
      </div>
      <div v-if="selectedFiles.length" class="pending-attachments">
        <div class="pending-attachment" v-for="(it, idx) in selectedFiles" :key="it.key">
          <img v-if="it.kind === 'image' && it.previewUrl" class="thumb" :src="it.previewUrl" :alt="it.file.name" />
          <div v-else class="file-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          </div>
          <div class="pending-meta">
            <div class="pending-name" :title="it.file.name">{{ it.file.name }}</div>
            <div class="pending-size">{{ formatBytes(it.file.size) }}</div>
          </div>
          <button type="button" class="remove" title="Remove" @click="removeSelectedFile(idx)">✕</button>
        </div>
      </div>
      <form @submit.prevent="submitMessage" class="input-form">
        <button
          type="button"
          class="attach-btn"
          :disabled="friendshipStatus !== 'accepted'"
          title="Attach File"
          @click="openFilePicker"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
        </button>
        <input
          ref="fileInput"
          type="file"
          multiple
          class="hidden-file-input"
          @change="onFilesSelected"
        />
        <input 
          type="text" 
          v-model="newMessage" 
          placeholder="Type a message..." 
          @input="onInput"
        />
        <button type="submit" class="send-btn" :disabled="!canSend">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" class="send-icon"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, nextTick, onMounted } from 'vue';
import { startCall, startVideoCall } from '../../../services/peerService';
import MessageAttachments from './MessageAttachments.vue';
import ImageModal from './ImageModal.vue';

const props = defineProps<{
  conversation: any;
  currentUser: number;
  refreshFriendshipTrigger?: number;
  showBack?: boolean;
}>();

const emit = defineEmits(['send-message', 'typing', 'friend-request-sent', 'friend-accept-sent', 'back']);

const newMessage = ref<string>('');
const messagesContainer = ref<HTMLElement | null>(null);
const friendshipStatus = ref<string>('none');
let typingTimeout: ReturnType<typeof setTimeout> | null = null;

const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref<boolean>(false);

type SelectedFileKind = 'image' | 'audio' | 'video' | 'other';
type SelectedFile = {
  key: string;
  file: File;
  kind: SelectedFileKind;
  previewUrl?: string;
};

const selectedFiles = ref<SelectedFile[]>([]);
const imageModal = ref<{ id: number, src: string; alt?: string } | null>(null);

const canSend = computed(() => {
  return !!newMessage.value.trim() || selectedFiles.value.length > 0;
});

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const openImageModal = (payload: { id: number; original_name: string }) => {
  imageModal.value = {
    id: payload.id,
    src: `http://localhost:3000/api/files/${payload.id}`,
    alt: payload.original_name,
  };
};

const fetchFriendship = async () => {
  if (!props.conversation.id) return;
  const res = await fetch(`http://localhost:3000/api/chat/friendship/${props.conversation.id}`, { credentials: 'include' });
  if (res.ok) {
    const data = await res.json();
    friendshipStatus.value = data.status;
  }
};

watch(() => props.conversation.messages, () => {
  scrollToBottom();
}, { deep: true, flush: 'post' });

watch(() => props.conversation.id, () => {
  scrollToBottom();
  fetchFriendship();
}, { immediate: true, flush: 'post' });

watch(() => props.refreshFriendshipTrigger, () => {
  fetchFriendship();
});

onMounted(() => {
  scrollToBottom();
});

const sendFriendRequest = async () => {
  const res = await fetch('http://localhost:3000/api/chat/friend-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ targetId: props.conversation.id })
  });
  if (res.ok) {
    friendshipStatus.value = 'pending';
    emit('friend-request-sent', props.conversation.id);
  }
};

const acceptFriendRequest = async () => {
  const res = await fetch('http://localhost:3000/api/chat/friend-accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ targetId: props.conversation.id })
  });
  if (res.ok) {
    friendshipStatus.value = 'accepted';
    emit('friend-accept-sent', props.conversation.id);
  }
};

const formatTime = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const onInput = () => {
  if (!typingTimeout) {
    emit('typing');
  } else {
    clearTimeout(typingTimeout);
  }
  typingTimeout = setTimeout(() => {
    typingTimeout = null;
  }, 2000);
};

const openFilePicker = () => {
  if (friendshipStatus.value !== 'accepted') return;
  fileInput.value?.click();
};

const inferKind = (f: File): SelectedFileKind => {
  const t = f.type || '';
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('audio/')) return 'audio';
  if (t.startsWith('video/')) return 'video';
  return 'other';
};

const onFilesSelected = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = input.files ? Array.from(input.files) : [];
  if (files.length === 0) return;

  for (const f of files) {
    const kind = inferKind(f);
    const previewUrl = kind === 'image' ? URL.createObjectURL(f) : undefined;
    selectedFiles.value.push({
      key: crypto.randomUUID(),
      file: f,
      kind,
      previewUrl,
    });
  }

  // Allow selecting the same file again
  input.value = '';
};

const removeSelectedFile = (idx: number) => {
  const it = selectedFiles.value[idx];
  if (it?.previewUrl) URL.revokeObjectURL(it.previewUrl);
  selectedFiles.value.splice(idx, 1);
};

const uploadSelectedFiles = async (): Promise<number[]> => {
  const ids: number[] = [];
  uploading.value = true;
  try {
    for (const it of selectedFiles.value) {
      const fd = new FormData();
      fd.append('file', it.file);
      const res = await fetch('http://localhost:3000/api/files/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) continue;
      const data = await res.json();
      ids.push(data.fileId);
    }
  } finally {
    uploading.value = false;
  }
  return ids;
};

const formatBytes = (bytes: number) => {
  if (!bytes || bytes < 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const digits = i === 0 ? 0 : i === 1 ? 0 : 1;
  return `${v.toFixed(digits)} ${units[i]}`;
};

onBeforeUnmount(() => {
  for (const it of selectedFiles.value) {
    if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
  }
});

const submitMessage = async () => {
  if (!canSend.value) return;
  const attachmentIds = selectedFiles.value.length ? await uploadSelectedFiles() : [];
  emit('send-message', {
    content: newMessage.value.trim(),
    attachments: attachmentIds,
  });
  newMessage.value = '';
  for (const it of selectedFiles.value) {
    if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
  }
  selectedFiles.value = [];
};

const downloadImageOnModal = (id: number) => {
  const fileUrl = (id: number) => `http://localhost:3000/api/files/${id}`;
  const downloadUrl = (id: number) => `http://localhost:3000/api/files/${id}/download`;

  const link = document.createElement("a");
  link.href = downloadUrl(id);
  link.download = fileUrl(id);

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
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

.icon-btn:hover:not(:disabled), .attach-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  color: #4facfe;
}

.icon-btn:disabled, .attach-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.friendship-banner {
  background: rgba(255, 255, 255, 0.03);
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.friendship-banner p {
  margin: 0;
  font-size: 0.9rem;
  color: #94a3b8;
}

.friendship-banner.pending {
  justify-content: center;
}

.friendship-banner.action-required {
  background: rgba(79, 172, 254, 0.1);
}

.friendship-banner.action-required p {
  color: #e2e8f0;
  font-weight: 500;
}

.action-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: none;
  padding: 6px 16px;
  border-radius: 12px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.action-btn.success {
  background: #22c55e;
  font-weight: 600;
}

.action-btn.success:hover {
  background: #16a34a;
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

.status.offline {
  color: #64748b;
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
  margin-top: 6px;
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

.typing-indicator {
  position: absolute;
  top: -25px;
  left: 30px;
  font-size: 0.8rem;
  color: #4facfe;
  font-style: italic;
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

.hidden-file-input {
  display: none;
}

.pending-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 2px 0;
  margin-bottom: 10px;
}

.pending-attachment {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.05);
  max-width: 100%;
}

.thumb {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.file-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pending-meta {
  min-width: 0;
}

.pending-name {
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.pending-size {
  font-size: 0.72rem;
  opacity: 0.75;
  margin-top: 2px;
}

.remove {
  background: transparent;
  border: none;
  color: inherit;
  opacity: 0.85;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 8px;
}

.remove:hover {
  background: rgba(255, 255, 255, 0.08);
  opacity: 1;
}

/* ── Back button (mobile) ─────────── */
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

/* ── Mobile (≤768px) ─────────────────── */
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

  .friendship-banner {
    padding: 10px 12px;
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
}

/* ── Small Mobile (≤480px) ───────────── */
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

  .friendship-banner {
    padding: 8px 10px;
  }

  .action-btn {
    width: 100%;
    text-align: center;
    padding: 8px 16px;
  }
}
</style>
