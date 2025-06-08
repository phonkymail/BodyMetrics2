import * as faceapi from 'face-api.js'

export async function loadModels() {
  const MODEL_URL = '/models'
  await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
}

export async function extractDescriptor(imageUrl: string): Promise<number[]> {
  const img = await faceapi.fetchImage(imageUrl)

  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) {
    throw new Error('No face detected')
  }

  return Array.from(detection.descriptor)
}
