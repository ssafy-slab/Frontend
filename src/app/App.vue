<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import AuthPage from '@/pages/auth/ui/AuthPage.vue'
import CommunityDetailPage from '@/pages/community/ui/CommunityDetailPage.vue'
import CommunityEditorPage from '@/pages/community/ui/CommunityEditorPage.vue'
import CommunityPage from '@/pages/community/ui/CommunityPage.vue'
import ExplorePage from '@/pages/explore/ui/ExplorePage.vue'
import HomePage from '@/pages/home/ui/HomePage.vue'
import PlaceDetailPage from '@/pages/place/ui/PlaceDetailPage.vue'
import ProfilePage from '@/pages/profile/ui/ProfilePage.vue'
import ScheduleDetailPage from '@/pages/schedule/ui/ScheduleDetailPage.vue'
import SchedulePage from '@/pages/schedule/ui/SchedulePage.vue'
import AppFooter from '@/widgets/footer/ui/AppFooter.vue'
import AppHeader from '@/widgets/header/ui/AppHeader.vue'
import MobileNav from '@/widgets/mobile-nav/ui/MobileNav.vue'
import type { CommunityPost, Place, Trip } from '@/entities/travel/model/travel'
import { places, posts, trips } from '@/entities/travel/model/travel'
import { useAuthStore } from '@/stores/auth'
import type { AuthUser } from '@/entities/auth/api/authApi'

type ViewName =
  | 'home'
  | 'explore'
  | 'place-detail'
  | 'schedule'
  | 'schedule-detail'
  | 'community'
  | 'community-write'
  | 'community-detail'
  | 'profile'
  | 'login'
  | 'signup'

const activeView = ref<ViewName>('home')
const authStore = useAuthStore()
const { user: currentUser } = storeToRefs(authStore)
const selectedPlace = ref<Place | null>(places[0] ?? null)
const selectedTrip = ref<Trip | null>(trips[0] ?? null)
const communityPosts = ref<CommunityPost[]>([...posts])
const toastMessage = ref('')
const authMode = computed(() => (activeView.value === 'signup' ? 'signup' : 'login'))

function changeView(view: string) {
  activeView.value = view as ViewName
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openPlace(place: Place) {
  selectedPlace.value = place
  changeView('place-detail')
}

function openTrip(trip: Trip) {
  selectedTrip.value = trip
  changeView('schedule-detail')
}

function addPost(post: CommunityPost) {
  communityPosts.value = [post, ...communityPosts.value]
  showToast('커뮤니티 글이 등록되었습니다.')
  changeView('community')
}

function showToast(message: string) {
  toastMessage.value = message
  window.setTimeout(() => {
    if (toastMessage.value === message) toastMessage.value = ''
  }, 1800)
}

function handleLogin(payload: AuthUser) {
  showToast(`${payload.nickname}님 환영합니다.`)
  changeView('home')
}

function handleLogout() {
  authStore.logout()
  showToast('로그아웃되었습니다.')
  changeView('home')
}

function handleOAuthCallback() {
  if (window.location.pathname !== '/oauth/callback') return

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  if (params.get('error')) {
    showToast('소셜 로그인에 실패했습니다.')
    window.history.replaceState({}, document.title, '/')
    changeView('login')
    return
  }

  const accessToken = params.get('accessToken')
  const userId = Number(params.get('userId'))
  const email = params.get('email')
  const nickname = params.get('nickname')
  const role = params.get('role')

  if (!accessToken || !userId || !email || !nickname || !role) {
    showToast('소셜 로그인 응답을 확인할 수 없습니다.')
    window.history.replaceState({}, document.title, '/')
    changeView('login')
    return
  }

  const user = authStore.applyOAuthCallback({
    tokenType: params.get('tokenType') || 'Bearer',
    accessToken,
    user: {
      userId,
      email,
      nickname,
      role,
    },
  })

  window.history.replaceState({}, document.title, '/')
  handleLogin(user)
}

onMounted(handleOAuthCallback)
</script>

<template>
  <AppHeader
    :active-view="activeView"
    :current-user="currentUser"
    @change="changeView"
    @logout="handleLogout"
  />

  <main class="page-shell" :class="activeView === 'explore' ? 'pb-0' : 'pb-24 md:pb-0'">
    <Transition name="page-fade" mode="out-in">
      <HomePage v-if="activeView === 'home'" key="home" @change="changeView" @open-place="openPlace" />
      <ExplorePage v-else-if="activeView === 'explore'" key="explore" @open-place="openPlace" @saved="showToast" />
      <PlaceDetailPage v-else-if="activeView === 'place-detail'" key="place-detail" :place="selectedPlace" @change="changeView" @saved="showToast" />
      <SchedulePage v-else-if="activeView === 'schedule'" key="schedule" :current-user="currentUser" @open-trip="openTrip" @saved="showToast" />
      <ScheduleDetailPage v-else-if="activeView === 'schedule-detail'" key="schedule-detail" :trip="selectedTrip" @change="changeView" @saved="showToast" />
      <CommunityPage v-else-if="activeView === 'community'" key="community" :posts="communityPosts" @change="changeView" />
      <CommunityEditorPage v-else-if="activeView === 'community-write'" key="community-write" @change="changeView" @create-post="addPost" />
      <CommunityDetailPage v-else-if="activeView === 'community-detail'" key="community-detail" @change="changeView" @saved="showToast" />
      <ProfilePage v-else-if="activeView === 'profile'" key="profile" :current-user="currentUser" @change="changeView" @saved="showToast" />
      <AuthPage v-else key="auth" :mode="authMode" @change="changeView" @authenticated="handleLogin" />
    </Transition>
  </main>

  <AppFooter v-if="activeView !== 'explore'" />

  <MobileNav :active-view="activeView" @change="changeView" />

  <Transition name="toast-pop">
    <div v-if="toastMessage" class="fixed bottom-24 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl md:bottom-6">
      {{ toastMessage }}
    </div>
  </Transition>
</template>
