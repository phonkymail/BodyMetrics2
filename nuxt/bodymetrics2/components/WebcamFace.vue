<template>
    <div class="flex flex-col items-center justify-center">
      <video ref="videoRef" autoplay muted playsinline width="720" height="560" class="rounded-lg shadow-lg" />
      <canvas ref="canvasRef" width="720" height="560" class="absolute" />
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import * as faceapi from 'face-api.js'
  
  const videoRef = ref<HTMLVideoElement | null>(null)
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  
  onMounted(async () => {
    await loadModels()
    await startVideo()
  
    videoRef.value?.addEventListener('play', () => {
      const canvas = canvasRef.value
      if (!canvas || !videoRef.value) return
  
      const displaySize = { width: videoRef.value.width, height: videoRef.value.height }
      faceapi.matchDimensions(canvas, displaySize)
  
      setInterval(async () => {
        const detections = await faceapi.detectAllFaces(videoRef.value!)
          .withFaceLandmarks()
          .withFaceDescriptors()
        const resizedDetections = faceapi.resizeResults(detections, displaySize)
  
        canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
        faceapi.draw.drawDetections(canvas, resizedDetections)
      }, 100)
    })
  })
  
  async function loadModels() {
    const MODEL_URL = '/models'
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ])
  }
  
  async function startVideo() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
    }
  }
  </script>
  