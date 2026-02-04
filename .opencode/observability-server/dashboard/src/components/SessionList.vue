<template>
  <div class="space-y-4">
    <div v-if="loading" class="text-center py-8 text-github-muted">
      Loading sessions...
    </div>
    
    <div v-else-if="error" class="text-center py-8 text-github-red">
      {{ error }}
    </div>
    
    <div v-else-if="sessions.length === 0" class="text-center py-8 text-github-muted">
      No sessions found
    </div>
    
    <div v-else class="space-y-2">
      <div
        v-for="session in sessions"
        :key="session.session_id"
        class="bg-github-card border border-github-border rounded-lg p-4 hover:border-github-blue/50 transition-colors cursor-pointer"
        @click="toggleSession(session.session_id)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 space-y-2">
            <div class="flex items-center space-x-3">
              <span class="font-mono text-github-blue">{{ session.session_id.slice(0, 12) }}...</span>
              <span
                class="px-2 py-1 rounded text-xs font-medium"
                :class="session.status === 'active' ? 'bg-github-green/20 text-github-green' : 'bg-github-muted/20 text-github-muted'"
              >
                {{ session.status }}
              </span>
            </div>
            
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div class="text-github-muted">Started</div>
                <div class="text-github-text">{{ formatTimestamp(session.started_at) }}</div>
              </div>
              <div v-if="session.ended_at">
                <div class="text-github-muted">Ended</div>
                <div class="text-github-text">{{ formatTimestamp(session.ended_at) }}</div>
              </div>
              <div>
                <div class="text-github-muted">Events</div>
                <div class="text-github-text">{{ session.event_count }}</div>
              </div>
              <div>
                <div class="text-github-muted">Tools</div>
                <div class="text-github-text">{{ session.tool_count }}</div>
              </div>
            </div>
          </div>
          <div class="text-github-muted">
            {{ expandedSessions.has(session.session_id) ? '▼' : '▶' }}
          </div>
        </div>
        
        <div v-if="expandedSessions.has(session.session_id)" class="mt-4 pt-4 border-t border-github-border">
          <div v-if="loadingEvents" class="text-center py-4 text-github-muted">
            Loading events...
          </div>
          <div v-else-if="sessionEvents[session.session_id]" class="space-y-2">
            <div class="text-sm font-medium text-github-text mb-2">Session Events:</div>
            <div
              v-for="event in sessionEvents[session.session_id]"
              :key="event.id"
              class="bg-github-bg p-3 rounded text-sm"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-semibold" :class="getEventTypeColor(event.type)">{{ event.type }}</span>
                <span class="text-github-muted">{{ formatTime(event.timestamp) }}</span>
              </div>
              <div v-if="event.metadata?.tool_name" class="text-github-muted">
                Tool: {{ event.metadata.tool_name }}
                <span v-if="event.metadata.duration_ms">({{ event.metadata.duration_ms }}ms)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { getSessions, getEvents } from '../api'
import type { Session, Event } from '../types'

const sessions = ref<Session[]>([])
const loading = ref(false)
const loadingEvents = ref(false)
const error = ref<string | null>(null)
const expandedSessions = ref(new Set<string>())
const sessionEvents = reactive<Record<string, Event[]>>({})

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

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour12: false })
}

async function toggleSession(sessionId: string) {
  if (expandedSessions.value.has(sessionId)) {
    expandedSessions.value.delete(sessionId)
  } else {
    expandedSessions.value.add(sessionId)
    
    // Load events for this session if not already loaded
    if (!sessionEvents[sessionId]) {
      loadingEvents.value = true
      try {
        const response = await getEvents({ session_id: sessionId, limit: 100 })
        sessionEvents[sessionId] = response.events
      } catch (err) {
        console.error('Failed to load session events:', err)
      } finally {
        loadingEvents.value = false
      }
    }
  }
}

async function fetchSessions() {
  loading.value = true
  error.value = null
  
  try {
    const response = await getSessions()
    sessions.value = response.sessions
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch sessions'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchSessions()
})
</script>
