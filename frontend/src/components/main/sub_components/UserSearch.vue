<template>
  <div class="search-modal-overlay" @click.self="$emit('close')">
    <div class="search-modal fade-in-up">
      <div class="modal-header">
        <h3>New Chat</h3>
        <button class="close-btn" @click="$emit('close')">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="search-input-wrapper">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" class="search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search by username..." 
            @input="performSearch"
            ref="searchInput"
          />
        </div>

        <div class="results-container">
          <div v-if="isLoading" class="status-msg">Searching...</div>
          <div v-else-if="results.length === 0 && searchQuery" class="status-msg">No users found.</div>
          
          <div 
            v-for="user in results" 
            :key="user.id"
            class="user-item"
            @click="$emit('start-chat', user)"
          >
            <div class="avatar">{{ user.username[0]?.toUpperCase() }}</div>
            <div class="user-info">
              <span class="username">{{ user.username }}</span>
            </div>
            <button class="start-btn">Chat</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const emit = defineEmits(['close', 'start-chat']);
const searchQuery = ref<string>('');
const results = ref<any[]>([]);
const isLoading = ref<boolean>(false);
const searchInput = ref<HTMLInputElement | null>(null);

let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  searchInput.value?.focus();
});

const performSearch = () => {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  
  if (!searchQuery.value.trim()) {
    results.value = [];
    return;
  }

  debounceTimeout = setTimeout(async () => {
    isLoading.value = true;
    try {
      const res = await fetch(`/api/v1/chat/users?search=${encodeURIComponent(searchQuery.value)}`, {
        credentials: 'include'
      });
      if (res.ok) {
        results.value = await res.json();
      }
    } catch(e: any) {
      console.error(e);
    } finally {
      isLoading.value = false;
    }
  }, 300);
};
</script>

<style scoped>
.search-modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-modal {
  width: 100%;
  max-width: 400px;
  background: #111822;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

@media (max-width: 480px) {
  .search-modal-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .search-modal {
    max-width: 100%;
    border-radius: 20px 20px 0 0;
    max-height: 85vh;
  }
}

.modal-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #fff;
}

.close-btn {
  background: transparent;
  color: #64748b;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-input-wrapper {
  background: #1e293b;
  border-radius: 8px;
  display: flex;
  align-items: center;
  padding: 12px 14px;
  gap: 12px;
}

.search-icon {
  color: #64748b;
}

.search-input-wrapper input {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1rem;
  width: 100%;
  outline: none;
}

.search-input-wrapper input::placeholder {
  color: #64748b;
}

.results-container {
  min-height: 150px;
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.results-container::-webkit-scrollbar {
  width: 6px;
}
.results-container::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
}

.status-msg {
  text-align: center;
  color: #64748b;
  padding: 20px;
  font-size: 0.95rem;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 10px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.avatar {
  width: 40px;
  height: 40px;
  background: rgba(79, 172, 254, 0.2);
  color: #4facfe;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 12px;
}

.user-info {
  flex: 1;
}

.user-info .username {
  font-weight: 500;
  color: #e2e8f0;
}

.start-btn {
  background: rgba(79, 172, 254, 0.1);
  color: #4facfe;
  border: 1px solid rgba(79, 172, 254, 0.2);
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.start-btn:hover {
  background: rgba(79, 172, 254, 0.2);
  color: #00f2fe;
}

.fade-in-up {
  animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
