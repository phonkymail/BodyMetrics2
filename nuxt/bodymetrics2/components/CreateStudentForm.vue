//create_student_vue.bak

<template>
  <div class="p-4 space-y-4">
    <h1 class="text-xl font-bold">Opret ny elev</h1>

    <!-- Start kamera -->
    <button @click="startCamera" class="bg-blue-500 text-white px-4 py-2 rounded">
      Start kamera
    </button>

    <!-- Webcam preview -->
    <video ref="video" autoplay playsinline class="w-64 h-48 bg-gray-200 rounded"></video>

    <!-- Snapshot preview -->
    <div v-if="snapshot" class="w-64 h-48 mt-2">
      <img :src="snapshot" alt="Snapshot" class="rounded border" />
    </div>

    <button @click="takeSnapshot" class="px-4 py-2 bg-blue-600 text-white rounded">
      Tag billede
    </button>

    <!-- Elevdata input -->
    <div class="space-y-2 mt-4">
      <input v-model="first_name" placeholder="Fornavn" class="w-full p-2 border rounded" />
      <input v-model="last_name" placeholder="Efternavn" class="w-full p-2 border rounded" />
      <input v-model="brith" type="date" class="w-full p-2 border rounded" />
      <input v-model="class_id" placeholder="Klasse-ID" class="w-full p-2 border rounded" />
      <input v-model="school_id" placeholder="Skole-ID" class="w-full p-2 border rounded" />
    </div>

    <button @click="saveStudent" class="px-4 py-2 bg-green-600 text-white rounded">
      Gem elev
    </button>

    <p v-if="message" class="text-green-600">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import * as faceapi from 'face-api.js'

// Refs og state
const video = ref<HTMLVideoElement | null>(null)
const snapshot = ref<string | null>(null)
const message = ref('')

const first_name = ref('')
const last_name = ref('')
const brith = ref('')
const class_id = ref('')
const school_id = ref('')
let faceDescriptor: number[] | null = null

const mediaStream = ref<MediaStream | null>(null)

// Indlæs face-api modeller
onMounted(async () => {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
  ])
})

// Stop kameraet
const stopCamera = () => {
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach(track => track.stop())
    mediaStream.value = null
  }
}

// Stop kamera ved unmount
onUnmounted(() => {
  stopCamera()
})

// Start kamera
const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    mediaStream.value = stream
    if (video.value) {
      video.value.srcObject = stream
    }
  } catch (err) {
    console.error('Kamera-fejl:', err)
    alert('Kunne ikke starte kameraet. Tjek tilladelser.')
  }
}

// Tag snapshot og find ansigt
const takeSnapshot = async () => {
  if (!video.value) return
  const canvas = document.createElement('canvas')
  canvas.width = video.value.videoWidth
  canvas.height = video.value.videoHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video.value, 0, 0)
  snapshot.value = canvas.toDataURL('image/jpeg')

  const detection = await faceapi
    .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) {
    alert('Intet ansigt fundet. Prøv igen.')
    faceDescriptor = null
    return
  }

  faceDescriptor = Array.from(detection.descriptor)
}

// Gem elev
const saveStudent = async () => {
  if (!snapshot.value || !first_name.value || !last_name.value || !brith.value || !class_id.value || !school_id.value) {
    alert('Udfyld alle felter og tag et billede')
    return
  }

  if (!faceDescriptor) {
    alert('Ansigt ikke fundet – tag billede igen')
    return
  }

  try {
    const res = await axios.post('/api/students/create', {
      first_name: first_name.value,
      last_name: last_name.value,
      brith: brith.value,
      class_id: class_id.value,
      school_id: school_id.value,
      image: snapshot.value,
      faceDescriptor: faceDescriptor
    })

    message.value = res.data.message || 'Elev oprettet!'
    first_name.value = ''
    last_name.value = ''
    brith.value = ''
    class_id.value = ''
    school_id.value = ''
    snapshot.value = null
    faceDescriptor = null

    stopCamera()
  } catch (err) {
    console.error('Fejl ved oprettelse:', err)
    message.value = 'Fejl ved oprettelse'
  }
}
</script>
