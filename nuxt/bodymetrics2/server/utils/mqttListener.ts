import mqtt from 'mqtt'

let lastData = null

const client = mqtt.connect('mqtts://<ip>:8883', {
  rejectUnauthorized: false  // Skip cert check (self-signed)
})

client.on('connect', () => {
  console.log('📡 MQTT connected (weight listener)')
  client.subscribe('scale/weight')
})

client.on('message', (topic, message) => {
  if (topic === 'scale/weight') {
    try {
      lastData = JSON.parse(message.toString())
      console.log('📥 New weight data:', lastData)
    } catch (e) {
      console.error('❌ Invalid JSON from ESP:', e)
    }
  }
})

export function getLatestData() {
  return lastData
}
