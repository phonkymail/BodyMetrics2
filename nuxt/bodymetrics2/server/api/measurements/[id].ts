import { connectToDatabase } from '../../utils/mongo'
import jwt from 'jsonwebtoken'
import { ObjectId } from 'mongodb'
import { getRouterParam, getHeader, sendError, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const token = getHeader(event, 'authorization')?.split(' ')[1]
  const config = useRuntimeConfig()

  if (!token) {
    return sendError(event, createError({ statusCode: 401, statusMessage: 'Unauthorized' }))
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      role: string
      parent_id?: string
    }

    const db = await connectToDatabase()

    if (decoded.role === 'parent') {
      const student = await db.collection('Students').findOne({
        id: String(id),
        parent_ids: { $in: [new ObjectId(decoded.parent_id)] }
      })

      if (!student) {
        throw createError({ statusCode: 403, statusMessage: 'Adgang nægtet' })
      }
    }

    const measurements = await db
      .collection('Measurements')
      .find({ student_id: String(id) })
      .toArray()

    return measurements
  } catch (err) {
    console.error('⛔ Fejl i adgang til målinger:', err)
    return sendError(event, createError({ statusCode: 403, statusMessage: 'Token ugyldig' }))
  }
})
