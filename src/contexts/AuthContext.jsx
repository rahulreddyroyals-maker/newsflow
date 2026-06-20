// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import { getUserProfile } from '../services/newsService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guestMode, setGuestMode] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const p = await getUserProfile(firebaseUser.uid)
        setProfile(p)
        setGuestMode(false)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function register({ name, email, phone, password, role, language, district }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const newProfile = {
      name,
      email,
      phone,
      role, // 'reader' | 'journalist'
      language, // 'te' | 'en'
      district,
      verified: role === 'journalist' ? false : true,
      bookmarks: [],
      createdAt: serverTimestamp()
    }
    await setDoc(doc(db, 'users', cred.user.uid), newProfile)
    setProfile({ uid: cred.user.uid, ...newProfile })
    return cred.user
  }

  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function logout() {
    await signOut(auth)
    setGuestMode(false)
  }

  function continueAsGuest() {
    setGuestMode(true)
  }

  function refreshProfile() {
    if (user) getUserProfile(user.uid).then(setProfile)
  }

  const value = {
    user,
    profile,
    loading,
    guestMode,
    isJournalist: profile?.role === 'journalist',
    isAdmin: profile?.role === 'admin',
    register,
    login,
    logout,
    continueAsGuest,
    refreshProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
