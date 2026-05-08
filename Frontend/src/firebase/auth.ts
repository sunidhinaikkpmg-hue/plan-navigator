import { browserLocalPersistence, createUserWithEmailAndPassword, setPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";

export async function signInWithEmail(email: string, password: string) {
  await setPersistence(auth, browserLocalPersistence);
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const err = error as { code: string };
      if (err.code === "auth/user-not-found") {
        return createUserWithEmailAndPassword(auth, email, password);
      }
    }
    throw error;
  }
}

export function logout() {
  return signOut(auth);
}
