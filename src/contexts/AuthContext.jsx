// src/contexts/AuthContext.jsx
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
        // Live listener instead of a one-time fetch — anything an admin
        // changes server-side while this session is open (wallet points
        // credited on approval, verified/suspended status, district
        // corrections, etc.) now reflects immediately instead of requiring
        // the user to manually refresh or log out and back in.
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

    return () => {
      unsubAuth()
      unsubProfile?.()
    }
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

  // Kept for compatibility with existing call sites — now a no-op in
  // practice since the live onSnapshot listener above already keeps
  // `profile` in sync automatically. Safe to leave both in place.
  function refreshProfile() {}

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
