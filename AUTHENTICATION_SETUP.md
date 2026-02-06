# Authentication Setup Guide - Pulsar Songbook

## ✅ Implementation Complete!

All code changes have been implemented. Now you need to:

1. **Create Firebase project**
2. **Configure environment variables**
3. **Set up Firestore security rules**
4. **Add yourself to approved users list**

---

## Step 1: Create Firebase Project (10 minutes)

### 1.1 Create Project
1. Go to https://console.firebase.google.com/
2. Click **"Create Project"**
3. Name: `Pulsar Songbook`
4. Disable Google Analytics (optional)
5. Click **"Create Project"**

### 1.2 Enable Google Authentication
1. In Firebase Console → **Authentication** → **Get Started**
2. Click **Sign-in method** tab
3. Click **Google** → **Enable**
4. Set project public-facing name: `Pulsar Songbook`
5. Add your email as support email
6. Click **Save**

### 1.3 Create Firestore Database
1. Firebase Console → **Firestore Database** → **Create Database**
2. Choose **"Start in production mode"**
3. Select region: `us-central1` (or closest to your location)
4. Click **"Enable"**

### 1.4 Set Firestore Security Rules

In Firebase Console → **Firestore Database** → **Rules** tab, paste this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is approved
    function isApprovedUser() {
      return exists(/databases/$(database)/documents/approvedUsers/$(request.auth.token.email));
    }

    // Songs collection - authenticated users can read, approved users can write
    match /songs/{songId} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null && isApprovedUser();
    }

    // Approved users list - read-only for authenticated users
    match /approvedUsers/{email} {
      allow read: if request.auth != null;
      allow write: if false; // Only managed via Firebase console
    }
  }
}
```

Click **"Publish"**

### 1.5 Add Your Email to Approved Users

1. Firebase Console → **Firestore Database** → **Start collection**
2. Collection ID: `approvedUsers`
3. First document:
   - Document ID: `your-email@gmail.com` (use your actual email)
   - Add field:
     - Field: `approved`
     - Type: `boolean`
     - Value: `true`
   - Add field:
     - Field: `addedAt`
     - Type: `timestamp`
     - Click "Set to current time"
4. Click **"Save"**

### 1.6 Get Firebase Configuration

1. Firebase Console → **Project Settings** (gear icon)
2. Scroll to **"Your apps"** section
3. Click **"</>** (Web)" icon
4. App nickname: `Pulsar Songbook Web`
5. **DO NOT** check "Also set up Firebase Hosting"
6. Click **"Register app"**
7. Copy the `firebaseConfig` object values

---

## Step 2: Configure Environment Variables (5 minutes)

Open `.env.local` and replace with your actual Firebase credentials:

```env
VITE_FIREBASE_API_KEY=AIza...your-actual-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc123
```

**Important:** Never commit this file to git (already in `.gitignore`)

---

## Step 3: Test Locally (10 minutes)

```bash
# Start development server
npm run dev
```

### Testing Checklist

- [ ] Visit http://localhost:5173
- [ ] Songs should load (empty list initially)
- [ ] Click **"Sign In"** in header
- [ ] Click **"Sign in with Google"**
- [ ] Google OAuth popup appears
- [ ] Sign in with your approved email
- [ ] After sign-in:
  - [ ] Header shows your email
  - [ ] **"Sign Out"** button visible
  - [ ] Edit buttons (✏️) visible on songs (if any exist)
- [ ] Try signing in with non-approved email:
  - [ ] Should show error message
  - [ ] No edit buttons appear
- [ ] Sign out works correctly

---

## Step 4: Migrate Existing Data (Optional)

If you have songs in local IndexedDB that you want to move to cloud:

1. Sign in as approved user
2. Go to **Settings** page
3. Scroll to **"Migration"** section
4. Click **"Migrate to Cloud"**
5. Confirm the migration
6. Wait for completion message

**Note:** This copies songs from IndexedDB to Firestore. It doesn't delete local data.

---

## Step 5: Deploy to Production

### Build for Production

```bash
npm run build
```

### Deploy to Bluehost

Same process as before:

1. Upload `dist/` folder contents to `public_html/`
2. Keep existing `.htaccess` file
3. Environment variables are embedded in build

### Post-Deployment Testing

- [ ] Visit your production URL
- [ ] Google Sign-In works
- [ ] Songs load correctly
- [ ] Editing works for approved users
- [ ] Non-approved users see appropriate message
- [ ] Offline viewing works (after initial load)
- [ ] Legacy version `/legacy/` still works

---

## Adding New Approved Users

To authorize a new editor:

1. Firebase Console → **Firestore Database**
2. Click **`approvedUsers`** collection
3. Click **"Add Document"**
4. Document ID: `new-user@gmail.com`
5. Add fields:
   - `approved` (boolean) = `true`
   - `addedAt` (timestamp) = current time
6. Click **"Save"**

The user can now:
- Sign in with Google
- Edit songs
- See edit buttons

To remove access:
- Delete their document from `approvedUsers` collection
- They can still view but not edit

---

## Troubleshooting

### "Failed to initialize Firebase"
- Check `.env.local` has correct credentials
- Restart dev server after changing `.env.local`

### "Permission denied" when loading songs
- Check Firestore security rules are published
- Make sure user is signed in
- Check user's email exists in `approvedUsers` collection

### Google Sign-In popup blocked
- Allow popups in browser settings
- Try different browser

### "Your email is not authorized"
- Add your email to `approvedUsers` collection in Firestore
- Document ID must exactly match your Google account email
- Check `approved` field is set to `true`

### Songs not loading
- Check browser console for errors
- Verify Firestore database is created and not empty
- Check security rules allow read access for authenticated users

### Migration not visible
- Only appears for approved users
- Sign in with approved email
- Check `isApproved` is true in console

---

## Security Notes

**Protected:**
✅ Edit routes require authentication
✅ Edit buttons hidden from non-approved users
✅ Firestore rules enforce server-side authorization
✅ Only approved emails can write to database
✅ Google OAuth handles authentication securely

**Public:**
✅ Viewing songs (anyone can browse)
✅ Legacy version (read-only, no auth required)

---

## Files Modified Summary

### New Files (11 files)
- `.env.local` - Firebase credentials (DO NOT COMMIT)
- `src/lib/firebase/config.ts` - Firebase initialization
- `src/contexts/AuthContext.tsx` - Authentication state
- `src/components/ProtectedRoute.tsx` - Route protection
- `src/components/Login.tsx` - Sign-in page
- `src/services/firestore.ts` - Database operations
- `src/services/migration.ts` - Data migration utility
- `AUTHENTICATION_SETUP.md` - This guide

### Modified Files (8 files)
- `src/main.tsx` - Added AuthProvider
- `src/App.tsx` - Protected routes + auth UI
- `src/types/song.ts` - Added `createdBy` field
- `src/components/SongList.tsx` - Firestore + conditional edit buttons
- `src/components/SongDisplay.tsx` - Firestore + conditional edit button
- `src/components/SongEdit.tsx` - Firestore save operations
- `src/components/DataExport.tsx` - Added migration UI
- `.gitignore` - Added `.env.local`
- `package.json` - Added `firebase` dependency

### Unchanged (Everything Else)
- `public/legacy/` - No changes
- All ChordPro rendering logic
- All UI components
- All hooks
- PWA configuration

---

## Cost Analysis

**Firebase Free Tier:**
- Firestore: 50,000 reads/day, 20,000 writes/day, 1GB storage
- Authentication: Unlimited logins
- Hosting: Not used (using Bluehost)

**Typical Usage (10 users):**
- ~500 reads/day ✅
- ~50 writes/day ✅
- ~500KB storage ✅

**Well within free tier!**

---

## Next Steps After Setup

1. ✅ Complete Firebase setup
2. ✅ Test locally
3. ✅ Migrate existing data (if any)
4. ✅ Deploy to production
5. ✅ Add other users to approved list

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Verify Firebase configuration is correct
3. Check Firestore security rules
4. Verify user is in `approvedUsers` collection
5. Try clearing browser cache and cookies
6. Test in incognito/private window

---

**Ready to get started? Follow Step 1 above!**
