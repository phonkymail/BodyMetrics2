import { connectToDatabase } from '../../utils/mongo'
import jwt from 'jsonwebtoken'
import { ObjectId } from 'mongodb'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.split(' ')[1]
  const config = useRuntimeConfig()

  if (!token) {
    return sendError(event, createError({ statusCode: 401, message: 'Manglende token' }))
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { parent_id: string }

    console.log('Decoded parent_id:', decoded.parent_id)

    const db = await connectToDatabase()
    const students = await db.collection('Students').find({
      parent_ids: { $in: [new ObjectId(decoded.parent_id)] }
    }).toArray()

    console.log('📚 Fundet børn:', students.map(s => s.first_name))

    return students
  } catch (err: any) {
    console.error('JWT or DB error:', err)

    if (err.name === 'TokenExpiredError') {
      return sendError(event, createError({
        statusCode: 401,
        message: 'Login er udløbet. Log venligst ind igen.'
      }))
    }

    return sendError(event, createError({
      statusCode: 403,
      message: 'Token ugyldig'
    }))
  }
})
