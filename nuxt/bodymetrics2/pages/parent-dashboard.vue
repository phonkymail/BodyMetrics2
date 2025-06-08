<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">👨‍👩‍👧‍👦 Dine Børn</h1>
      <button
        @click="logout"
        class="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded"
      >
        Log ud
      </button>
    </div>

    <div v-if="loading">
      <p>🔄 Henter data...</p>
    </div>

    <div v-else>
      <p class="mb-2 text-gray-600">Antal børn hentet: {{ children.length }}</p>

      <div v-if="children.length">
        <div
          v-for="child in children"
          :key="child._id"
          class="mb-6 p-6 bg-white shadow rounded text-black"
        >
          <p><strong>Navn:</strong> {{ child.first_name }} {{ child.last_name }}</p>
          <p><strong>Født:</strong> {{ child.brith }}</p>
          <p><strong>Klasse:</strong> {{ child.class_name }}</p>


          <!-- Billede -->
          <img
            v-if="child.photo"
            :src="child.photo"
            alt="Elevfoto"
            class="mt-3 w-32 h-32 object-cover rounded border"
          />

          <!-- Målinger -->
          <div v-if="child.measurements?.length" class="mt-4">
            <p><strong>Målinger:</strong> {{ child.measurements.length }}</p>
            <ul class="mt-2 text-sm list-disc ml-6">
              <li
                v-for="(m, index) in child.measurements"
                :key="index"
              >
                📅 {{ new Date(m.timestamp).toLocaleDateString() }}:
                ⚖️ {{ m.weight }} kg / 📏 {{ m.height }} cm
              </li>
            </ul>

            <!-- 📊 Graf -->
            <LineChart
              class="mt-4"
              :measurements="child.measurements"
              :birthDate="child.brith"
              :showReference="false"
            />
          </div>

          <div v-else class="mt-2 text-gray-600 italic">
            ❌ Ingen målinger fundet.
          </div>
        </div>
      </div>

      <div v-else>
        <p>❌ Ingen data fundet for dine børn.</p>
      </div>
    </div>
  </div>
</template>



<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import LineChart from '@/components/LineChart.vue'


const children = ref([])
const classMap = ref({})
const loading = ref(true)
const router = useRouter()

const logout = () => {
  localStorage.removeItem('parent_token')
  router.push('/')
}

const fetchMeasurements = async (studentId: string, token: string) => {
  try {
    const result = await $fetch(`/api/measurements/${studentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return result
  } catch (err) {
    console.error(`❌ Fejl ved målinger for elev ${studentId}:`, err)
    return []
  }
}

const fetchClasses = async () => {
  const allClasses = await $fetch('/api/classes')
  classMap.value = Object.fromEntries(allClasses.map(cls => [cls.id, cls.name]))
}

onMounted(async () => {
  try {
    const token = localStorage.getItem('parent_token')
    if (!token) return router.push('/parent-login')

    await fetchClasses() // ⬅️ hent klasser først

    const childrenData = await $fetch('/api/parents/children', {
      headers: { Authorization: `Bearer ${token}` }
    })

    const withMeasurements = await Promise.all(
      childrenData.map(async (child) => {
        const measurements = await $fetch(`/api/measurements/${child.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return {
          ...child,
          measurements,
          class_name: classMap.value[child.class_id] || 'Ukendt klasse'
        }
      })
    )

    children.value = withMeasurements
  } catch (err) {
    console.error('❌ Fejl ved hentning af børn og målinger:', err)
    router.push('/parent-login')
  } finally {
    loading.value = false
  }
})
</script>
