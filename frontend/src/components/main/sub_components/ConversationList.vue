<template>
  <div class="conversation-list">
    <div 
      v-for="conv in sortedConversations" 
      :key="conv.isGroup ? 'g'+conv.id : 'u'+conv.id"
      class="conversation-item"
      :class="{ active: (conv.isGroup ? 'g'+conv.id : 'u'+conv.id) === activeConversationId }"
      @click="$emit('select', conv)"
    >
      <div class="avatar-wrapper">
        <div class="avatar" :class="{ 'group-avatar': conv.isGroup }">
          <svg v-if="conv.isGroup" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <span v-else>{{ (conv.name || conv.username)[0]?.toUpperCase() }}</span>
        </div>
        <div v-if="conv.online && !conv.isGroup" class="online-indicator"></div>
      </div>
      
      <div class="conv-details">
        <div class="conv-header">
          <span class="username">{{ conv.name || conv.username }}</span>
          <span class="timestamp" v-if="conv.lastMessage">
            {{ formatTime(conv.lastMessage.created_at) }}
          </span>
        </div>
        
        <div class="conv-preview" v-if="conv.typing">
          <span class="typing-text">typing...</span>
        </div>
        <div class="conv-preview" v-else-if="conv.lastMessage">
          <!-- Small checkmark if I sent it -->
          <svg v-if="conv.lastMessage.sender_id !== conv.id" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" class="check-icon" :class="{ read: conv.lastMessage.is_read }"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span class="message-text">{{ truncate(conv.lastMessage.content) }}</span>
        </div>
        <div class="conv-preview" v-else>
          <span class="message-text italic">Say hi to start the conversation!</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  conversations: any[];
  activeConversationId?: string;
}>();

defineEmits(['select']);

const sortedConversations = computed(() => {
  return [...props.conversations].sort((a: any, b: any) => {
    const tA = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
    const tB = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
    return tB - tA; // descending
  });
});

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const truncate = (text: string) => {
  if (!text) return '';
  return text.length > 30 ? text.substring(0, 30) + '...' : text;
};
</script>

<style scoped>
.conversation-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-list::-webkit-scrollbar {
  width: 6px;
}

.conversation-list::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid rgba(255, 255, 255, 0.02);
}

.conversation-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.conversation-item.active {
  background: rgba(255, 255, 255, 0.08); /* Highlight when selected */
}

.avatar-wrapper {
  position: relative;
}

.avatar {
  width: 48px;
  height: 48px;
  background: rgba(79, 172, 254, 0.2);
  border: 1px solid rgba(79, 172, 254, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
  color: #4facfe;
}

.active .avatar {
  background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
  color: white;
  border: none;
}

.avatar.group-avatar {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #10b981;
}

.active .avatar.group-avatar {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
}

.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: #22c55e;
  border-radius: 50%;
  border: 2px solid #111822; /* match sidebar background */
}

.conv-details {
  flex: 1;
  min-width: 0;
}

.conv-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}

.username {
  font-weight: 600;
  font-size: 1.05rem;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timestamp {
  font-size: 0.75rem;
  color: #64748b;
}

.conv-preview {
  display: flex;
  align-items: center;
  gap: 4px;
}

.message-text {
  font-size: 0.9rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.italic {
  font-style: italic;
  opacity: 0.7;
}

.typing-text {
  font-size: 0.9rem;
  color: #4facfe;
  font-weight: 500;
  animation: pulse 1.5s infinite;
}

.check-icon {
  color: #64748b;
}

.check-icon.read {
  color: #4facfe;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (max-width: 768px) {
  .conversation-item {
    padding: 10px 14px;
  }

  .avatar {
    width: 42px;
    height: 42px;
    font-size: 1.1rem;
  }

  .username {
    font-size: 1rem;
  }

  .message-text {
    font-size: 0.85rem;
  }
}

@media (max-width: 480px) {
  .conversation-item {
    padding: 8px 12px;
    gap: 10px;
  }

  .avatar {
    width: 36px;
    height: 36px;
    font-size: 0.95rem;
  }

  .username {
    font-size: 0.9rem;
  }

  .timestamp {
    font-size: 0.7rem;
  }

  .message-text {
    font-size: 0.8rem;
  }
}
</style>
