<template>
  <div class="main-menu-container">
    <!-- Sidebar: always visible on desktop, conditionally on mobile -->
    <div class="sidebar" :class="{ 'sidebar--hidden': isMobile && activeConversationId }">
      <div class="sidebar-header">
        <div class="user-profile">
          <div class="avatar">{{ currentUser[0]?.toUpperCase() }}</div>
          <span class="username">{{ currentUser }}</span>
        </div>
        <div class="header-right-actions">
          <button class="icon-btn" @click="showGroupModal = true" title="Create Group">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
          </button>
          <button class="logout-btn" @click="handleLogout" title="Log Out">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </div>
      
      <div class="search-bar">
        <div class="search-input-wrapper" @click="showSearchModal = true">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" class="search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" placeholder="Search or start new chat" readonly />
        </div>
      </div>

      <ConversationList 
        :conversations="combinedConversations" 
        :activeConversationId="activeConversationId ?? undefined"
        @select="selectConversation"
      />
    </div>

    <!-- Chat area: hidden on mobile when no chat is open -->
    <div class="chat-area" :class="{ 'chat-area--hidden': isMobile && !activeConversationId }">
      <GroupChatWindow
        v-if="activeConversationId?.startsWith('g')"
        :group="activeGroup"
        :currentUser="(currentUserId as number)"
        @send-group-message="sendGroupMessage"
        @typing="sendGroupTyping"
        @back="goBack"
        :showBack="isMobile"
      />
      <ChatWindow 
        v-else-if="activeConversationId?.startsWith('u')" 
        :conversation="activeConversation"
        :currentUser="(currentUserId as number)"
        :refreshFriendshipTrigger="refreshFriendshipTrigger"
        @send-message="sendMessage"
        @typing="sendTyping"
        @friend-request-sent="onFriendRequestSent"
        @friend-accept-sent="onFriendAcceptSent"
        @back="goBack"
        :showBack="isMobile"
      />
      <div v-else class="empty-state">
        <div class="empty-state-content">
          <svg viewBox="0 0 24 24" width="64" height="64" stroke="currentColor" stroke-width="2" fill="none" opacity="0.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          <h2>Chattify Web</h2>
          <p>Select a conversation to start messaging.<br/>End-to-end encryption is not guaranteed here.</p>
        </div>
      </div>
    </div>

    <UserSearch 
      v-if="showSearchModal" 
      @close="showSearchModal = false"
      @start-chat="startNewChat"
    />

    <CreateGroupModal
      v-if="showGroupModal"
      @close="showGroupModal = false"
      @group-created="onGroupCreated"
    />

    <VoiceCallModal />
    <VideoCallModal />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { io } from 'socket.io-client';
import ConversationList from './sub_components/ConversationList.vue';
import ChatWindow from './sub_components/ChatWindow.vue';
import GroupChatWindow from './sub_components/GroupChatWindow.vue';
import UserSearch from './sub_components/UserSearch.vue';
import CreateGroupModal from './sub_components/CreateGroupModal.vue';
import VoiceCallModal from './sub_components/VoiceCallModal.vue';
import VideoCallModal from './sub_components/VideoCallModal.vue';
import { initPeerService } from '../../services/peerService';

const router = useRouter();
const route = useRoute();
const currentUser = ref<string>('');
const currentUserId = ref<number | null>(null);
const conversations = ref<any[]>([]);
const groups = ref<any[]>([]);
const activeConversationId = ref<string | null>(null);
const showSearchModal = ref<boolean>(false);
const showGroupModal = ref<boolean>(false);
const socket = ref<any>(null);
const refreshFriendshipTrigger = ref<number>(0);

// Mobile detection
const isMobile = ref<boolean>(window.innerWidth <= 768);
const onResize = () => { isMobile.value = window.innerWidth <= 768; };
window.addEventListener('resize', onResize);

