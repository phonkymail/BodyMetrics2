import { defineEventHandler } from 'h3'
import { getLatestData } from '~/server/utils/mqttListener'

export default defineEventHandler(() => {
  const data = getLatestData()
  return data || { weight: null, distance_cm: null }
})