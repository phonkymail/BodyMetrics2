import { connectToDatabase } from '../../utils/mongo'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
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

    let students = []

    if (decoded.role === 'parent' && decoded.parent_id) {
      // Only return students linked to this parent
      students = await db.collection('Students').find({
        parent_ids: decoded.parent_id
      }).toArray()
    } else {
      // Nurse or admin: return all students
      students = await db.collection('Students').find().toArray()
    }

    return students
  } catch (err) {
    console.error(err)
    return sendError(event, createError({ statusCode: 403, statusMessage: 'Invalid token' }))
  }
})

const fetchStudents = async () => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('nurse_token')
  try {
    students.value = await $fetch('/api/students', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  } catch (err) {
    console.error('❌ Kunne ikke hente elever:', err)
  }
}

const fetchClasses = async () => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('nurse_token')
  try {
    classes.value = await $fetch('/api/classes', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  } catch (err) {
    console.error('❌ Kunne ikke hente klasser:', err)
  }
}
