<template>
  <div id="app-root">
    <router-view />
  </div>
</template>

<script setup lang="ts">
</script>

<style>
/* Global Styles */
body, html {
  margin: 0;
  padding: 0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background-color: #090a0f; /* Match the dark theme base */
  color: #fff;
  min-height: 100vh;
}

#app-root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>
