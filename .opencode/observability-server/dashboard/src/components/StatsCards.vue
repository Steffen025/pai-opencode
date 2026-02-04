<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="bg-github-card border border-github-border rounded-lg p-6">
      <div class="text-github-muted text-sm font-medium mb-2">Sessions Today</div>
      <div class="text-3xl font-bold text-github-text">
        {{ stats?.sessions_today ?? '-' }}
      </div>
    </div>
    
    <div class="bg-github-card border border-github-border rounded-lg p-6">
      <div class="text-github-muted text-sm font-medium mb-2">Tools Today</div>
      <div class="text-3xl font-bold text-github-text">
        {{ stats?.tools_today ?? '-' }}
      </div>
    </div>
    
    <div class="bg-github-card border border-github-border rounded-lg p-6">
      <div class="text-github-muted text-sm font-medium mb-2">Avg Rating</div>
      <div class="text-3xl font-bold text-github-green">
        {{ stats?.avg_rating ? stats.avg_rating.toFixed(1) : '-' }}
      </div>
    </div>
    
    <div class="bg-github-card border border-github-border rounded-lg p-6">
      <div class="text-github-muted text-sm font-medium mb-2">Security Blocks</div>
      <div class="text-3xl font-bold" :class="stats?.security_blocks ? 'text-github-red' : 'text-github-green'">
        {{ stats?.security_blocks ?? '-' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getStats } from '../api'
import type { Stats } from '../types'

const stats = ref<Stats | null>(null)
let intervalId: number | null = null

async function fetchStats() {
  try {
    stats.value = await getStats()
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  }
}

onMounted(() => {
  fetchStats()
  intervalId = window.setInterval(fetchStats, 30000) // Refresh every 30s
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>
