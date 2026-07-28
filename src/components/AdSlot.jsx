// src/components/AdSlot.jsx
import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

const CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID

export default function AdSlot({ slotId, format = 'auto', style }) {
  const { profile } = useAuth()
  const insRef = useRef(null)

  useEffect(() => {
    if (profile?.isPremium) return
    if (!CLIENT_ID || !slotId) return
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch { /* AdSense script not loaded yet or blocked — fail silently */ }
  }, [profile?.isPremium, slotId])

  if (profile?.isPremium) return null
  if (!CLIENT_ID || !slotId) return null

  return (
    <ins
      ref={insRef}
      className="adsbygoogle"
      style={{ display: 'block', ...style }}
      data-ad-client={CLIENT_ID}
      data-ad-slot={slotId}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  )
}
