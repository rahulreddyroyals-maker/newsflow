// src/contexts/LanguageContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const { profile } = useAuth() || {}
  const [lang, setLang] = useState(() => localStorage.getItem('nf_lang') || 'te')

  useEffect(() => {
    if (profile?.language) setLang(profile.language)
  }, [profile])

  useEffect(() => {
    localStorage.setItem('nf_lang', lang)
  }, [lang])

  function toggleLang() {
    setLang((prev) => (prev === 'te' ? 'en' : 'te'))
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
