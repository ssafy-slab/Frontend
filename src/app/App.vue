<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import AuthPage from '@/pages/auth/ui/AuthPage.vue'
import ForgotPasswordPage from '@/pages/auth/ui/ForgotPasswordPage.vue'
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
import { resolveViewChange } from '@/app/lib/navigationGuard'
import type { Place, Trip } from '@/entities/travel/model/travel'
import { places } from '@/entities/travel/model/travel'
import { useAuthStore } from '@/stores/auth'
import type { AuthUser } from '@/entities/auth/api/authApi'
import { fetchPlace } from '@/entities/place/api/placeApi'
import { fetchTrips } from '@/entities/travel/api/tripApi'
import { loadViewState, replaceViewPath, saveViewState } from '@/app/lib/viewState'
import type { ViewName } from '@/app/lib/viewState'
import { resolveAuthenticatedView } from '@/app/lib/authRedirect'

const savedViewState = loadViewState(window.sessionStorage, window.location.pathname, window.location.hash)
const authStore = useAuthStore()
const { user: currentUser } = storeToRefs(authStore)
const initialView = resolveViewChange(savedViewState.activeView ?? 'home', authStore.isAuthenticated).view as ViewName
const activeView = ref<ViewName>(initialView)
const selectedPlace = ref<Place | null>(savedViewState.selectedPlace ?? places[0] ?? null)
const selectedTrip = ref<Trip | null>(savedViewState.selectedTrip ?? null)
const appTrips = ref<Trip[]>([])
const selectedCommunityPostId = ref<number | null>(savedViewState.selectedCommunityPostId ?? null)
const editingCommunityPostId = ref<number | null>(savedViewState.editingCommunityPostId ?? null)
const toastMessage = ref('')
const authMode = computed(() => (activeView.value === 'signup' ? 'signup' : 'login'))

watch(
  [activeView, selectedPlace, selectedTrip, selectedCommunityPostId, editingCommunityPostId],
  () => {
    saveViewState(window.sessionStorage, {
      activeView: activeView.value,
      selectedPlace: selectedPlace.value,
      selectedTrip: selectedTrip.value,
      selectedCommunityPostId: selectedCommunityPostId.value,
      editingCommunityPostId: editingCommunityPostId.value,
    })
    replaceViewPath(window.history, window.location.search, activeView.value)
  },
  { immediate: true },
)

function changeView(view: string) {
  const next = resolveViewChange(view, authStore.isAuthenticated)
  activeView.value = next.view as ViewName
  if (next.message) showToast(next.message)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function loadAppTrips() {
  if (!authStore.accessToken) {
    appTrips.value = []
    return
  }

  try {
    appTrips.value = await fetchTrips(authStore.accessToken)
  } catch {
    appTrips.value = []
  }
}

function openPlace(place: Place) {
  selectedPlace.value = place
  changeView('place-detail')
}

async function openPlaceById(placeId: number) {
  try {
    openPlace(await fetchPlace(placeId))
  } catch {
    showToast('여행지 정보를 불러오지 못했습니다.')
  }
}

function openTrip(trip: Trip) {
  selectedTrip.value = trip
  changeView('schedule-detail')
}

function openCommunityPost(postId: number) {
  editingCommunityPostId.value = null
  selectedCommunityPostId.value = postId
  changeView('community-detail')
}

function handleCommunityPostCreated(postId: number) {
  editingCommunityPostId.value = null
  openCommunityPost(postId)
}

function openCommunityPostEditor(postId: number) {
  editingCommunityPostId.value = postId
  changeView('community-write')
}

function openCommunityWrite() {
  editingCommunityPostId.value = null
  changeView('community-write')
}

function handleCommunityPageChange(view: string) {
  if (view === 'community-write') {
    openCommunityWrite()
    return
  }
  changeView(view)
}

function handleCommunityPostDeleted() {
  selectedCommunityPostId.value = null
  editingCommunityPostId.value = null
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
  changeView(resolveAuthenticatedView())
}

function handleLogout() {
  authStore.logout()
  showToast('로그아웃되었습니다.')
  changeView('home')
}

onMounted(loadAppTrips)

watch(
  () => authStore.accessToken,
  () => {
    void loadAppTrips()
  },
)

watch(activeView, (view) => {
  if (view === 'explore' || view === 'place-detail' || view === 'schedule') {
    void loadAppTrips()
  }
})

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
      <ExplorePage v-else-if="activeView === 'explore'" key="explore" :access-token="authStore.accessToken" :trips="appTrips" @open-place="openPlace" @saved="showToast" />
      <PlaceDetailPage
        v-else-if="activeView === 'place-detail'"
        key="place-detail"
        :place="selectedPlace"
        :current-user="currentUser"
        :access-token="authStore.accessToken"
        :trips="appTrips"
        @change="changeView"
        @saved="showToast"
      />
      <SchedulePage v-else-if="activeView === 'schedule'" key="schedule" :current-user="currentUser" :access-token="authStore.accessToken" @open-trip="openTrip" @saved="showToast" />
      <ScheduleDetailPage v-else-if="activeView === 'schedule-detail'" key="schedule-detail" :trip="selectedTrip" :access-token="authStore.accessToken" :current-user="currentUser" @change="changeView" @saved="showToast" @open-place="openPlaceById" />
      <CommunityPage
        v-else-if="activeView === 'community'"
        key="community"
        :access-token="authStore.accessToken"
        @change="handleCommunityPageChange"
        @open-post="openCommunityPost"
        @saved="showToast"
      />
      <CommunityEditorPage
        v-else-if="activeView === 'community-write'"
        key="community-write"
        :access-token="authStore.accessToken"
        :edit-post-id="editingCommunityPostId"
        @change="changeView"
        @created="handleCommunityPostCreated"
        @saved="showToast"
      />
      <CommunityDetailPage
        v-else-if="activeView === 'community-detail'"
        key="community-detail"
        :post-id="selectedCommunityPostId"
        :access-token="authStore.accessToken"
        @change="changeView"
        @edit="openCommunityPostEditor"
        @deleted="handleCommunityPostDeleted"
        @saved="showToast"
      />
      <ProfilePage v-else-if="activeView === 'profile'" key="profile" :current-user="currentUser" @change="changeView" @saved="showToast" @open-place="openPlaceById" />
      <ForgotPasswordPage v-else-if="activeView === 'forgot-password'" key="forgot-password" @change="changeView" />
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