const combinedConversations = computed(() => {
  return [
    ...conversations.value.map(c => ({...c, isGroup: false})),
    ...groups.value.map(g => ({...g, isGroup: true, username: g.name }))
  ];
});

const activeConversation = computed(() => {
  return conversations.value.find(c => 'u' + c.id === activeConversationId.value);
});

const activeGroup = computed(() => {
  return groups.value.find(g => 'g' + g.id === activeConversationId.value);
});

onMounted(async () => {
  try {
    const res = await fetch('/auth/me', { credentials: 'include' });
    if (!res.ok) throw new Error('Not auth');
    const data = await res.json();
    currentUser.value = data.username;
    currentUserId.value = data.userId;
    localStorage.setItem('chat_user', JSON.stringify(data));
    
    initSocket();
    await Promise.all([fetchConversations(), fetchGroups()]);
    if (route.params.chatId) {
      loadConversation('u' + route.params.chatId);
    } else if (route.params.groupId) {
      loadConversation('g' + route.params.groupId);
    }
  } catch(e: any) {
    console.log(e);
    localStorage.removeItem('chat_user');
    router.push('/login');
  }
});

onUnmounted(() => {
  if (socket.value) socket.value.disconnect();
  window.removeEventListener('resize', onResize);
});

const initSocket = () => {
  socket.value = io({ withCredentials: true });
  initPeerService(currentUserId.value!, socket.value);
  
  socket.value.on('message-received', (msg: any) => {
    const conv = conversations.value.find(c => c.id === msg.sender_id);
    if (conv) {
      if(!conv.messages) conv.messages = [];
      conv.messages.push(msg);
      conv.lastMessage = msg;
    } else {
      fetchConversations();
    }
  });

  // When this user is added to a new group by someone else → refresh groups list
  socket.value.on('you-added-to-group', (_group: any) => {
    fetchGroups();
  });

  socket.value.on('group-message-received', (msg: any) => {
    const idx = groups.value.findIndex(g => g.id === msg.group_id);
    if (idx !== -1) {
      const group = groups.value[idx];
      // Spread into new arrays so Vue 3 always detects the change
      const updatedGroup = {
        ...group,
        messages: [...(group.messages || []), msg],
        lastMessage: msg,
      };
      groups.value = [
        ...groups.value.slice(0, idx),
        updatedGroup,
        ...groups.value.slice(idx + 1),
      ];
    } else {
      fetchGroups();
    }
  });

  socket.value.on('user-online', (userId: number) => {
    const conv = conversations.value.find(c => c.id === userId);
    if(conv) conv.online = true;
  });

  socket.value.on('user-offline', (userId: number) => {
    const conv = conversations.value.find(c => c.id === userId);
    if(conv) conv.online = false;
  });

  socket.value.on('typing', ({senderId}: any) => {
    const conv = conversations.value.find(c => c.id === senderId);
    if(conv) {
      conv.typing = true;
      setTimeout(() => conv.typing = false, 3000);
    }
  });

  socket.value.on('friend-request', ({senderId}: any) => {
    const active = activeConversationId.value;
    if (active && active.startsWith('u') && parseInt(active.substring(1), 10) === senderId) {
      refreshFriendshipTrigger.value++;
    }
  });

  socket.value.on('friend-accepted', ({senderId}: any) => {
    const active = activeConversationId.value;
    if (active && active.startsWith('u') && parseInt(active.substring(1), 10) === senderId) {
      refreshFriendshipTrigger.value++;
    }
  });
};

const fetchConversations = async () => {
  const res = await fetch('/api/v1/chat/conversations', { credentials: 'include' });
  if (res.ok) {
    conversations.value = await res.json();
  }
};

const fetchGroups = async () => {
  const res = await fetch('/api/v1/chat/groups', { credentials: 'include' });
  if (res.ok) {
    groups.value = await res.json();
  }
};

