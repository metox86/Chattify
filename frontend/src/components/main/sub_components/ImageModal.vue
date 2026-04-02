<template>
  <div class="overlay" @click.self="emit('close')">
    <button class="btn close" type="button" title="Close" @click="emit('close')">✕</button>
    <button class="btn download" type="button" title="Download" @click="emit('download')">↓</button>
    <img class="img" :src="src" :alt="alt || 'image'" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  src: string;
  alt?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'download'): void;
}>();
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 9999;
}

.img {
  max-width: min(1100px, 96vw);
  max-height: 90vh;
  width: auto;
  height: auto;
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.btn {
  position: absolute;
  top: 14px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  cursor: pointer;
}

.close {
  right: 14px;
}

.download {
  right: 62px;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.16);
}
</style>

