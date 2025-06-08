import { connectToDatabase } from '../../utils/mongo'

export default defineEventHandler(async () => {
  const db = await connectToDatabase()
  const schools = await db.collection('Schools').find().toArray()
  return schools
})
