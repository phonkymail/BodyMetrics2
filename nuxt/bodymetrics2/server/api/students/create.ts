import { defineEventHandler, readBody } from 'h3'
import { connectToDatabase } from '../../utils/mongo'
import fs from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const {
    first_name,
    last_name,
    brith,
    class_id,
    school_id,
    image,
    faceDescriptor
  } = body

  if (!first_name || !last_name || !brith || !class_id || !school_id || !image) {
    return { success: false, message: 'Manglende data' }
  }

  const db = await connectToDatabase()

  // Hent alle eksisterende id'er og find højeste som tal
  const allStudents = await db.collection('Students').find({}, { projection: { id: 1 } }).toArray()
  const numericIds = allStudents
    .map(s => parseInt(s.id))
    .filter(id => !isNaN(id))

  const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1
  const newId = nextId.toString() // 👈 Gemmes som string

  // Generér filnavn
  const filename = `${first_name.toLowerCase()}_${newId}.jpg`
  const filepath = path.resolve('./public/faces', filename)

  // Gem billede fra base64
  const base64Data = image.replace(/^data:image\/jpeg;base64,/, '')
  fs.writeFileSync(filepath, base64Data, 'base64')

  // Opret elev i databasen
  const student = {
    id: newId, // 👈 string, men unikt og numerisk korrekt
    first_name,
    last_name,
    brith,
    class_id,
    school_id,
    photo: `/faces/${filename}`,
    parent_ids: [],
    faceDescriptor: faceDescriptor || []
  }

  await db.collection('Students').insertOne(student)

  return {
    success: true,
    message: `Elev oprettet (ID ${newId})`,
    photo: student.photo
  }
})
