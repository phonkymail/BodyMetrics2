import { connectToDatabase } from '@/server/utils/mongo'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  const db = await connectToDatabase()
  const user = await db.collection('Parents').findOne({ email })

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Bruger ikke fundet' })
  }

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) {
    throw createError({ statusCode: 401, statusMessage: 'Forkert adgangskode' })
  }

  const token = jwt.sign(
    { id: user._id, email: user.email, role: 'parent' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  )

  return { token, role: 'parent' }
})
