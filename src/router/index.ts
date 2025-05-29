import { createRouter, createWebHashHistory } from 'vue-router'
import LibraryView from '../views/LibraryView.vue';
import ReaderView from '../views/ReaderView.vue';


const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'Library',
      component: LibraryView,
    },
    {
      path: '/reader/:bookId',
      name: 'Reader',
      component: ReaderView,
      props: true
    }

  ],
})

export default router
