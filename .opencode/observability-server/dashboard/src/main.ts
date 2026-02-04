import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import Dashboard from './pages/Dashboard.vue'
import Events from './pages/Events.vue'
import Sessions from './pages/Sessions.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Dashboard },
    { path: '/events', component: Events },
    { path: '/sessions', component: Sessions },
  ]
})

const app = createApp(App)
app.use(router)
app.mount('#app')
