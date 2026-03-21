import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '../components/LoginPage.vue';
import RegisterPage from '../components/RegisterPage.vue';
import MainMenu from '../components/main/MainMenu.vue';

const routes = [
  {
    path: '/',
    name: 'Root',
    redirect: () => {
      const userStr = localStorage.getItem('chat_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user && user.userId) {
            return `/${user.userId}/chats`;
          }
        } catch (e) {}
      }
      return '/login';
    }
  },
  {
    path: '/:userId/chats',
    name: 'Chats',
    component: MainMenu
  },
  {
    path: '/:userId/chats/:chatId',
    name: 'ChatDetail',
    component: MainMenu
  },
  {
    path: '/:userId/groups/:groupId',
    name: 'GroupChatDetail',
    component: MainMenu
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterPage
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard
router.beforeEach((to, _, next) => {
  const userStr = localStorage.getItem('chat_user');
  let user = null;
  if(userStr) {
    try { user = JSON.parse(userStr); } catch(e) {}
  }

  if (to.name !== 'Login' && to.name !== 'Register' && !user) {
    next({ name: 'Login' });
  } else if ((to.name === 'Login' || to.name === 'Register') && user && user.userId) {
    next(`/${user.userId}/chats`);
  } else {
    next();
  }
});

export default router;
