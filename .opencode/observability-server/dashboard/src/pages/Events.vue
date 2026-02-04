<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-github-text">Event Browser</h1>
      <p class="text-github-muted mt-1">Search and explore all observability events</p>
    </div>
    <EventList />
  </div>
</template>

<script setup lang="ts">
import EventList from '../components/EventList.vue'
</script>
