<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <input
          v-model="searchSessionId"
          type="text"
          placeholder="Search by session ID..."
          class="w-full px-4 py-2 bg-github-card border border-github-border rounded-lg text-github-text placeholder-github-muted focus:outline-none focus:border-github-blue"
          @input="handleSearch"
        />
      </div>
      <div>
        <select
          v-model="selectedType"
          class="px-4 py-2 bg-github-card border border-github-border rounded-lg text-github-text focus:outline-none focus:border-github-blue"
          @change="handleSearch"
        >
          <option value="">All Types</option>
          <option value="session.start">Session Start</option>
          <option value="session.end">Session End</option>
          <option value="tool.execute">Tool Execute</option>
          <option value="message.user">User Message</option>
          <option value="message.assistant">Assistant Message</option>
          <option value="security.block">Security Block</option>
        </select>
      </div>
    </div>
    
    <div v-if="loading" class="text-center py-8 text-github-muted">
      Loading events...
    </div>
    
    <div v-else-if="error" class="text-center py-8 text-github-red">
      {{ error }}
    </div>
    
    <div v-else-if="events.length === 0" class="text-center py-8 text-github-muted">
      No events found
    </div>
    
    <div v-else class="space-y-2">
      <div
        v-for="event in events"
        :key="event.id"
        class="bg-github-card border border-github-border rounded-lg p-4 hover:border-github-blue/50 transition-colors cursor-pointer"
        @click="toggleEvent(event.id)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 space-y-1">
            <div class="flex items-center space-x-3">
              <span class="font-semibold" :class="getEventTypeColor(event.type)">
                {{ event.type }}
              </span>
              <span class="text-sm text-github-muted">{{ formatTimestamp(event.timestamp) }}</span>
            </div>
            <div class="text-sm text-github-muted">
              Session: <span class="text-github-blue">{{ event.session_id.slice(0, 8) }}</span>
            </div>
            <div v-if="event.metadata?.tool_name" class="text-sm text-github-text">
              Tool: {{ event.metadata.tool_name }}
              <span v-if="event.metadata.duration_ms" class="text-github-muted">
                ({{ event.metadata.duration_ms }}ms)
              </span>
            </div>
          </div>
          <div class="text-github-muted">
            {{ expandedEvents.has(event.id) ? '▼' : '▶' }}
          </div>
        </div>
        
        <div v-if="expandedEvents.has(event.id)" class="mt-4 pt-4 border-t border-github-border">
          <pre class="text-sm text-github-text bg-github-bg p-3 rounded overflow-x-auto">{{ JSON.stringify(event.data, null, 2) }}</pre>
          <div v-if="event.metadata" class="mt-2">
            <div class="text-sm text-github-muted">Metadata:</div>
            <pre class="text-sm text-github-text bg-github-bg p-3 rounded overflow-x-auto mt-1">{{ JSON.stringify(event.metadata, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="!loading && events.length > 0" class="flex justify-between items-center pt-4">
      <button
        @click="prevPage"
        :disabled="offset === 0"
        class="px-4 py-2 bg-github-border text-github-text rounded hover:bg-github-border/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Previous
      </button>
      <span class="text-github-muted">
        Showing {{ offset + 1 }}-{{ Math.min(offset + limit, total) }} of {{ total }}
      </span>
      <button
        @click="nextPage"
        :disabled="offset + limit >= total"
        class="px-4 py-2 bg-github-border text-github-text rounded hover:bg-github-border/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getEvents } from '../api'
import type { Event } from '../types'

const events = ref<Event[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const expandedEvents = ref(new Set<string>())
const searchSessionId = ref('')
const selectedType = ref('')
const offset = ref(0)
const limit = ref(20)
const total = ref(0)

function getEventTypeColor(type: string): string {
  if (type.startsWith('session')) return 'text-github-blue'
  if (type.startsWith('tool')) return 'text-github-green'
  if (type.startsWith('message')) return 'text-github-orange'
  if (type.includes('error') || type.includes('security')) return 'text-github-red'
  return 'text-github-text'
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString()
}

function toggleEvent(id: string) {
  if (expandedEvents.value.has(id)) {
    expandedEvents.value.delete(id)
  } else {
    expandedEvents.value.add(id)
  }
}

async function fetchEvents() {
  loading.value = true
  error.value = null
  
  try {
    const response = await getEvents({
      type: selectedType.value || undefined,
      session_id: searchSessionId.value || undefined,
      limit: limit.value,
      offset: offset.value,
    })
    
    events.value = response.events
    total.value = response.total
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch events'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  offset.value = 0
  fetchEvents()
}

function nextPage() {
  offset.value += limit.value
  fetchEvents()
}

function prevPage() {
  offset.value = Math.max(0, offset.value - limit.value)
  fetchEvents()
}

onMounted(() => {
  fetchEvents()
})
</script>
