// src/services/analytics.js
import { getAnalytics, logEvent, isSupported } from 'firebase/analytics'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { app, db } from './firebase'

let analyticsInstance = null

export async function initAnalytics() {
  if (await isSupported().catch(() => false)) {
    analyticsInstance = getAnalytics(app)
  }
}

export function track(eventName, params = {}) {
  try {
    if (analyticsInstance) logEvent(analyticsInstance, eventName, params)
  } catch { /* analytics failures should never break the app */ }
}

export const Events = {
  viewArticle: (news) => track('view_article', { news_id: news.id, category: news.category, district: news.district }),
  submitReport: (district, category) => track('submit_report', { district, category }),
  approveReport: (district, category) => track('approve_report', { district, category }),
  publishAd: (district, category) => track('publish_ad', { district, category }),
  search: (query) => track('search', { search_term: query }),
  districtSelect: (district) => track('select_district', { district }),
  login: (method) => track('login', { method }),
  signUp: (role) => track('sign_up', { role }),
  bookmark: (newsId) => track('bookmark_article', { news_id: newsId }),
  share: (newsId) => track('share_article', { news_id: newsId }),
  classifiedPost: (category) => track('post_classified', { category }),
  premiumPurchase: (plan) => track('premium_purchase', { plan })
}

let errorLoggingInstalled = false

export function installErrorLogging() {
  if (errorLoggingInstalled) return
  errorLoggingInstalled = true

  window.addEventListener('error', (event) => {
    logErrorToFirestore({
      message: event.message,
      stack: event.error?.stack || '',
      source: event.filename,
      line: event.lineno,
      type: 'uncaught_error'
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    logErrorToFirestore({
      message: String(event.reason?.message || event.reason || 'Unknown rejection'),
      stack: event.reason?.stack || '',
      type: 'unhandled_rejection'
    })
  })
}

async function logErrorToFirestore(errorInfo) {
  try {
    await addDoc(collection(db, 'errorLogs'), {
      ...errorInfo,
      userAgent: navigator.userAgent,
      url: window.location.href,
      createdAt: serverTimestamp()
    })
  } catch { /* if logging itself fails, there's nothing more we can do */ }
}

export function logHandledError(context, err) {
  logErrorToFirestore({
    message: err?.message || String(err),
    stack: err?.stack || '',
    context,
    type: 'handled_error'
  })
}
