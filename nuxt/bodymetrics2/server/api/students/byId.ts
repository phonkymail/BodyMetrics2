import { connectToDatabase } from '../../utils/mongo'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = query.id

  const db = await connectToDatabase()
  const student = await db.collection('Students').findOne({ id })

  return student
})