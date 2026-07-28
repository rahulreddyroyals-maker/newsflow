// src/services/classifieds.js
import {
  collection, addDoc, getDocs, query, where, limit,
  doc, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase'

export const CLASSIFIED_CATEGORIES = [
  { id: 'jobs', te: 'ఉద్యోగాలు', en: 'Jobs' },
  { id: 'matrimony', te: 'వివాహ ప్రకటనలు', en: 'Matrimony' },
  { id: 'real-estate', te: 'రియల్ ఎస్టేట్', en: 'Real Estate' },
  { id: 'vehicles', te: 'వాహనాలు', en: 'Vehicles' },
  { id: 'services', te: 'సేవలు', en: 'Services' },
  { id: 'other', te: 'ఇతరాలు', en: 'Other' }
]

export async function createClassified(data) {
  await addDoc(collection(db, 'classifieds'), {
    ...data,
    status: 'pending',
    views: 0,
    createdAt: serverTimestamp()
  })
}

export async function listActiveClassifieds({ category, district } = {}) {
  const clauses = [where('status', '==', 'approved')]
  if (category && category !== 'All') clauses.push(where('category', '==', category))
  const snap = await getDocs(query(collection(db, 'classifieds'), ...clauses, limit(200)))
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  if (district && district !== 'All') {
    results = results.filter((c) => c.district === district || !c.district)
  }
  return results.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
}

export async function listMyClassifieds(uid) {
  const snap = await getDocs(query(collection(db, 'classifieds'), where('postedBy', '==', uid), limit(100)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
}

export async function listPendingClassifieds() {
  const snap = await getDocs(query(collection(db, 'classifieds'), where('status', '==', 'pending'), limit(200)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function setClassifiedStatus(id, status, reason) {
  const update = { status }
  if (reason) update.rejectionReason = reason
  await updateDoc(doc(db, 'classifieds', id), update)
}

export async function deleteClassified(id) {
  await deleteDoc(doc(db, 'classifieds', id))
}
