// src/services/newsService.js
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, increment, arrayUnion, arrayRemove
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from './firebase'

// ---------- USERS ----------
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { uid, ...snap.data() } : null
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, 'users', uid), data)
}

export async function toggleBookmark(uid, newsId, isBookmarked) {
  await updateDoc(doc(db, 'users', uid), {
    bookmarks: isBookmarked ? arrayRemove(newsId) : arrayUnion(newsId)
  })
}

// ---------- NEWS (published, reader-facing) ----------
export function listenToFeed({ district, category }, callback) {
  const clauses = [where('status', '==', 'approved')]
  if (district && district !== 'All') clauses.push(where('district', '==', district))
  if (category && category !== 'All') clauses.push(where('category', '==', category))
  const q = query(collection(db, 'news'), ...clauses, orderBy('createdAt', 'desc'), limit(40))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function getNewsById(id) {
  const snap = await getDoc(doc(db, 'news', id))
  return snap.exists() ? { id, ...snap.data() } : null
}

export async function incrementViewCount(id) {
  await updateDoc(doc(db, 'news', id), { views: increment(1) })
}

export async function searchNews(keyword) {
  // Simple client-side filter MVP. For production, swap in Algolia/Typesense
  // since Firestore doesn't do full-text search natively.
  const snap = await getDocs(
    query(collection(db, 'news'), where('status', '==', 'approved'), orderBy('createdAt', 'desc'), limit(200))
  )
  const lower = keyword.trim().toLowerCase()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((n) =>
      n.headline?.toLowerCase().includes(lower) ||
      n.summary?.toLowerCase().includes(lower) ||
      n.headlineEn?.toLowerCase().includes(lower)
    )
}

// ---------- DRAFTS (journalist submissions, pre-approval) ----------
export async function createDraft(draft) {
  const ref = await addDoc(collection(db, 'drafts'), {
    ...draft,
    status: 'pending',
    createdAt: serverTimestamp()
  })
  return ref.id
}

export function listenToMyDrafts(authorId, callback) {
  const q = query(collection(db, 'drafts'), where('authorId', '==', authorId), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export function listenToPendingDrafts(callback) {
  const q = query(collection(db, 'drafts'), where('status', '==', 'pending'), orderBy('createdAt', 'asc'))
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function updateDraft(id, data) {
  await updateDoc(doc(db, 'drafts', id), data)
}

// Approve: copies the draft into the public `news` collection and marks the draft approved.
export async function approveDraft(draftEntry) {
  const { id, ...rest } = draftEntry
  await addDoc(collection(db, 'news'), {
    headline: rest.headline,
    headlineEn: rest.headlineEn || '',
    summary: rest.summary,
    summaryEn: rest.summaryEn || '',
    content: rest.article,
    contentEn: rest.articleEn || '',
    category: rest.category,
    district: rest.district,
    images: rest.images || [],
    audioUrl: rest.audioUrl || null,
    authorId: rest.authorId,
    authorName: rest.authorName || 'NewsFlow Reporter',
    status: 'approved',
    views: 0,
    createdAt: serverTimestamp()
  })
  await updateDoc(doc(db, 'drafts', id), { status: 'approved' })
}

export async function rejectDraft(id, reason) {
  await updateDoc(doc(db, 'drafts', id), { status: 'rejected', rejectionReason: reason || '' })
}

// ---------- STORAGE ----------
export async function uploadImage(file, pathPrefix = 'news_images') {
  const path = `${pathPrefix}/${Date.now()}_${file.name}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export async function uploadAudio(blob, pathPrefix = 'news_audio') {
  const path = `${pathPrefix}/${Date.now()}_voice.webm`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, blob)
  return getDownloadURL(storageRef)
}

// ---------- ADMIN ANALYTICS ----------
export async function getDashboardCounts() {
  const [newsSnap, pendingSnap, journalistsSnap, readersSnap] = await Promise.all([
    getDocs(query(collection(db, 'news'))),
    getDocs(query(collection(db, 'drafts'), where('status', '==', 'pending'))),
    getDocs(query(collection(db, 'users'), where('role', '==', 'journalist'))),
    getDocs(query(collection(db, 'users'), where('role', '==', 'reader')))
  ])
  return {
    totalNews: newsSnap.size,
    pendingNews: pendingSnap.size,
    journalists: journalistsSnap.size,
    readers: readersSnap.size
  }
}

export async function listJournalists() {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'journalist')))
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
}

export async function setJournalistVerified(uid, verified) {
  await updateDoc(doc(db, 'users', uid), { verified })
}
