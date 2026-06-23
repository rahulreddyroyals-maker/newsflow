// src/services/newsService.js
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, limit, onSnapshot, serverTimestamp, increment, arrayUnion, arrayRemove
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from './firebase'

// NOTE on sorting: queries below intentionally avoid combining where() with
// orderBy() on a different field. Firestore requires a manually-created
// composite index for that combination — without it, the query fails and
// (with onSnapshot) hangs silently with no error shown. Sorting client-side
// instead means everything works immediately with zero extra Firebase setup,
// which matters more than raw query efficiency at MVP scale. If your `news`
// or `drafts` collections grow past a few thousand documents, revisit this
// and create indexes via `firebase deploy --only firestore:indexes` instead.

function sortByCreatedAtDesc(docs) {
  return docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
}
function sortByCreatedAtAsc(docs) {
  return docs.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0))
}

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
// District filtering happens client-side now (see districtMatchesFilter in
// utils/districts.js) — a server-side where('district','==',x) couldn't
// express "Andhra Pradesh statewide OR any of its 28 districts" without an
// `in` query, which Firestore caps at 30 values (Telangana alone has 33
// districts, already over that cap). Category has no such case, so it's
// still filtered server-side.
export function listenToFeed({ category }, callback, onError) {
  const clauses = [where('status', '==', 'approved')]
  if (category && category !== 'All') clauses.push(where('category', '==', category))
  const q = query(collection(db, 'news'), ...clauses, limit(150))
  return onSnapshot(
    q,
    (snap) => callback(sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
    (err) => { console.error('listenToFeed failed:', err); onError?.(err); callback([]) }
  )
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
  const snap = await getDocs(query(collection(db, 'news'), where('status', '==', 'approved'), limit(200)))
  const docs = sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  const lower = keyword.trim().toLowerCase()
  return docs.filter((n) =>
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

export function listenToMyDrafts(authorId, callback, onError) {
  const q = query(collection(db, 'drafts'), where('authorId', '==', authorId))
  return onSnapshot(
    q,
    (snap) => callback(sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
    (err) => { console.error('listenToMyDrafts failed:', err); onError?.(err); callback([]) }
  )
}

export function listenToPendingDrafts(callback, onError) {
  const q = query(collection(db, 'drafts'), where('status', '==', 'pending'))
  return onSnapshot(
    q,
    (snap) => callback(sortByCreatedAtAsc(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
    (err) => { console.error('listenToPendingDrafts failed:', err); onError?.(err); callback([]) }
  )
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
    videoUrl: rest.videoUrl || null,
    audioUrl: rest.audioUrl || null,
    authorId: rest.authorId,
    authorName: rest.authorName || 'NewsFlow Reporter',
    status: 'approved',
    views: 0,
    likedBy: [],
    dislikedBy: [],
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

// Videos are capped at 90 seconds and a hard file-size ceiling (enforced
// client-side before upload, and again in storage.rules server-side) — short
// clips keep this usable on Firebase's free Storage tier (5GB total, 1GB/day
// downloads) for as long as possible before an upgrade is needed.
export async function uploadVideo(file, pathPrefix = 'news_videos') {
  const path = `${pathPrefix}/${Date.now()}_${file.name || 'video.webm'}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
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

export async function setJournalistSuspended(uid, suspended) {
  await updateDoc(doc(db, 'users', uid), { suspended })
}

// ---------- ADMIN: direct upload + manage published news ----------
export async function publishNewsDirectly(data) {
  const ref = await addDoc(collection(db, 'news'), {
    headline: data.headline,
    headlineEn: data.headlineEn || '',
    summary: data.summary,
    summaryEn: data.summaryEn || '',
    content: data.article,
    contentEn: data.articleEn || '',
    category: data.category,
    district: data.district,
    images: data.images || [],
    videoUrl: data.videoUrl || null,
    audioUrl: data.audioUrl || null,
    authorId: 'admin',
    authorName: 'NewsFlow',
    status: 'approved',
    views: 0,
    likedBy: [],
    dislikedBy: [],
    createdAt: serverTimestamp()
  })
  return ref.id
}

export async function listAllNews() {
  const snap = await getDocs(query(collection(db, 'news'), limit(200)))
  return sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
}

export async function updateNews(id, data) {
  await updateDoc(doc(db, 'news', id), data)
}

export async function deleteNews(id) {
  await deleteDoc(doc(db, 'news', id))
}

// ---------- LIKES / DISLIKES ----------
// Stored as uid arrays on the news doc itself (small scale, simple toggle
// logic) rather than a separate collection — fine at MVP volume; revisit if
// a single story ever needs thousands of reactions.
export async function setReaction(newsId, uid, type, current) {
  const { likedBy = [], dislikedBy = [] } = current
  const isLiked = likedBy.includes(uid)
  const isDisliked = dislikedBy.includes(uid)
  const update = {}

  if (type === 'like') {
    update.likedBy = isLiked ? arrayRemove(uid) : arrayUnion(uid)
    if (isDisliked) update.dislikedBy = arrayRemove(uid)
  } else {
    update.dislikedBy = isDisliked ? arrayRemove(uid) : arrayUnion(uid)
    if (isLiked) update.likedBy = arrayRemove(uid)
  }
  await updateDoc(doc(db, 'news', newsId), update)
}

// ---------- COMMENTS ----------
// Subcollection per story: news/{newsId}/comments/{commentId}
export function listenToComments(newsId, callback, onError) {
  const q = query(collection(db, 'news', newsId, 'comments'), limit(200))
  return onSnapshot(
    q,
    (snap) => callback(sortByCreatedAtAsc(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
    (err) => { console.error('listenToComments failed:', err); onError?.(err); callback([]) }
  )
}

export async function addComment(newsId, { text, authorId, authorName }) {
  await addDoc(collection(db, 'news', newsId, 'comments'), {
    text,
    authorId,
    authorName,
    createdAt: serverTimestamp()
  })
}

export async function deleteComment(newsId, commentId) {
  await deleteDoc(doc(db, 'news', newsId, 'comments', commentId))
}
