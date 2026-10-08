import { getApp, getApps, initializeApp } from 'firebase/app'
import type { FirebaseOptions } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseEnvironment = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
}

const missingVariables = Object.entries(firebaseEnvironment)
  .filter(([, value]) => !value?.trim())
  .map(([name]) => name)

if (missingVariables.length > 0) {
  throw new Error(`Configuração do Firebase incompleta: ${missingVariables.join(', ')}. Confira o .env ou os secrets do GitHub Actions.`)
}

const firebaseConfig: FirebaseOptions = {
  apiKey: firebaseEnvironment.VITE_FIREBASE_API_KEY,
  authDomain: firebaseEnvironment.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseEnvironment.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseEnvironment.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseEnvironment.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseEnvironment.VITE_FIREBASE_APP_ID,
}

export const firebaseApp = getApps().some((app) => app.name === '[DEFAULT]')
  ? getApp()
  : initializeApp(firebaseConfig)

export const firebaseAuth = getAuth(firebaseApp)
