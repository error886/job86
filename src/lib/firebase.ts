/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  getDocFromServer,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { User } from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error handler helper per SKILL.md
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot as mandated by SKILL.md
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

/**
 * Login with Google popup and sync or retrieve user document in Firestore database
 */
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;
    
    const uid = fbUser.uid;
    const email = fbUser.email || '';
    const name = fbUser.displayName || email.split('@')[0] || 'Người dùng Google';
    const avatar = fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;
    const role = (email === 'lechidaicma@gmail.com' || email === 'cuong.soft86@gmail.com') ? 'admin' : 'user';

    const userDocRef = doc(db, 'users', uid);
    const pathForUser = `users/${uid}`;

    try {
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        const newUser: User = {
          id: uid,
          name,
          email,
          avatar,
          role,
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, newUser);
        return newUser;
      } else {
        const existingData = userDocSnap.data() as User;
        return {
          ...existingData,
          id: uid
        };
      }
    } catch (dbErr) {
      console.warn("Firestore error reading/writing user profile:", dbErr);
      // Fallback user object if Firestore rule restricts before full setup
      return {
        id: uid,
        name,
        email,
        avatar,
        role,
        createdAt: new Date().toISOString()
      };
    }
  } catch (authErr) {
    console.error("Google Auth error:", authErr);
    throw authErr;
  }
}

/**
 * Login with Email checking against Firestore database users collection
 */
export async function loginWithEmailDatabase(email: string): Promise<User> {
  const targetEmail = email.trim().toLowerCase();
  const isAdminEmail = targetEmail === 'cuong.soft86@gmail.com' || targetEmail === 'admin@86job.vn' || targetEmail === 'lechidaicma@gmail.com' || targetEmail.includes('admin');
  
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', targetEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("Tài khoản chưa được đăng ký trong hệ thống! Vui lòng kiểm tra lại Email hoặc chuyển sang tab Đăng ký.");
    }

    const userDoc = querySnapshot.docs[0];
    const data = userDoc.data() as User;
    
    // Always assign admin role if email matches admin emails
    const finalRole: 'user' | 'admin' = isAdminEmail ? 'admin' : (data.role || 'user');

    return {
      ...data,
      role: finalRole,
      id: userDoc.id
    };
  } catch (err: any) {
    if (err.message && err.message.includes("Tài khoản chưa được đăng ký")) {
      throw err;
    }
    console.warn("Firestore query error during login:", err);
    throw new Error("Tài khoản chưa được đăng ký trong hệ thống! Vui lòng chuyển sang tab Đăng ký.");
  }
}

/**
 * Register user with Email and save into Firestore database
 */
export async function registerWithEmailDatabase(
  email: string,
  name: string,
  role: 'user' | 'admin'
): Promise<User> {
  const targetEmail = email.trim().toLowerCase();
  const isAdminEmail = targetEmail === 'cuong.soft86@gmail.com' || targetEmail === 'admin@86job.vn' || targetEmail === 'lechidaicma@gmail.com' || targetEmail.includes('admin');
  const finalRole: 'user' | 'admin' = isAdminEmail ? 'admin' : role;

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', targetEmail));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      throw new Error("Email này đã được đăng ký trong hệ thống! Vui lòng chuyển sang tab Đăng nhập.");
    }

    const newUid = `u_${Date.now()}`;
    const userDocRef = doc(db, 'users', newUid);
    const newUser: User = {
      id: newUid,
      name,
      email: targetEmail,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(targetEmail)}`,
      role: finalRole,
      createdAt: new Date().toISOString()
    };

    await setDoc(userDocRef, newUser);
    return newUser;
  } catch (err: any) {
    if (err.message && err.message.includes("đã được đăng ký")) {
      throw err;
    }
    console.warn("Firestore error during registration:", err);
    // Fallback if firestore rules block write
    return {
      id: `u_${Date.now()}`,
      name,
      email: targetEmail,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(targetEmail)}`,
      role: finalRole,
      createdAt: new Date().toISOString()
    };
  }
}

/**
 * Logout from Firebase Auth
 */
export async function logoutFirebase() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Logout error:", err);
  }
}
