import { connectToDatabase } from '../../utils/mongo'

export default defineEventHandler(async () => {
  const db = await connectToDatabase()

  const students = await db.collection('Students').find({
    faceDescriptor: { $exists: true, $ne: [] }
  }).toArray()

  return students.map((student) => ({
    id: student.id,
    name: `${student.first_name} ${student.last_name}`, // Vigtigt!
    faceDescriptor: student.faceDescriptor
  }))
})
