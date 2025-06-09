<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const menuOpen = ref(false)
const router = useRouter()
</script>

<template>
  <div
    class="min-h-screen w-full bg-cover bg-center bg-no-repeat font-sans relative"
    style="background-image: url('/webpage/pics/1.jpg')"
  >
    <!-- Mørkt overlay -->
    <div class="absolute inset-0 bg-black/60"></div>

    <!-- Indhold -->
    <div class="relative z-10 text-[#b8f5cc]">
      <!-- Header -->
      <header class="w-full flex items-center justify-between px-6 sm:px-10 py-6 bg-amber-50 bg-opacity-90 shadow-md relative">
        <h1 class="text-2xl font-extrabold text-blue-700">BodyMetrics</h1>

        <div class="flex items-center gap-4">
          <!-- Info-knap -->
          <NuxtLink to="/info">
            <button
              class="hidden sm:inline bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-2 rounded shadow transition"
            >
              ℹ️ Info
            </button>
          </NuxtLink>

          <!-- Mobile menu toggle -->
          <button
            @click="menuOpen = !menuOpen"
            class="sm:hidden text-blue-700 focus:outline-none"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2"
                 viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Mobile dropdown menu -->
      <div
        v-if="menuOpen"
        class="sm:hidden absolute right-6 top-[90px] bg-white bg-opacity-90 rounded shadow-md p-4 flex flex-col gap-4 text-[#333]"
      >
        <NuxtLink to="/info" class="hover:underline">ℹ️ Info</NuxtLink>
      </div>

      <!-- Hero -->
      <main class="text-center py-24 px-6">
        <h2 class="text-5xl sm:text-6xl font-extrabold mb-6 leading-tight drop-shadow-lg">
          Velkommen til BodyMetrics
        </h2>
        <p class="text-xl max-w-2xl mx-auto mb-10 drop-shadow">
          Et sundhedsværktøj til vækstovervågning af børn – udviklet med fokus på sikkerhed, brugervenlighed og præcision.
        </p>
        <NuxtLink to="/login">
          <button class="bg-blue-600 text-white px-8 py-4 rounded-full shadow-lg hover:bg-blue-700 transition text-lg">
            Login
          </button>
        </NuxtLink>
      </main>
    </div>
  </div>
</template>
