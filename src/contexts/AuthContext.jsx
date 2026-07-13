// src/contexts/AuthContext.jsx
// Saves extended journalist fields (fullName, village, mandal, constituency,
// political affiliation) alongside the base profile on registration.
import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../services/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guestMode, setGuestMode] = useState(false)

  useEffect(() => {
    let unsubProfile = null
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      unsubProfile?.()
      if (firebaseUser) {
        unsubProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
          setProfile(snap.exists() ? { uid: firebaseUser.uid, ...snap.data() } : null)
          setLoading(false)
        }, () => setLoading(false))
        setGuestMode(false)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })
    return () => { unsubAuth(); unsubProfile?.() }
  }, [])

  async function register({
    name, email, phone, password, role, language, district,
    // journalist-only extended fields:
    fullName, village, mandal, constituency, politicalAffiliation, politicalPartyName
  }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const newProfile = {
      name,
      email,
      phone,
      role,
      language,
      district,
      verified: false,
      bookmarks: [],
      walletPoints: 0,
      adCommissionEarnings: 0,
      createdAt: serverTimestamp(),
      ...(role === 'journalist' && {
        fullName: fullName || name,
        village: village || '',
        mandal: mandal || '',
        constituency: constituency || '',
        politicalAffiliation: politicalAffiliation || 'No',
        politicalPartyName: politicalAffiliation === 'Yes' ? (politicalPartyName || '') : ''
      })
    }
    await setDoc(doc(db, 'users', cred.user.uid), newProfile)
    return cred.user
  }

  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function logout() {
    await signOut(auth)
    setGuestMode(false)
  }

  function continueAsGuest() { setGuestMode(true) }
  function refreshProfile() {} // no-op — live listener keeps profile in sync

  return (
    <AuthContext.Provider value={{
      user, profile, loading, guestMode,
      isJournalist: profile?.role === 'journalist',
      isAdmin: profile?.role === 'admin',
      register, login, logout, continueAsGuest, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
