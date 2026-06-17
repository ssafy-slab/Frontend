<script setup lang="ts">
import { CheckCircle2, Circle } from 'lucide-vue-next'
import { computed, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { AuthUser } from '@/entities/auth/api/authApi'

const props = defineProps<{
  mode: 'login' | 'signup'
}>()

const emit = defineEmits<{
  change: [view: string]
  authenticated: [payload: AuthUser]
}>()

const authStore = useAuthStore()

const form = reactive({
  nickname: '',
  email: '',
  password: '',
  passwordConfirm: '',
  agreed: false,
})

const errorMessage = ref('')
const isSubmitting = ref(false)

const isSignup = computed(() => props.mode === 'signup')
const isEmailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
const passwordChecks = computed(() => [
  { label: '8자 이상', valid: form.password.length >= 8 },
  { label: '영문 포함', valid: /[A-Za-z]/.test(form.password) },
  { label: '숫자 포함', valid: /\d/.test(form.password) },
])
const isPasswordValid = computed(() => passwordChecks.value.every((item) => item.valid))

async function submit() {
  errorMessage.value = ''

  if (!form.email || !form.password) {
    errorMessage.value = '이메일과 비밀번호를 입력해주세요.'
    return
  }

  if (!isEmailValid.value) {
    errorMessage.value = '올바른 이메일 형식으로 입력해주세요.'
    return
  }

  if (isSignup.value) {
    if (!form.nickname.trim()) {
      errorMessage.value = '이름 또는 닉네임을 입력해주세요.'
      return
    }
    if (!isPasswordValid.value) {
      errorMessage.value = '비밀번호는 8자 이상이며 영문과 숫자를 모두 포함해야 합니다.'
      return
    }
    if (form.password !== form.passwordConfirm) {
      errorMessage.value = '비밀번호 확인이 일치하지 않습니다.'
      return
    }
    if (!form.agreed) {
      errorMessage.value = '필수 약관에 동의해주세요.'
      return
    }
  }

  isSubmitting.value = true
  try {
    const user = isSignup.value
      ? await authStore.signup({
          email: form.email.trim(),
          password: form.password,
          nickname: form.nickname.trim(),
        })
      : await authStore.login({
          email: form.email.trim(),
          password: form.password,
        })

    emit('authenticated', user)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '로그인 처리 중 오류가 발생했습니다.'
  } finally {
    isSubmitting.value = false
  }
}

function startOAuthLogin(provider: 'kakao' | 'google' | 'naver') {
  authStore.startOAuthLogin(provider)
}
</script>

<template>
  <form class="mt-8 space-y-3" @submit.prevent="submit">
    <input
      v-if="isSignup"
      v-model="form.nickname"
      class="brand-input h-12 w-full rounded-xl px-4 text-base outline-none"
      placeholder="이름 또는 닉네임"
    />

    <div>
      <input v-model="form.email" class="brand-input h-12 w-full rounded-xl px-4 text-base outline-none" placeholder="이메일 주소" type="email" />
      <p v-if="isSignup && form.email && !isEmailValid" class="mt-1.5 text-xs font-bold text-red-600">
        이메일 형식이 올바르지 않습니다.
      </p>
    </div>

    <div>
      <input v-model="form.password" class="brand-input h-12 w-full rounded-xl px-4 text-base outline-none" placeholder="비밀번호" type="password" />
      <div v-if="isSignup" class="mt-2 flex flex-wrap gap-2">
        <span
          v-for="item in passwordChecks"
          :key="item.label"
          class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black"
          :class="item.valid ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-500'"
        >
          <CheckCircle2 v-if="item.valid" :size="13" />
          <Circle v-else :size="13" />
          {{ item.label }}
        </span>
      </div>
    </div>

    <input
      v-if="isSignup"
      v-model="form.passwordConfirm"
      class="brand-input h-12 w-full rounded-xl px-4 text-base outline-none"
      placeholder="비밀번호 확인"
      type="password"
    />

    <label v-if="isSignup" class="flex items-center gap-2 pt-2 text-sm font-semibold text-slate-500">
      <input v-model="form.agreed" type="checkbox" class="size-4 accent-brand-500" />
      필수 약관 및 개인정보 처리방침에 동의합니다.
    </label>

    <p v-if="errorMessage" class="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">
      {{ errorMessage }}
    </p>

    <button class="btn-primary !mt-5 h-12 w-full rounded-xl text-base disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSubmitting">
      {{ isSubmitting ? '처리 중...' : isSignup ? '가입 완료하기' : '이메일로 로그인' }}
    </button>
  </form>

  <div v-if="!isSignup" class="mt-5 flex justify-center gap-8 text-sm font-bold text-slate-500">
    <button type="button">비밀번호 찾기</button>
    <button type="button" @click="emit('change', 'signup')">회원가입</button>
  </div>

  <div v-else class="mt-5 flex justify-center gap-4 text-sm font-bold">
    <span class="text-slate-500">이미 계정이 있으신가요?</span>
    <button type="button" class="text-brand-500" @click="emit('change', 'login')">로그인</button>
  </div>

  <template v-if="!isSignup">
    <div class="my-7 flex items-center gap-3">
      <span class="h-px flex-1 bg-slate-200" />
      <span class="text-xs font-semibold text-slate-500">또는 다음으로 로그인</span>
      <span class="h-px flex-1 bg-slate-200" />
    </div>

    <div class="space-y-3">
      <button
        type="button"
        class="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#fee500] text-sm font-black text-slate-950"
        @click="startOAuthLogin('kakao')"
      >
        <svg class="size-5 shrink-0" viewBox="0 0 32 32" aria-hidden="true">
          <path
            fill="#191919"
            d="M16 6.5C9.4 6.5 4 10.7 4 15.8c0 3.2 2.1 6 5.4 7.7l-1 3.7a.7.7 0 0 0 1 .8l4.4-2.9c.7.1 1.4.2 2.2.2 6.6 0 12-4.2 12-9.5S22.6 6.5 16 6.5Z"
          />
        </svg>
        카카오 로그인
      </button>
      <button
        type="button"
        class="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#03c75a] text-sm font-black text-white"
        @click="startOAuthLogin('naver')"
      >
        <svg class="size-5 shrink-0" viewBox="0 0 32 32" aria-hidden="true">
          <path fill="#fff" d="M19 16.7 12.6 7.5H7.2v17h5.8v-9.2l6.4 9.2h5.4v-17H19v9.2Z" />
        </svg>
        네이버 로그인
      </button>
      <button
        type="button"
        class="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-800"
        @click="startOAuthLogin('google')"
      >
        <svg class="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8Z" />
          <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.8l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.8 0-5.2-1.9-6.1-4.5H2.2v2.8A11 11 0 0 0 12 23Z" />
          <path fill="#FBBC05" d="M5.9 14a6.6 6.6 0 0 1 0-4V7.2H2.2a11 11 0 0 0 0 9.6L5.9 14Z" />
          <path fill="#EA4335" d="M12 5.5c1.6 0 3.1.6 4.2 1.7l3.2-3.2A10.8 10.8 0 0 0 12 1 11 11 0 0 0 2.2 7.2L5.9 10c.9-2.6 3.3-4.5 6.1-4.5Z" />
        </svg>
        구글 로그인
      </button>
    </div>
  </template>
</template>
