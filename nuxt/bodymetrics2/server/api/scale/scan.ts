import mqtt from 'mqtt'

export default defineEventHandler(async () => {
  const client = mqtt.connect('mqtts://172.20.10.3:8883', {
    rejectUnauthorized: false
  })

  return new Promise((resolve, reject) => {
    client.on('connect', () => {
      client.publish('scale/control', 'scan', {}, (err) => {
        client.end()
        if (err) return reject({ status: 500, body: 'MQTT publish failed' })
        resolve({ status: 200, body: 'Scan message sent to ESP32' })
      })
    })

    client.on('error', (err) => {
      client.end()
      reject({ status: 500, body: 'MQTT connection failed' })
    })
  })
})
