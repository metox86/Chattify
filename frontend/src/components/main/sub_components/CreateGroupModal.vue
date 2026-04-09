<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2>Create Group Chat</h2>
      <button class="close-btn" @click="$emit('close')">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>

      <div class="search-body">
        <div class="input-group">
          <input 
            type="text" 
            v-model="groupName" 
            placeholder="Enter group name..." 
            class="search-input"
            autofocus
          />
        </div>
        
        <div class="input-group mt">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search friends to add..." 
            class="search-input"
            @input="performSearch"
          />
        </div>

        <div v-if="loading" class="loading-state">Searching...</div>

        <div class="selected-users mt" v-if="selectedUsers.length > 0">
          <div class="pill" v-for="user in selectedUsers" :key="user.id">
            {{ user.username }}
            <button @click="toggleUser(user)" class="remove-pill">×</button>
          </div>
        </div>

        <div class="user-list" v-if="!loading && searchResults.length > 0">
          <div 
            v-for="user in searchResults" 
            :key="user.id" 
            class="user-item"
            @click="toggleUser(user)"
          >
            <div class="user-info">
              <div class="avatar">{{ user.username[0]?.toUpperCase() }}</div>
              <span class="username">{{ user.username }}</span>
            </div>
            <div class="checkbox-area">
              <input type="checkbox" :checked="isSelected(user)" readonly />
            </div>
          </div>
        </div>
        
        <div class="action-footer mt">
          <button class="create-btn" :disabled="!groupName.trim()" @click="createGroup">Create Group</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits(['close', 'group-created']);

const searchQuery = ref('');
const groupName = ref('');
const searchResults = ref<any[]>([]);
const selectedUsers = ref<any[]>([]);
const loading = ref(false);
let searchTimeout: any = null;

const performSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    if (!searchQuery.value.trim()) {
      searchResults.value = [];
      return;
    }
    loading.value = true;
    try {
      // NOTE: We just search from /users (which restricts correctly in backend)
      // If we only want accepted friends, we'd need another endpoint, but searching all users is fine for now
      const res = await fetch(`/api/v1/chat/users?search=${encodeURIComponent(searchQuery.value)}`, {
        credentials: 'include'
      });
      if (res.ok) {
        searchResults.value = await res.json();
      }
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      loading.value = false;
    }
  }, 300);
};

const isSelected = (user: any) => {
  return selectedUsers.value.some(u => u.id === user.id);
};

const toggleUser = (user: any) => {
  if (isSelected(user)) {
    selectedUsers.value = selectedUsers.value.filter(u => u.id !== user.id);
  } else {
    selectedUsers.value.push(user);
  }
};

const createGroup = async () => {
  if (!groupName.value.trim()) return;
  
  try {
    const res = await fetch('/api/v1/chat/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: groupName.value.trim(),
        members: selectedUsers.value.map(u => u.id)
      })
    });
    
    if (res.ok) {
      const newGroup = await res.json();
      emit('group-created', newGroup);
    }
  } catch (e) {
    console.error('Group creation failed', e);
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: #111822;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-content h2 {
  margin: 0;
  padding: 20px;
  font-size: 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #fff;
  font-weight: 600;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.search-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.input-group {
  position: relative;
}

.mt {
  margin-top: 12px;
}

.search-input {
  width: 100%;
  background: #090a0f;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 16px;
  border-radius: 8px;
  color: #fff;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: #4facfe;
  box-shadow: 0 0 0 2px rgba(79, 172, 254, 0.2);
}

.loading-state {
  text-align: center;
  padding: 20px;
  color: #64748b;
}

.selected-users {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pill {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.remove-pill {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-list {
  margin-top: 16px;
  flex: 1;
  overflow-y: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 12px;
}

/* Scrollbar styles */
.user-list::-webkit-scrollbar {
  width: 6px;
}
.user-list::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #fff;
  font-size: 0.9rem;
}

.username {
  font-weight: 500;
  color: #e2e8f0;
}

.checkbox-area {
  display: flex;
  align-items: center;
}

.action-footer {
  display: flex;
  justify-content: flex-end;
}

.create-btn {
  background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}

.create-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
