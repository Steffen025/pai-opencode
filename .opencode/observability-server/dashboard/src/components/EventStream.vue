<template>
  <div class="bg-github-card border border-github-border rounded-lg">
    <div class="flex items-center justify-between p-4 border-b border-github-border">
      <h2 class="text-lg font-semibold text-github-text">Live Event Stream</h2>
      <div class="flex items-center space-x-3">
        <button
          @click="togglePause"
          class="px-3 py-1 text-sm rounded bg-github-border text-github-text hover:bg-github-border/70 transition-colors"
        >
          {{ isPaused ? 'Resume' : 'Pause' }}
        </button>
        <div class="flex items-center space-x-2">
          <div class="w-2 h-2 rounded-full" :class="isConnected ? 'bg-github-green' : 'bg-github-red'"></div>
          <span class="text-sm text-github-muted">{{ isConnected ? 'Connected' : 'Disconnected' }}</span>
        </div>
      </div>
    </div>
    
    <div class="p-4 space-y-2 max-h-96 overflow-y-auto font-mono text-sm">
      <div v-if="events.length === 0" class="text-github-muted text-center py-8">
        Waiting for events...
      </div>
      <div
        v-for="event in events"
        :key="event.id"
        class="flex items-start space-x-3 p-2 rounded hover:bg-github-bg/50 transition-colors"
      >
        <span class="text-github-muted whitespace-nowrap">{{ formatTime(event.timestamp) }}</span>
        <span class="font-semibold whitespace-nowrap" :class="getEventTypeColor(event.type)">
          {{ event.type }}
        </span>
        <span class="text-github-text flex-1 truncate">
          {{ getEventDescription(event) }}
        </span>
        <span v-if="event.metadata?.duration_ms" class="text-github-muted whitespace-nowrap">
          {{ event.metadata.duration_ms }}ms
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { createEventStream } from '../api'
import type { Event } from '../types'

const events = ref<Event[]>([])
const isPaused = ref(false)
const isConnected = ref(false)
let eventSource: EventSource | null = null

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour12: false })
}

function getEventTypeColor(type: string): string {
  if (type.startsWith('session')) return 'text-github-blue'
  if (type.startsWith('tool')) return 'text-github-green'
  if (type.startsWith('message')) return 'text-github-orange'
  if (type.includes('error') || type.includes('security')) return 'text-github-red'
  return 'text-github-text'
}

function getEventDescription(event: Event): string {
  if (event.type === 'tool.execute' && event.metadata?.tool_name) {
    return `${event.metadata.tool_name}: ${JSON.stringify(event.data).slice(0, 50)}...`
  }
  if (event.type === 'message.user' || event.type === 'message.assistant') {
    return JSON.stringify(event.data.content || event.data).slice(0, 80)
  }
  if (event.type.startsWith('session')) {
    return event.session_id
  }
  return JSON.stringify(event.data).slice(0, 80)
}

function togglePause() {
  isPaused.value = !isPaused.value
}

function connectStream() {
  try {
    eventSource = createEventStream()
    
    eventSource.onopen = () => {
      isConnected.value = true
    }
    
    eventSource.onmessage = (e) => {
      if (isPaused.value) return
      
      try {
        const event = JSON.parse(e.data) as Event
        events.value = [event, ...events.value].slice(0, 50) // Keep last 50
      } catch (err) {
        console.error('Failed to parse event:', err)
      }
    }
    
    eventSource.onerror = () => {
      isConnected.value = false
      // Attempt reconnection after 5s
      setTimeout(() => {
        if (eventSource) {
          eventSource.close()
          connectStream()
        }
      }, 5000)
    }
  } catch (error) {
    console.error('Failed to connect to event stream:', error)
  }
}

onMounted(() => {
  connectStream()
})

onUnmounted(() => {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
})
</script>
