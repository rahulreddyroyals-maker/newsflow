// src/utils/categories.js
export const CATEGORIES = [
  { id: 'general', te: 'జనరల్', en: 'General' },
  { id: 'state-politics', te: 'రాజకీయాలు', en: 'State Politics' },
  { id: 'district-news', te: 'జిల్లా వార్తలు', en: 'District News' },
  { id: 'education', te: 'విద్య', en: 'Education' },
  { id: 'govt-jobs', te: 'ఉద్యోగాలు', en: 'Government Jobs' },
  { id: 'agriculture', te: 'వ్యవసాయం', en: 'Agriculture' },
  { id: 'business', te: 'వ్యాపారం', en: 'Business' },
  { id: 'technology', te: 'టెక్నాలజీ', en: 'Technology' },
  { id: 'health', te: 'ఆరోగ్యం', en: 'Health' },
  { id: 'sports', te: 'క్రీడలు', en: 'Sports' },
  { id: 'cinema', te: 'సినిమా', en: 'Cinema' },
  { id: 'transport', te: 'రవాణా', en: 'Transport' },
  { id: 'crime', te: 'నేరాలు', en: 'Crime' },
  { id: 'weather', te: 'వాతావరణం', en: 'Weather' }
]

export const categoryLabel = (id, lang = 'en') => {
  const c = CATEGORIES.find((c) => c.id === id)
  if (!c) return id
  return lang === 'te' ? c.te : c.en
}
