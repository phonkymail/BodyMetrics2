<template>
  <div class="p-4">
    <h2 class="text-xl mb-4">Automatisk Face Recognition + ESP32 Måling</h2>

    <button
      v-if="!målingAktiv"
      @click="startMåling"
      class="bg-blue-600 text-white px-4 py-2 rounded mb-4"
    >
      Start måling
    </button>

    <div v-if="målingAktiv">
      <video ref="video" autoplay muted width="480" height="360" class="border rounded"></video>
      <p class="mt-4 text-lg">
        Genkendt: <strong>{{ matchLabel }}</strong>
      </p>
    </div>

    <div v-if="student" class="mt-4">
      <h3 class="text-lg font-semibold">Elevdata</h3>
      <img :src="student.photo" alt="Elevfoto" class="mt-2 w-48 rounded shadow" />
      <p class="mt-2">Navn: {{ student.first_name }} {{ student.last_name }}</p>
      <p>Fødselsdato: {{ student.brith }}</p>
      <p>Klasse: {{ student.class_id }}</p>
    </div>

    <div v-if="data.weight !== null" class="mt-4">
      <h3 class="text-lg font-semibold">📊 Måledata:</h3>
      <p>⚖️ Vægt: <strong>{{ data.weight }} kg</strong></p>
      <p>📏 Højde: <strong>{{ data.distance_cm }} cm</strong></p>
    </div>

    <p class="mt-4 text-sm text-gray-600">{{ statusMessage }}</p>

    <p v-if="målingGodkendt" class="mt-4 text-green-600 font-bold">
      ✅ Måling godkendt – tak for det!
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as faceapi from 'face-api.js'
import { loadLabeledStudents, studentIdMap } from '@/composables/useFaceRecognition'

const video = ref<HTMLVideoElement | null>(null)
const matchLabel = ref('Ingen endnu')
const student = ref<any>(null)
const målingGodkendt = ref(false)
const målingAktiv = ref(false)
const målingErIgang = ref(false)
const statusMessage = ref('')
const data = ref<{ weight: number | null, distance_cm: number | null }>({ weight: null, distance_cm: null })

let intervalId: any = null

const startMåling = async () => {
  console.log('▶️ startMåling() kaldt')

  if (målingAktiv.value) return

  målingAktiv.value = true
  målingGodkendt.value = false
  målingErIgang.value = false
  matchLabel.value = 'Ingen endnu'
  student.value = null
  data.value = { weight: null, distance_cm: null }

  const MODEL_URL = '/models'
  await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)

  const stream = await navigator.mediaDevices.getUserMedia({ video: true })
  if (video.value) video.value.srcObject = stream

  const labeledDescriptors = await loadLabeledStudents()
  const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6)

  intervalId = setInterval(async () => {
    if (!video.value || målingGodkendt.value || målingErIgang.value) return
    målingErIgang.value = true

    const result = await faceapi
      .detectSingleFace(video.value)
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (result) {
      const match = faceMatcher.findBestMatch(result.descriptor)
      matchLabel.value = match.toString()

      const nameOnly = match.label
      if (nameOnly !== 'unknown') {
        const id = studentIdMap.get(nameOnly)
        if (id) {
          student.value = await $fetch(`/api/students/byId?id=${id}`)
          await startEsp32Scan(id)
          stopMåling()
        }
      } else {
        målingErIgang.value = false
      }
    } else {
      matchLabel.value = 'Ingen fundet'
      målingErIgang.value = false
    }
  }, 1000)
}

const stopMåling = () => {
  clearInterval(intervalId)
  målingAktiv.value = false
  målingErIgang.value = false
  if (video.value?.srcObject) {
    const tracks = (video.value.srcObject as MediaStream).getTracks()
    tracks.forEach((track) => track.stop())
  }
}

const startEsp32Scan = async (studentId: string) => {
  try {
    const res = await fetch('/api/scale/scan')
    if (!res.ok) throw new Error('Fejl ved scan')

    statusMessage.value = '🔄 Venter på måling...'

    await new Promise((resolve) => setTimeout(resolve, 3000))

    const newData = await fetch('/api/scale/data').then(r => r.json())
    data.value = newData

    await $fetch('/api/measurements/save', {
      method: 'POST',
      body: {
        student_id: studentId,
        weight: newData.weight,
        height: newData.distance_cm
      }
    })

    målingGodkendt.value = true
    statusMessage.value = '✅ Måling gemt'
  } catch (err) {
    statusMessage.value = '❌ Fejl under måling'
    console.error(err)
  }
}

// Automatisk opdatering
onMounted(() => {
  setInterval(async () => {
    const res = await fetch('/api/scale/data')
    data.value = await res.json()
  }, 3000)
})
</script>
