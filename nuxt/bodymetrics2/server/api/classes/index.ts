import { connectToDatabase } from '../../utils/mongo'

export default defineEventHandler(async () => {
  const db = await connectToDatabase()

  const classes = await db.collection('Classes').find().toArray()

  // Sorter klasserne numerisk efter id (selvom de er strings)
  classes.sort((a, b) => Number(a.id) - Number(b.id))

  return classes
})