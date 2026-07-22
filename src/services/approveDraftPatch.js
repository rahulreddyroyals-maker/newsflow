// PATCH for src/services/newsService.js
// Find your existing approveDraft function and make ONE change:
// use the draft's original createdAt timestamp on the published news doc,
// instead of generating a brand new serverTimestamp() at approval time.
//
// WHY: previously, a report's recency ranking was based on WHEN AN ADMIN
// APPROVED IT, not when the journalist actually submitted it. If reports
// sit in the pending queue for hours before review, a genuinely recent
// citizen report could rank behind something approved earlier that day —
// this fixes that so ranking reflects true recency everywhere (Trending,
// All, and the headline banner all read from this same field).

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
    // ↓ THIS IS THE CHANGED LINE — was: createdAt: serverTimestamp()
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
