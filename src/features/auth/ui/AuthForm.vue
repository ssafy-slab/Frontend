<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

const props = defineProps<{
  mode: 'login' | 'signup'
}>()

const emit = defineEmits<{
  change: [view: string]
  authenticated: [payload: { email: string; nickname?: string }]
}>()

const form = reactive({
  nickname: '',
  email: '',
  password: '',
  passwordConfirm: '',
  agreed: false,
})

const errorMessage = ref('')

const isSignup = computed(() => props.mode === 'signup')

function submit() {
  errorMessage.value = ''

  if (!form.email || !form.password) {
    errorMessage.value = '이메일과 비밀번호를 입력해주세요.'
    return
  }

  if (isSignup.value) {
    if (!form.nickname) {
      errorMessage.value = '이름 또는 닉네임을 입력해주세요.'
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

  emit('authenticated', {
    email: form.email,
    nickname: isSignup.value ? form.nickname : undefined,
  })
}
</script>

<template>
  <form class="mt-8 space-y-3" @submit.prevent="submit">
    <input
      v-if="isSignup"
      v-model="form.nickname"
      class="brand-input h-12 w-full rounded-xl px-4 text-base outline-none"
      placeholder="이름 (또는 닉네임)"
    />
    <input v-model="form.email" class="brand-input h-12 w-full rounded-xl px-4 text-base outline-none" placeholder="이메일 주소" type="email" />
    <input v-model="form.password" class="brand-input h-12 w-full rounded-xl px-4 text-base outline-none" placeholder="비밀번호" type="password" />
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

    <button class="btn-primary !mt-5 h-12 w-full rounded-xl text-base">
      {{ isSignup ? '가입 완료하기' : '이메일로 로그인' }}
    </button>
  </form>

  <div v-if="!isSignup" class="mt-5 flex justify-center gap-8 text-sm font-bold text-slate-500">
    <button>비밀번호 찾기</button>
    <button @click="emit('change', 'signup')">회원가입</button>
  </div>

  <div v-else class="mt-5 flex justify-center gap-4 text-sm font-bold">
    <span class="text-slate-500">이미 계정이 있으신가요?</span>
    <button class="text-brand-500" @click="emit('change', 'login')">로그인</button>
  </div>

  <template v-if="!isSignup">
    <div class="my-7 flex items-center gap-3">
      <span class="h-px flex-1 bg-slate-200" />
      <span class="text-xs font-semibold text-slate-500">또는 다음으로 로그인</span>
      <span class="h-px flex-1 bg-slate-200" />
    </div>

    <div class="space-y-3">
      <button
        class="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#fee500] text-sm font-black text-slate-950"
        @click="emit('authenticated', { email: 'kakao@example.com', nickname: '카카오여행자' })"
      >
        <span class="grid size-5 place-items-center rounded-full bg-slate-950 text-[10px] font-black text-[#fee500]">K</span>
        카카오 로그인
      </button>
      <button
        class="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#03c75a] text-sm font-black text-white"
        @click="emit('authenticated', { email: 'naver@example.com', nickname: '네이버여행자' })"
      >
        <span class="text-base font-black">N</span>
        네이버 로그인
      </button>
      <button
        class="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-800"
        @click="emit('authenticated', { email: 'google@example.com', nickname: '구글여행자' })"
      >
        <span class="font-black text-blue-500">G</span>
        구글 로그인
      </button>
    </div>
  </template>
</template>