const fetchMessages = async (userId: number) => {
  const res = await fetch(`/api/v1/chat/messages/${userId}`, { credentials: 'include' });
  if (res.ok) {
    const msgs = await res.json();
    const conv = conversations.value.find(c => c.id === userId);
    if (conv) {
      conv.messages = msgs;
    }
  }
};

const fetchGroupMessages = async (groupId: number) => {
  const res = await fetch(`/api/v1/chat/groups/${groupId}/messages`, { credentials: 'include' });
  if (res.ok) {
    const msgs = await res.json();
    const group = groups.value.find(g => g.id === groupId);
    if (group) {
      group.messages = msgs;
    }
  }
};

const loadConversation = async (fullIdStr: any) => {
  if (!fullIdStr) {
    activeConversationId.value = null;
    return;
  }
  
  activeConversationId.value = fullIdStr;
  const isGroup = fullIdStr.startsWith('g');
  const id = parseInt(fullIdStr.substring(1), 10);
  
  if (isGroup) {
    const group = groups.value.find(g => g.id === id);
    if (group && !group.messages) {
      await fetchGroupMessages(id);
    }
  } else {
    const conv = conversations.value.find(c => c.id === id);
    if (conv && !conv.messages) {
      await fetchMessages(id);
    }
  }
};

watch(() => route.params.chatId, (newId: any) => {
  if (newId) loadConversation('u' + newId);
});

watch(() => route.params.groupId, (newId: any) => {
  if (newId) loadConversation('g' + newId);
});

const selectConversation = (conv: any) => {
  if (currentUserId.value) {
    if (conv.isGroup) {
      router.push(`/${currentUserId.value}/groups/${conv.id}`);
    } else {
      router.push(`/${currentUserId.value}/chats/${conv.id}`);
    }
  }
};

const goBack = () => {
  if (currentUserId.value) {
    router.push(`/${currentUserId.value}/chats`);
  }
};

const startNewChat = (user: any) => {
  showSearchModal.value = false;
  if (!conversations.value.find(c => c.id === user.id)) {
    conversations.value.unshift({
      id: user.id,
      username: user.username,
      messages: [],
      lastMessage: null
    });
  }
  selectConversation({ id: user.id, isGroup: false });
};

const onGroupCreated = (group: any) => {
  showGroupModal.value = false;
  groups.value.unshift({
    ...group,
    messages: [],
    lastMessage: null
  });
  selectConversation({ id: group.id, isGroup: true });
};

const sendMessage = (payload: any) => {
  if (!socket.value || !activeConversationId.value || !activeConversation.value) return;
  const receiverId = parseInt(activeConversationId.value.substring(1), 10);
  const content = typeof payload === 'string' ? payload : (payload?.content ?? '');
  const attachments = Array.isArray(payload?.attachments) ? payload.attachments : [];
  socket.value.emit('send-message', { receiverId, content, attachments }, (res: any) => {
    if (res.success) {
      const conv = activeConversation.value;
      if (!conv.messages) conv.messages = [];
      conv.messages.push(res.message);
      conv.lastMessage = res.message;
    }
  });
};

const sendGroupMessage = (payload: any) => {
  if (!socket.value || !activeConversationId.value || !activeGroup.value) return;
  const groupId = parseInt(activeConversationId.value.substring(1), 10);
  const content = typeof payload === 'string' ? payload : (payload?.content ?? '');
  const attachments = Array.isArray(payload?.attachments) ? payload.attachments : [];
  socket.value.emit('send-group-message', { groupId, content, attachments }, (res: any) => {
    if (res.success) {
      const idx = groups.value.findIndex(g => g.id === groupId);
      if (idx !== -1) {
        const group = groups.value[idx];
        // Spread into new arrays so Vue 3 always detects the change
        const updatedGroup = {
          ...group,
          messages: [...(group.messages || []), res.message],
          lastMessage: res.message,
        };
        groups.value = [
          ...groups.value.slice(0, idx),
          updatedGroup,
          ...groups.value.slice(idx + 1),
        ];
      }
    }
  });
};

