// src/services/duplicateCheck.js
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from './firebase'
import { checkDuplicate } from './groq'

// apiKeyOverride: pass the journalist's personal Groq key (profile.groqApiKey)
// if they have one assigned; omit to use the shared key.
export async function findPossibleDuplicate({ headline, summary, district, category }, apiKeyOverride) {
  const candidateText = `${headline}\n${summary}`

  const [newsSnap, draftsSnap] = await Promise.all([
    getDocs(query(
      collection(db, 'news'),
      where('district', '==', district),
      where('category', '==', category),
      orderBy('createdAt', 'desc'),
      limit(10)
    )).catch(() => ({ docs: [] })),
    getDocs(query(
      collection(db, 'drafts'),
      where('district', '==', district),
      where('category', '==', category),
      where('status', '==', 'pending'),
      limit(10)
    )).catch(() => ({ docs: [] }))
  ])

  const recentItems = [
    ...newsSnap.docs.map((d) => ({ id: d.id, ...d.data(), _source: 'news' })),
    ...draftsSnap.docs.map((d) => ({ id: d.id, ...d.data(), _source: 'drafts' }))
  ]

  if (recentItems.length === 0) return { isDuplicate: false }

  const recentTexts = recentItems.map((n) => `${n.headline}\n${n.summary}`)
  const result = await checkDuplicate(candidateText, recentTexts, apiKeyOverride)

  if (result.isDuplicate && result.matchIndex >= 0 && result.matchIndex < recentItems.length) {
    return {
      isDuplicate: true,
      similarity: result.similarity,
      matchedItem: recentItems[result.matchIndex]
    }
  }
  return { isDuplicate: false, similarity: result.similarity || 0 }
}
