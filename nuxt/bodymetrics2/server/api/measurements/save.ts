import { connectToDatabase } from '../../utils/mongo'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = await connectToDatabase()

  const measurement = {
    student_id: body.student_id,
    weight: body.weight,
    height: body.height,
    timestamp: new Date()
  }

  await db.collection('Measurements').insertOne(measurement)

  return { success: true }
})
