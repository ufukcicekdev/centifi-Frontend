// Firebase config — replace with your keys when ready
// npm install @react-native-firebase/app @react-native-firebase/auth
// OR: npm install firebase (JS SDK)

export const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export const GOOGLE_CLIENT_ID = {
  ios: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
  android: "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
  web: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
};

// Placeholder auth functions — wire up Firebase when keys are ready
export async function signInWithGoogle(): Promise<{ uid: string; name: string; email: string; photo: string | null }> {
  // TODO: implement with firebase/auth + expo-auth-session
  throw new Error("FIREBASE_NOT_CONFIGURED");
}

export async function signInWithEmail(email: string, password: string) {
  // TODO: firebaseAuth.signInWithEmailAndPassword(email, password)
  throw new Error("FIREBASE_NOT_CONFIGURED");
}

export async function registerWithEmail(email: string, password: string, name: string) {
  // TODO: firebaseAuth.createUserWithEmailAndPassword(...)
  throw new Error("FIREBASE_NOT_CONFIGURED");
}

export async function signOut() {
  // TODO: firebaseAuth.signOut()
}
