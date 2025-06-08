<template>
  <div class="p-4">
    <h2 class="text-xl mb-4">Simuleret Face Recognition + Måling</h2>

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

    <p v-if="målingGodkendt" class="mt-4 text-green-600 font-bold">
      ✅ Måling godkendt – tak for det!
    </p>

    <!-- 🧪 Test-knap til MQTT publish -->
    <button
    class="mt-6 bg-purple-600 text-white px-4 py-2 rounded"
    @click="testMQTTPublish"
    >
    🔁 Send test: scan → ESP
    </button>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import * as faceapi from 'face-api.js'
import { loadLabeledStudents, studentIdMap } from '@/composables/useFaceRecognition'

const video = ref<HTMLVideoElement | null>(null)
const matchLabel = ref('Ingen endnu')
const student = ref<any>(null)
const målingGodkendt = ref(false)
const målingAktiv = ref(false)
const målingErIgang = ref(false)

let intervalId: any = null
let mqttClient: any = null

// ✅ Start måling ved ansigtsgenkendelse
const startMåling = async () => {
  console.log('▶️ startMåling() kaldt')

  if (målingAktiv.value) {
    console.log('⛔ Måling allerede aktiv')
    return
  }

  målingAktiv.value = true
  målingGodkendt.value = false
  målingErIgang.value = false
  matchLabel.value = 'Ingen endnu'
  student.value = null

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
          await startMålingFraEsp32(id)
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

// 🛑 Stop måling
const stopMåling = async () => {
  clearInterval(intervalId)
  målingAktiv.value = false
  målingErIgang.value = false

  if (video.value?.srcObject) {
    const tracks = (video.value.srcObject as MediaStream).getTracks()
    tracks.forEach((track) => track.stop())
  }
}

// 📡 Start måling fra ESP32 via MQTT
const startMålingFraEsp32 = async (studentId: string) => {
  return new Promise<void>((resolve) => {
    const handler = async (topic: string, message: Buffer) => {
      if (topic === 'scale/weight') {
        try {
          const payload = JSON.parse(message.toString())
          const weight = payload.weight
          const height = payload.distance_cm

          await $fetch('/api/measurements/save', {
            method: 'POST',
            body: {
              student_id: studentId,
              weight,
              height
            }
          })

          målingGodkendt.value = true
          mqttClient?.removeListener('message', handler)
          resolve()
        } catch (err) {
          console.error('❌ Fejl i MQTT payload:', err)
        }
      }
    }

    mqttClient?.on('message', handler)

    // 👇 Tilføjet fejlhåndtering + logging for publish
    mqttClient?.publish('scale/control', 'scan', {}, (err: any) => {
      if (err) {
        console.error('❌ MQTT publish-fejl:', err)
      } else {
        console.log('📤 MQTT: "scan" sendt til ESP32 via scale/control')
      }
    })
  })
}

const testMQTTPublish = () => {
  if (!mqttClient || !mqttClient.connected) {
    console.error("❌ MQTT ikke forbundet.")
    return
  }
  mqttClient.publish("scale/control", "scan", {}, (err: any) => {
    if (err) {
      console.error("❌ Fejl ved publish:", err)
    } else {
      console.log("📤 MQTT: 'scan' sendt til ESP32 via scale/control")
    }
  })
}


// 🔌 MQTT setup
const connection = reactive({
  clientId: 'emqx_vue_' + Math.random().toString(16).substring(2, 8),
  username: 'emqx_test',
  password: 'emqx_test',
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 4000
})

onMounted(async () => {
  if (process.client) {
    const mqtt = await import('mqtt/dist/mqtt')
    mqttClient = mqtt.connect('wss://172.20.10.3:8084/mqtt', connection)

    mqttClient.on('connect', () => {
      console.log('✅ MQTT forbundet')
      mqttClient.subscribe('scale/weight')
    })

    mqttClient.on('message', (topic: string, message: Buffer) => {
      console.log('📩 MQTT besked modtaget:', topic, message.toString())
    })

    mqttClient.on('error', (err: any) => {
      console.error('❌ MQTT fejl:', err)
    })
  }
})

onUnmounted(() => {
  if (mqttClient) mqttClient.end()
})
</script>

