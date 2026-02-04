<template>
  <div class="min-h-screen bg-github-bg">
    <nav class="bg-github-card border-b border-github-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center space-x-8">
            <div class="flex items-center space-x-2">
              <span class="text-2xl">🔭</span>
              <h1 class="text-xl font-semibold text-github-text">PAI-OpenCode Observability</h1>
            </div>
            <div class="flex space-x-4">
              <router-link
                to="/"
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                :class="$route.path === '/' ? 'bg-github-border text-github-text' : 'text-github-muted hover:text-github-text hover:bg-github-border/50'"
              >
                Dashboard
              </router-link>
              <router-link
                to="/events"
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                :class="$route.path === '/events' ? 'bg-github-border text-github-text' : 'text-github-muted hover:text-github-text hover:bg-github-border/50'"
              >
                Events
              </router-link>
              <router-link
                to="/sessions"
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                :class="$route.path === '/sessions' ? 'bg-github-border text-github-text' : 'text-github-muted hover:text-github-text hover:bg-github-border/50'"
              >
                Sessions
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </nav>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>
