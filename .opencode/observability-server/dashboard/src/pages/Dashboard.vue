<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <StatsCards />
    <EventStream />
  </div>
</template>

<script setup lang="ts">
import StatsCards from '../components/StatsCards.vue'
import EventStream from '../components/EventStream.vue'
</script>
