<template>
  <div class="p-6 max-w-md mx-auto">
    <h1 class="text-2xl font-bold mb-4">🔐 Log ind</h1>


    <form @submit.prevent="handleLogin" class="space-y-4">
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        class="w-full border p-2 rounded"
        required
      />
      <input
        v-model="password"
        type="password"
        placeholder="Adgangskode"
        class="w-full border p-2 rounded"
        required
      />
      <button
        type="submit"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded"
      >
        Log ind
      </button>
      <NuxtLink to="/">
  <button
    type="button"
    class="w-full bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 rounded mt-2"
  >
    ⬅️ Tilbage til forsiden
  </button>
</NuxtLink>
    </form>

    <p v-if="error" class="text-red-500 mt-4">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const error = ref('')
const router = useRouter()

const handleLogin = async () => {
  try {
    error.value = ''
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value }
    })

    // Role-based handling
    const { token, role } = response

    if (role === 'parent') {
      localStorage.setItem('parent_token', token)
      router.push('/parent-dashboard')
    } else if (role === 'nurse') {
      localStorage.setItem('nurse_token', token)
      router.push('/isj')
    } else if (role === 'admins') {
      localStorage.setItem('admin_token', token)
      router.push('/isj')
    } else {
      error.value = 'Ukendt rolle'
    }
  } catch (err: any) {
    console.error(err)
    error.value = 'Login mislykkedes – tjek dine oplysninger'
  }
}
</script>
