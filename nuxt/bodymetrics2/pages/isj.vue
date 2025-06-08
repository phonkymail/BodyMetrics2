<template>
  <div class="p-6 min-h-screen bg-gray-50">
    <!-- Topbar -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">
        Institut Sankt Joseph - Målinger 📊
      </h1>
      <button
        @click="router.push('/')"
        class="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded"
      >
        ⬅️ Log ud
      </button>
    </div>

    <!-- Start måling -->
    <div class="mb-6">
      <button
        @click="showMeasurement = !showMeasurement"
        class="bg-purple-500 hover:bg-purple-600 text-white font-semibold px-4 py-2 rounded"
      >
        {{ showMeasurement ? '❌ Luk måling' : '📸 Start måling' }}
      </button>
      <div v-if="showMeasurement" class="mt-4 bg-white rounded shadow p-4">
        <FaceMeasurement />
      </div>
    </div>

    <!-- Opret ny elev -->
    <div class="mb-6">
      <button
        @click="showCreateForm = !showCreateForm"
        class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded"
      >
        {{ showCreateForm ? '❌ Luk elevformular' : '➕ Opret ny elev' }}
      </button>
      <div v-if="showCreateForm" class="mt-4 bg-white rounded shadow p-4">
        <CreateStudentForm @created="onStudentCreated" />
      </div>
    </div>

    <!-- Klasse Dropdown -->
    <div v-if="classOptions.length" class="mb-4">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline">
            🏷️ {{
              classOptions.find(c => c.id === selectedClassId)?.name || 'Vælg klasse'
            }}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="bg-white text-black shadow rounded border p-2">
          <DropdownMenuLabel>Klasser</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              v-for="cls in classOptions"
              :key="cls.id"
              @click="selectClass(cls)"
            >
              {{ cls.name }}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- Elev Dropdown -->
    <div v-if="selectedClassId && filteredStudents.length" class="mb-6">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline">👦 Vælg elev</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-[250px] max-h-[300px] overflow-y-auto bg-white text-black shadow rounded border"
        >
          <DropdownMenuLabel>Elever</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              v-for="student in filteredStudents"
              :key="student.id"
              @click="selectStudent(student)"
            >
              {{ student.first_name }} {{ student.last_name }}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- Elev visning -->
    <div v-if="selectedStudent" class="bg-white p-6 rounded shadow text-black">
      <p class="text-xl font-semibold mb-1">
        {{ selectedStudent.first_name }} {{ selectedStudent.last_name }}
      </p>
      <p class="text-gray-600 mb-2">Født: {{ selectedStudent.brith }}</p>

      <img
        :src="selectedStudent.photo"
        alt="Elevfoto"
        class="w-32 h-32 object-cover rounded border mb-4"
      />

      <!-- Målinger -->
      <div v-if="measurements.length">
        <p class="font-medium mb-2">📏 {{ measurements.length }} målinger:</p>
        <ul class="text-sm list-disc ml-6 mb-4">
          <li v-for="(m, index) in measurements" :key="index">
            📅 {{ new Date(m.timestamp).toLocaleDateString() }}:
            ⚖️ {{ m.weight }} kg / 📏 {{ m.height }} cm
          </li>
        </ul>

        <!-- Graf -->
        <LineChart
          :measurements="measurements"
          :birthDate="selectedStudent.brith"
          :style="{ width: '100%', maxWidth: '800px', height: '400px', margin: '0 auto' }"
        />
      </div>
      <div v-else class="text-gray-500 italic mt-2">
        ❌ Ingen målinger fundet.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import LineChart from '@/components/LineChart.vue'
import CreateStudentForm from '@/components/CreateStudentForm.vue'
import FaceMeasurement from '@/components/FaceMeasurement.vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

const router = useRouter()
const students = ref([])
const classes = ref([])
const measurements = ref([])

const selectedClassId = ref('')
const selectedStudent = ref(null)
const showCreateForm = ref(false)
const showMeasurement = ref(false)

const fetchStudents = async () => {
  const token =
    localStorage.getItem('admin_token') || localStorage.getItem('nurse_token')
  if (!token) {
    console.error('❌ Ingen token fundet')
    return
  }
  students.value = await $fetch('/api/students', {
    headers: { Authorization: `Bearer ${token}` }
  })
}

const fetchClasses = async () => {
  classes.value = await $fetch('/api/classes')
}

const fetchMeasurements = async (studentId: string) => {
  const token =
    localStorage.getItem('admin_token') ||
    localStorage.getItem('nurse_token') ||
    localStorage.getItem('parent_token')
  const result = await $fetch(`/api/measurements/${studentId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  measurements.value = result
}

const onStudentCreated = () => {
  showCreateForm.value = false
  fetchStudents()
}

const classOptions = computed(() => classes.value)

const filteredStudents = computed(() =>
  students.value.filter(s => s.class_id === selectedClassId.value)
)

const selectClass = (cls) => {
  selectedClassId.value = cls.id
  selectedStudent.value = null
  measurements.value = []
}

const selectStudent = (student) => {
  selectedStudent.value = student
  fetchMeasurements(String(student.id))
}

onMounted(() => {
  const adminToken = localStorage.getItem('admin_token')
  const nurseToken = localStorage.getItem('nurse_token')
  if (!adminToken && !nurseToken) {
    router.push('/login')
    return
  }
  fetchStudents()
  fetchClasses()
})
</script>
