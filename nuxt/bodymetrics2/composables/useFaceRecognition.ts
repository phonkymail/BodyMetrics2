import * as faceapi from 'face-api.js'

export const studentIdMap = new Map<string, string>()

export async function loadLabeledStudents() {
  const students = await $fetch('/api/students/withDescriptors')

  studentIdMap.clear()
  students.forEach((s) => {
    const fullName = s.name // fx "Phong Le"
    studentIdMap.set(fullName, s.id)
  })

  return students.map((s) =>
    new faceapi.LabeledFaceDescriptors(
      s.name,
      [new Float32Array(s.faceDescriptor)]
    )
  )
}
