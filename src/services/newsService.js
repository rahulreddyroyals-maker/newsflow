// src/services/newsService.js
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, startAfter, limit, onSnapshot, serverTimestamp,
  increment, arrayUnion, arrayRemove
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from './firebase'

function sortByCreatedAtAsc(docs) {
  return docs.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0))
}
function sortByCreatedAtDesc(docs) {
  return docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
}

// ---------- NEWS FEED ----------
// PAGE_SIZE is how many articles the live listener keeps in real-time sync.
// This used to be a hard cap (articles beyond it simply never appeared,
// anywhere — Trending, All, everywhere) — now it's just the first page.
// loadMoreNews() below fetches older pages on demand, so given enough
// scrolling every single approved article is reachable, not just the
// most recent 200.
//
// Needs a Firestore composite index on (status, createdAt) and
// (status, category, createdAt) — see firestore.indexes.json, deployed via
// `firebase deploy --only firestore:indexes`.
export const FEED_PAGE_SIZE = 100

export function listenToFeed({ category }, callback, onError) {
  const clauses = [where('status', '==', 'approved')]
  if (category && category !== 'All') clauses.push(where('category', '==', category))
  const q = query(collection(db, 'news'), ...clauses, orderBy('createdAt', 'desc'), limit(FEED_PAGE_SIZE))
  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const lastDoc = snap.docs[snap.docs.length - 1] || null
      const hasMore = snap.docs.length === FEED_PAGE_SIZE
      callback(docs, { lastDoc, hasMore })
    },
    (err) => { console.error('listenToFeed failed:', err); onError?.(err); callback([], { lastDoc: null, hasMore: false }) }
  )
}

// Fetches the NEXT page of older articles, starting right after the last
// article already loaded. One-time fetch (not live) — appended to whatever
// the live listener already has. Call this again with the new cursor to
// keep paging back through the entire archive.
export async function loadMoreNews({ category, afterDoc }) {
  if (!afterDoc) return { docs: [], lastDoc: null, hasMore: false }
  const clauses = [where('status', '==', 'approved')]
  if (category && category !== 'All') clauses.push(where('category', '==', category))
  const q = query(
    collection(db, 'news'),
    ...clauses,
    orderBy('createdAt', 'desc'),
    startAfter(afterDoc),
    limit(FEED_PAGE_SIZE)
  )
  const snap = await getDocs(q)
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const lastDoc = snap.docs[snap.docs.length - 1] || null
  const hasMore = snap.docs.length === FEED_PAGE_SIZE
  return { docs, lastDoc, hasMore }
}

export async function getNewsById(id) {
  const snap = await getDoc(doc(db, 'news', id))
  return snap.exists() ? { id, ...snap.data() } : null
}

export async function incrementViewCount(id) {
  await updateDoc(doc(db, 'news', id), { views: increment(1) })
}

export async function searchNews(keyword) {
  // Fallback only — primary search is the searchNewsFn Cloud Function
  // (already scans the full corpus server-side, no cap).
  const snap = await getDocs(query(collection(db, 'news'), where('status', '==', 'approved'), limit(200)))
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const lower = keyword.trim().toLowerCase()
  return docs.filter((n) =>
    n.headline?.toLowerCase().includes(lower) ||
    n.summary?.toLowerCase().includes(lower) ||
    n.headlineEn?.toLowerCase().includes(lower)
  )
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

export const POINTS_PER_APPROVED_REPORT = 10

// Approve: copies the draft into the public `news` collection, marks the
// draft approved, and credits wallet points for own-district journalist
// reports. Published doc's createdAt uses the ORIGINAL draft submission
// timestamp (not approval time) so recency ranking reflects when a report
// was actually filed, not how quickly it got reviewed.
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
    createdAt: rest.createdAt || serverTimestamp()
  })
  await updateDoc(doc(db, 'drafts', id), { status: 'approved' })

  if (rest.authorId && rest.authorId !== 'system-rss' && rest.authorId !== 'admin') {
    const authorSnap = await getDoc(doc(db, 'users', rest.authorId))
    if (authorSnap.exists() && authorSnap.data().district === rest.district) {
      await updateDoc(doc(db, 'users', rest.authorId), {
        walletPoints: increment(POINTS_PER_APPROVED_REPORT)
      })
    }
  }
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

