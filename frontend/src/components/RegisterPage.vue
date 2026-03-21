<template>
  <div class="auth-container">
    <div class="glass-card fade-in">
      <div class="card-header">
        <h2>Create an Account</h2>
        <p>Join the conversation today</p>
      </div>

      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="input-group">
          <input type="text" id="reg-username" v-model="username" required placeholder=" " />
          <label for="reg-username">Username</label>
        </div>

        <div class="input-group">
          <input type="password" id="reg-password" v-model="password" required placeholder=" " />
          <label for="reg-password">Password</label>
        </div>

        <div class="input-group">
          <input type="password" id="reg-confirm" v-model="confirmPassword" required placeholder=" " />
          <label for="reg-confirm">Confirm Password</label>
        </div>
        
        <div v-if="errorMsg" class="alert error-message shake">{{ errorMsg }}</div>
        <div v-if="successMsg" class="alert success-message">{{ successMsg }}</div>
        
        <button type="submit" class="primary-btn glow-effect" :disabled="isLoading">
          <span v-if="isLoading" class="spinner"></span>
          <span v-else>Register</span>
        </button>
      </form>

      <div class="card-footer">
        <p>Already have an account? <span class="text-link" @click="goToLogin">Log In</span></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const goToLogin = () => {
  router.push('/login');
};

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const errorMsg = ref('');
const successMsg = ref('');
const isLoading = ref(false);

const handleRegister = async () => {
  errorMsg.value = '';
  successMsg.value = '';
  
  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'Passwords do not match!';
    return;
  }
  
  if (password.value.length < 6) {
    errorMsg.value = 'Password must be at least 6 characters.';
    return;
  }

  isLoading.value = true;
  try {
    const response = await fetch('http://localhost:3000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: username.value, password: password.value })
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Server error occurred');
    }
    
    successMsg.value = 'Account created successfully! Redirecting...';
    username.value = '';
    password.value = '';
    confirmPassword.value = '';
    
    setTimeout(() => {
        goToLogin();
    }, 1500);
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
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  z-index: 10;
}

@media (max-width: 480px) {
  .glass-card {
    padding: 28px 20px;
    border-radius: 16px;
  }
}

.card-header {
  text-align: center;
  margin-bottom: 30px;
}

.card-header h2 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
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
  padding: 16px 16px 16px 16px;
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
  background: #111822;
  padding: 0 6px;
  border-radius: 4px;
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

.success-message {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #86efac;
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
  animation: spin 1s ease-in-out infinite;
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
</style>
