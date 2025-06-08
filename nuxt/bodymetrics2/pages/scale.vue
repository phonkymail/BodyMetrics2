<template>
  <div class="p-6">
    <h1 class="text-xl font-bold mb-4">ESP32 Scale Control</h1>
    <button
      @click="sendScan"
      class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
    >
      Start Scan
    </button>
    <p class="mt-4">{{ statusMessage }}</p>

    <div class="mt-8 border-t pt-4">
      <h2 class="text-lg font-semibold mb-2">Seneste data fra ESP:</h2>
      <p>⚖️ Vægt: <strong>{{ data?.weight ?? '–' }} kg</strong></p>
      <p>📏 Afstand: <strong>{{ data?.distance_cm ?? '–' }} cm</strong></p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const statusMessage = ref('')
const data = ref(null)

const sendScan = async () => {
  try {
    const res = await fetch('/api/scale/scan')
    const text = await res.text()
    statusMessage.value = res.ok ? `✅ ${text}` : `❌ ${text}`
  } catch {
    statusMessage.value = '❌ Fejl ved kontakt til server'
  }
}

const fetchData = async () => {
  const res = await fetch('/api/scale/data')
  data.value = await res.json()
}

// Hent data hvert 3. sekund
onMounted(() => {
  fetchData()
  setInterval(fetchData, 3000)
})
</script>