export async function uploadVideo(file, pathPrefix = 'news_videos') {
  const path = `${pathPrefix}/${Date.now()}_${file.name || 'video.webm'}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export async function uploadProfilePhoto(file, uid) {
  const path = `profile_photos/${uid}_${Date.now()}_${file.name}`
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
  const snap = await getDocs(query(collection(db, 'news'), orderBy('createdAt', 'desc'), limit(500)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function updateNews(id, data) {
  await updateDoc(doc(db, 'news', id), data)
}

export async function deleteNews(id) {
  await deleteDoc(doc(db, 'news', id))
}

// ---------- LIKES / DISLIKES ----------
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
export function listenToComments(newsId, callback, onError) {
  const q = query(collection(db, 'news', newsId, 'comments'), limit(300))
  return onSnapshot(
    q,
    (snap) => callback(sortByCreatedAtAsc(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
    (err) => { console.error('listenToComments failed:', err); onError?.(err); callback([]) }
  )
}

export async function addComment(newsId, { text, authorId, authorName, replyTo = null }) {
  await addDoc(collection(db, 'news', newsId, 'comments'), {
    text, authorId, authorName, replyTo, likedBy: [], createdAt: serverTimestamp()
  })
}

export async function deleteComment(newsId, commentId) {
  await deleteDoc(doc(db, 'news', newsId, 'comments', commentId))
}

export async function toggleCommentLike(newsId, commentId, uid, currentLikedBy = []) {
  const liked = currentLikedBy.includes(uid)
  await updateDoc(doc(db, 'news', newsId, 'comments', commentId), {
    likedBy: liked ? arrayRemove(uid) : arrayUnion(uid)
  })
}

// ---------- WALLET / WITHDRAWALS ----------
export async function createWithdrawalRequest({ journalistId, journalistName, pointsRequested, rupeeAmount }) {
  await addDoc(collection(db, 'withdrawalRequests'), {
    journalistId, journalistName, pointsRequested, rupeeAmount,
    status: 'pending', createdAt: serverTimestamp()
  })
}

export function listenToMyWithdrawals(uid, callback) {
  const q = query(collection(db, 'withdrawalRequests'), where('journalistId', '==', uid))
  return onSnapshot(q, (snap) => callback(sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })))))
}

export async function listAllWithdrawals() {
  const snap = await getDocs(query(collection(db, 'withdrawalRequests'), limit(200)))
  return sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
}

export async function markWithdrawalPaid(requestId, journalistId, pointsRequested) {
  await updateDoc(doc(db, 'withdrawalRequests', requestId), { status: 'paid', paidAt: serverTimestamp() })
  await updateDoc(doc(db, 'users', journalistId), { walletPoints: increment(-pointsRequested) })
}

export async function rejectWithdrawal(requestId, reason) {
  await updateDoc(doc(db, 'withdrawalRequests', requestId), { status: 'rejected', rejectionReason: reason || '' })
}

// ---------- AD LEADS ----------
export async function createAdLead(data) {
  await addDoc(collection(db, 'adLeads'), {
    ...data, status: 'new', dealAmount: null, commissionAmount: null, commissionPaid: false,
    createdAt: serverTimestamp()
  })
}

export function listenToMyAdLeads(uid, callback) {
  const q = query(collection(db, 'adLeads'), where('submittedBy', '==', uid))
  return onSnapshot(q, (snap) => callback(sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })))))
}

export async function listAllAdLeads() {
  const snap = await getDocs(query(collection(db, 'adLeads'), limit(200)))
  return sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
}

export async function updateAdLeadStatus(id, data) {
  await updateDoc(doc(db, 'adLeads', id), data)
}

export async function closeAdLeadWon(lead, dealAmount) {
  const commission = Math.round(dealAmount * 0.1)
  await updateDoc(doc(db, 'adLeads', lead.id), {
    status: 'closed_won', dealAmount, commissionAmount: commission
  })
  await updateDoc(doc(db, 'users', lead.submittedBy), {
    adCommissionEarnings: increment(commission)
  })
}

export async function markAdCommissionPaid(leadId) {
  await updateDoc(doc(db, 'adLeads', leadId), { commissionPaid: true })
}

// ---------- PUBLIC JOURNALIST PROFILE ----------
export async function getJournalistPublicProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return { uid, name: data.name, photoUrl: data.photoUrl || null, district: data.district, verified: data.verified }
}

export async function getJournalistPublicNews(authorId, authorName) {
  const snap = await getDocs(
    query(collection(db, 'news'), where('status', '==', 'approved'), where('authorId', '==', authorId), limit(200))
  )
  return sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    .filter((n) => n.authorName === authorName)
}
