import './assets/main.css'

import { createApp } from 'vue'
import { I18nKey } from './i18n/usei18n';
import { i18n } from './i18n';

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

// Provide i18n to all components
app.provide(I18nKey, i18n);

app.mount('#app')

// main.ts


