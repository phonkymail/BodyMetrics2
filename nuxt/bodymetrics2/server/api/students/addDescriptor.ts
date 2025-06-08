import { readBody } from 'h3'
import { connectToDatabase } from '../../utils/mongo'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { student_id, faceDescriptor } = body

  if (!student_id || !faceDescriptor || !Array.isArray(faceDescriptor)) {
    return { statusCode: 400, body: { message: 'Ugyldige data' } }
  }

  const { db } = await connectToDatabase()

  const result = await db.collection('Students').updateOne(
    { id: student_id },
    {
      $set: {
        faceDescriptor: faceDescriptor
      }
    },
    { upsert: false }
  )

  if (result.matchedCount === 0) {
    return { statusCode: 404, body: { message: `Ingen elev med id ${student_id}` } }
  }

  return { message: `Face descriptor gemt for elev ${student_id}` }
})
