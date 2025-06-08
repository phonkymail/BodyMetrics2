import { defineEventHandler, readBody, createError } from 'h3'
import { connectToDatabase } from '../../utils/mongo'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  const db = await connectToDatabase()
  const collections = ['Parents', 'Nurse', 'Admins']
  let user = null
  let role = ''

  for (const col of collections) {
    const found = await db.collection(col).findOne({ email })
    if (found) {
      user = found
      role = col.toLowerCase() === 'parents' ? 'parent' : col.toLowerCase()
      break
    }
  }

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Bruger ikke fundet' })
  }

  const passwordMatch = await bcrypt.compare(password, user.password)
  if (!passwordMatch) {
    throw createError({ statusCode: 401, statusMessage: 'Forkert kodeord' })
  }

  const config = useRuntimeConfig()

  const payload: any = {
    id: user._id,
    email: user.email,
    username: user.username,
    role
  }

  if (role === 'parents' || role === 'parent') {
    payload.parent_id = user._id.toString()
    payload.student_id = user.student_id
  }

  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '12h' })

  return { token, role }
})
