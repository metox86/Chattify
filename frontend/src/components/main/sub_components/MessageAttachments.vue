<template>
  <div v-if="attachments && attachments.length" class="attachments">
    <div v-for="att in attachments" :key="att.id" class="attachment">
      <img
        v-if="isImage(att.mime_type)"
        class="img"
        :src="fileUrl(att.id)"
        :alt="att.original_name"
        loading="lazy"
        @click="emit('open-image', { id: att.id, original_name: att.original_name })"
      />

      <audio v-else-if="isAudio(att.mime_type)" class="audio" controls :src="fileUrl(att.id)"></audio>

      <video v-else-if="isVideo(att.mime_type)" class="video" controls :src="fileUrl(att.id)"></video>

      <div v-else class="file-card">
        <div class="file-meta">
          <div class="file-name" :title="att.original_name">{{ att.original_name }}</div>
          <div class="file-size">{{ formatBytes(att.size_bytes) }}</div>
        </div>
        <a class="download" :href="downloadUrl(att.id)" target="_blank" rel="noreferrer">Download</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type Attachment = {
  id: number;
  original_name: string;
  mime_type: string;
  size_bytes: number;
};

defineProps<{
  attachments: Attachment[];
}>();

const emit = defineEmits<{
  (e: 'open-image', payload: { id: number; original_name: string }): void;
}>();

const fileUrl = (id: number) => `/api/v1/files/${id}`;
const downloadUrl = (id: number) => `/api/v1/files/${id}/download`;

const isImage = (mime: string) => mime?.startsWith('image/');
const isAudio = (mime: string) => mime?.startsWith('audio/');
const isVideo = (mime: string) => mime?.startsWith('video/');

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
</script>

<style scoped>
.attachments {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.img {
  max-width: 320px;
  width: 100%;
  border-radius: 12px;
  display: block;
  cursor: pointer;
}

.audio,
.video {
  width: 320px;
  max-width: 100%;
}

.file-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
}

.file-meta {
  min-width: 0;
}

.file-name {
  font-size: 0.9rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 0.75rem;
  opacity: 0.75;
  margin-top: 2px;
}

.download {
  flex-shrink: 0;
  color: inherit;
  text-decoration: underline;
  opacity: 0.9;
}
</style>

