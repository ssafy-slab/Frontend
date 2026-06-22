import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './app/App.vue'
import router from './router'
import { handleOAuthCallbackRedirect } from './entities/auth/api/oauthCallback'
import './app/styles/index.css'

const handledOAuthCallback = handleOAuthCallbackRedirect({
  pathname: window.location.pathname,
  search: window.location.search,
  storage: window.localStorage,
  fetch: window.fetch.bind(window),
  replace: (url) => window.location.replace(url),
})

if (!(await handledOAuthCallback)) {
  const app = createApp(App)

  app.use(createPinia())
  app.use(router)

  app.mount('#app')
}
