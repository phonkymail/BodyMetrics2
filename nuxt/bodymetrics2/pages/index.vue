<template>
  <div
    class="min-h-screen w-full bg-cover bg-center bg-no-repeat font-sans relative"
    style="background-image: url('/webpage/pics/1.jpg')"
  >
    <div class="absolute inset-0 bg-black/60"></div>

    <div class="relative z-10 text-[#b8f5cc]">

      <header class="w-full flex items-center justify-between px-6 sm:px-10 py-6 bg-amber-50 bg-opacity-90 shadow-md relative">
        <h1 class="text-2xl font-extrabold text-blue-700">BodyMetrics</h1>
        <div class="flex items-center gap-4">
          <NuxtLink to="/info">
            <button
              class="hidden sm:inline bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-2 rounded shadow transition"
            >
              ℹ️ Info
            </button>
          </NuxtLink>
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

      <div
        v-if="menuOpen"
        class="sm:hidden absolute right-6 top-[90px] bg-white bg-opacity-90 rounded shadow-md p-4 flex flex-col gap-4 text-[#333]"
      >
        <NuxtLink to="/info" class="hover:underline">ℹ️ Info</NuxtLink>
      </div>

      <main class="text-center py-16 px-6">
        <h2 class="text-4xl sm:text-5xl font-extrabold mb-4 drop-shadow-lg">
          Velkommen til BodyMetrics
        </h2>
        <p class="text-lg max-w-2xl mx-auto mb-6 drop-shadow">
          Et sundhedsværktøj til vækstovervågning af børn – udviklet med fokus på sikkerhed og præcision.
        </p>

        <div class="flex justify-center flex-wrap gap-4 mb-6">
          <NuxtLink to="/login">
            <button class="bg-blue-600 text-white px-8 py-4 rounded-full shadow-lg hover:bg-blue-700 transition text-lg">
              Login
            </button>
          </NuxtLink>

          <button
            v-if="!målingAktiv"
            @click="startMåling"
            class="bg-green-600 text-white px-8 py-4 rounded-full shadow-lg hover:bg-green-700 transition text-lg"
          >
            Start måling
          </button>
        </div>

        <video
          v-if="målingAktiv"
          ref="video"
          autoplay
          muted
          width="320"
          height="240"
          class="mt-4 mx-auto rounded border"
        ></video>

        <div v-if="student" class="mt-6 text-white">
          <p class="text-lg">
            ✅ Genkendt elev: <strong>{{ student.first_name }} {{ student.last_name }}</strong>
          </p>
          <p class="text-base">Klasse: {{ student.class_id }}</p>
        </div>

        <p v-if="statusMessage" class="mt-4 text-sm text-gray-300">{{ statusMessage }}</p>
        <p v-if="målingGodkendt" class="mt-2 text-green-400 font-semibold">✅ Måling gemt</p>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import * as faceapi from 'face-api.js'
import { loadLabeledStudents, studentIdMap } from '@/composables/useFaceRecognition'

const menuOpen = ref(false)
const video = ref<HTMLVideoElement | null>(null)
const matchLabel = ref('Ingen endnu')
const student = ref<any>(null)
const målingGodkendt = ref(false)
const målingAktiv = ref(false)
const målingErIgang = ref(false)
const statusMessage = ref('')
const data = ref<{ weight: number | null; distance_cm: number | null }>({ weight: null, distance_cm: null })

let intervalId: any = null

const startMåling = async () => {
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
</script>