const sendTyping = () => {
  if (!socket.value || !activeConversationId.value) return;
  const receiverId = parseInt(activeConversationId.value.substring(1), 10);
  socket.value.emit('typing', { receiverId });
};

const sendGroupTyping = () => {
  // Typing indicators for groups can be implemented similarly if backend supports it
};

const onFriendRequestSent = (targetId: number) => {
  if (socket.value) socket.value.emit('friend-request', { receiverId: targetId });
};

const onFriendAcceptSent = (targetId: number) => {
  if (socket.value) socket.value.emit('friend-accepted', { receiverId: targetId });
};

const handleLogout = async () => {
  await fetch('/logout', { method: 'POST', credentials: 'include' });
  localStorage.removeItem('chat_user');
  if (socket.value) socket.value.disconnect();
  router.push('/login');
};
</script>


<style scoped>
.main-menu-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: #090a0f;
  color: #fff;
  overflow: hidden;
  font-family: 'Inter', system-ui, sans-serif;
}

/* ── Sidebar ──────────────────────────────── */
.sidebar {
  width: 380px;
  flex-shrink: 0;
  background: #111822;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
  z-index: 10;
}

.sidebar-header {
  height: 60px;
  padding: 0 16px;
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
  color: white;
}

.username {
  font-weight: 600;
  font-size: 1.1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logout-btn, .icon-btn {
  background: transparent;
  color: #94a3b8;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s;
  display: flex;
  flex-shrink: 0;
}

.logout-btn:hover {
  background: rgba(255,255,255,0.05);
  color: #ef4444;
}

.search-bar {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

.search-input-wrapper {
  background: #1e293b;
  border-radius: 8px;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 12px;
  cursor: pointer;
}

.search-icon {
  color: #64748b;
  flex-shrink: 0;
}

.search-input-wrapper input {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 0.95rem;
  width: 100%;
  outline: none;
  cursor: pointer;
  min-width: 0;
}

.search-input-wrapper input::placeholder {
  color: #64748b;
}

/* ── Chat Area ────────────────────────────── */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #090a0f;
  position: relative;
  min-width: 0;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #64748b;
  padding: 20px;
}

.empty-state-content h2 {
  font-weight: 300;
  margin: 16px 0 8px;
  color: #e2e8f0;
}

.empty-state-content p {
  font-size: 0.9rem;
  line-height: 1.5;
}

/* ── Tablet (≤1024px) ─────────────────────── */
@media (max-width: 1024px) {
  .sidebar {
    width: 300px;
  }

  .username {
    font-size: 1rem;
  }
}

/* ── Mobile (≤768px) ──────────────────────── */
@media (max-width: 768px) {
  .main-menu-container {
    position: relative;
  }

  .sidebar {
    position: absolute;
    inset: 0;
    width: 100%;
    z-index: 10;
  }

  /* Hide sidebar when a chat is active on mobile */
  .sidebar--hidden {
    transform: translateX(-100%);
    pointer-events: none;
  }

  .chat-area {
    position: absolute;
    inset: 0;
    width: 100%;
    z-index: 5;
  }

  /* Hide chat area when no chat selected on mobile */
  .chat-area--hidden {
    display: none;
  }

  .avatar {
    width: 34px;
    height: 34px;
    font-size: 1rem;
  }

  .username {
    font-size: 0.95rem;
  }

  .empty-state {
    display: none;
  }
}

/* ── Small Mobile (≤480px) ───────────────── */
@media (max-width: 480px) {
  .sidebar-header {
    height: 54px;
    padding: 0 12px;
    padding-left: max(12px, env(safe-area-inset-left));
    padding-right: max(12px, env(safe-area-inset-right));
  }

  .search-bar {
    padding: 8px 12px;
  }

  .avatar {
    width: 30px;
    height: 30px;
    font-size: 0.9rem;
  }

  .username {
    font-size: 0.85rem;
  }
}
</style>
