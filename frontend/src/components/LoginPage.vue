<template>
  <div class="auth-container">
    <div class="glass-card fade-in">
      <div class="card-header">
        <div class="logo-placeholder">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="logo-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </div>
        <h2>Welcome Back</h2>
        <p>Log in to access your chats</p>
      </div>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="input-group">
          <input type="text" id="login-username" v-model="username" required placeholder=" " />
          <label for="login-username">Username</label>
        </div>

        <div class="input-group">
          <input type="password" id="login-password" v-model="password" required placeholder=" " />
          <label for="login-password">Password</label>
        </div>
        
        <div v-if="errorMsg" class="alert error-message shake">{{ errorMsg }}</div>
        
        <button type="submit" class="primary-btn glow-effect" :disabled="isLoading">
          <span v-if="isLoading" class="spinner"></span>
          <span v-else>Log In</span>
        </button>
      </form>

      <div class="card-footer">
        <p>Don't have an account? <span class="text-link" @click="goToRegister">Register here</span></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const emit = defineEmits(['login-success']);
const router = useRouter();

const goToRegister = () => {
  router.push('/register');
};

const username = ref('');
const password = ref('');
const errorMsg = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  
  try {
    const response = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: username.value, password: password.value })
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');
    }
    
    // Store JWT token safely
    localStorage.setItem('chat_token', data.token);
    localStorage.setItem('chat_user', JSON.stringify({ username: data.username, userId: data.userId }));
    
    router.push(`/${data.userId}/chats`);
    
    emit('login-success', data.username);
  } catch (err: any) {
    errorMsg.value = err.message;
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%);
  font-family: 'Inter', system-ui, sans-serif;
  color: #fff;
  padding: 20px;
}

@media (max-width: 480px) {
  .auth-container {
    align-items: flex-start;
    padding: 24px 16px;
  }
}

.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  position: relative;
  overflow: hidden;
}

@media (max-width: 480px) {
  .glass-card {
    padding: 28px 20px;
    border-radius: 16px;
  }
}

/* Optional glow behind card */
.glass-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(79, 172, 254, 0.1) 0%, transparent 60%);
  z-index: -1;
  pointer-events: none;
}

.card-header {
  text-align: center;
  margin-bottom: 30px;
}

.logo-placeholder {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
  border-radius: 16px;
  margin-bottom: 16px;
  box-shadow: 0 8px 16px rgba(0, 242, 254, 0.3);
}

.logo-icon {
  color: white;
  width: 32px;
  height: 32px;
}

.card-header h2 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #fff;
}

.card-header p {
  color: #94a3b8;
  font-size: 0.95rem;
  margin: 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  position: relative;
}

.input-group input {
  width: 100%;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #fff;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.input-group input:focus {
  border-color: #4facfe;
  box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.2);
  background: rgba(0, 0, 0, 0.3);
}

.input-group label {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  pointer-events: none;
  transition: all 0.3s ease;
  font-size: 1rem;
}

.input-group input:focus ~ label,
.input-group input:not(:placeholder-shown) ~ label {
  top: -10px;
  left: 12px;
  font-size: 0.8rem;
  color: #4facfe;
  background: #111822; /* Matches the input overlapping area */
  padding: 0 6px;
  border-radius: 4px;
  font-weight: 500;
}

.primary-btn {
  background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
  color: white;
  border: none;
  padding: 16px;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin-top: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 54px;
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px -10px rgba(79, 172, 254, 0.6);
}

.primary-btn:active:not(:disabled) {
  transform: translateY(0);
}

.primary-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.alert {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  text-align: center;
}

.error-message {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.card-footer {
  margin-top: 25px;
  text-align: center;
  font-size: 0.9rem;
  color: #94a3b8;
}

.text-link {
  color: #4facfe;
  cursor: pointer;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease;
}

.text-link:hover {
  color: #00f2fe;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-in {
  animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}

/* Ensure background is covering full page when components switch */
:global(body) {
  margin: 0;
  background: #090a0f;
}
</style>
