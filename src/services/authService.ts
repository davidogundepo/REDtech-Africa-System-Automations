import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User as FirebaseUser,
  linkWithPopup,
  EmailAuthProvider,
  linkWithCredential,
  unlink,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { createUserWithId, getUserById, updateUser } from './firestoreService';
import { sendWelcomeEmails } from './emailService';

export const loginWithEmail = async (email: string, password: string) => {
  console.log('🔐 Attempting email/password login:', email);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Login successful, redirecting...');
    return userCredential.user;
  } catch (error: any) {
    console.error('❌ Login failed:', error.code, error.message);
    throw error;
  }
};

export const registerWithEmail = async (email: string, password: string, displayName: string) => {
  console.log('📝 Creating new account:', email);
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user profile in Firestore using Firebase Auth UID
    await createUserWithId(user.uid, {
      email: user.email!,
      displayName: displayName,
      photoURL: user.photoURL || undefined,
      role: 'user',
      profileCompleteness: 15,
      skills: []
    });
    
    // Send welcome emails
    sendWelcomeEmails(user.email!, displayName);
    
    console.log('✅ Account created successfully, redirecting...');
    return user;
  } catch (error: any) {
    console.error('❌ Registration failed:', error.code, error.message);
    throw error;
  }
};

export const loginWithGoogle = async () => {
  console.log('🔵 Starting Google Sign-In...');
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;
    
    console.log('🔍 Checking if user exists in Firestore...');
    // Check if user exists in Firestore by UID (not email!)
    const existingUser = await getUserById(user.uid);
    
    if (!existingUser) {
      console.log('🆕 New Google user, creating profile...');
      await createUserWithId(user.uid, {
        email: user.email!,
        displayName: user.displayName || '',
      photoURL: user.photoURL || undefined,
        role: 'user',
        profileCompleteness: 15,
        skills: []
      });
      
      // Send welcome emails for new Google users
      sendWelcomeEmails(user.email!, user.displayName || 'New User');
    } else {
      console.log('✅ Existing user found:', existingUser.email);
    }
    
    console.log('✅ Login successful, redirecting...');
    return user;
  } catch (error: any) {
    console.error('❌ Google Sign-In failed:', error.code, error.message);
    throw error;
  }
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Check what sign-in methods are available for an email
export const getSignInMethodsForEmail = async (email: string) => {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return methods;
  } catch (error) {
    console.error('Error fetching sign-in methods:', error);
    return [];
  }
};

// Link Google account to existing password account
export const linkGoogleAccount = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user signed in');
  
  try {
    const provider = new GoogleAuthProvider();
    const result = await linkWithPopup(user, provider);
    
    // Update Firestore to track linked methods
    await updateUser(user.uid, {
      linkedAccounts: ['password', 'google']
    });
    
    console.log('✅ Google account linked successfully');
    return result.user;
  } catch (error: any) {
    console.error('❌ Failed to link Google account:', error);
    throw error;
  }
};

// Link password to existing Google account
export const linkPasswordAccount = async (password: string) => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('No user signed in');
  
  try {
    const credential = EmailAuthProvider.credential(user.email, password);
    const result = await linkWithCredential(user, credential);
    
    // Update Firestore to track linked methods
    await updateUser(user.uid, {
      linkedAccounts: ['password', 'google']
    });
    
    console.log('✅ Password account linked successfully');
    return result.user;
  } catch (error: any) {
    console.error('❌ Failed to link password account:', error);
    throw error;
  }
};

// Unlink a sign-in method
export const unlinkAuthMethod = async (providerId: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user signed in');
  
  try {
    await unlink(user, providerId);
    
    // Update Firestore
    const userData = await getUserById(user.uid);
    const linkedAccounts = (userData?.linkedAccounts || []).filter(
      (method: string) => method !== (providerId === 'google.com' ? 'google' : 'password')
    );
    
    await updateUser(user.uid, { linkedAccounts });
    
    console.log('✅ Auth method unlinked successfully');
  } catch (error: any) {
    console.error('❌ Failed to unlink auth method:', error);
    throw error;
  }
};

// Get linked accounts for current user
export const getLinkedAccounts = async (): Promise<string[]> => {
  const user = auth.currentUser;
  if (!user) return [];
  
  try {
    const providerData = user.providerData;
    const methods = providerData.map(provider => {
      if (provider.providerId === 'google.com') return 'google';
      if (provider.providerId === 'password') return 'password';
      return provider.providerId;
    });
    return methods;
  } catch (error) {
    console.error('Error getting linked accounts:', error);
    return [];
  }
};
