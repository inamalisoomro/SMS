# 🔧 Role Selector Troubleshooting Guide

## Issue: "Role selector is not clickable"

---

## ✅ Quick Checklist

### 1. **Is the app running?**
```bash
npm run dev
```
Should show: `Local: http://localhost:3000`

### 2. **Can you see the header bar?**
At the very top of the page, you should see:
```
[School Name] • [Academic Year]                    [Amber Box]
```

### 3. **Look for the amber box**
The role selector is an **amber/yellow colored box** on the right side of the header.

It should have:
- ⚠️ Warning triangle icon
- 👑 Crown icon (or other role icon)
- Dropdown text (e.g., "Principal" or "Role")

---

## 📍 Exact Location

### Desktop View:
```
┌────────────────────────────────────────────────────────────┐
│  SHAAL Academy • 2026-2027       [⚠️ 👑 Principal ▼]       │ ← HERE!
└────────────────────────────────────────────────────────────┘
│  [Dashboard Content]                                       │
```

### What you should see:
- Amber/yellow background box
- Warning triangle icon (⚠️)
- Role icon (👑 for Principal)
- Text: "Principal" (or other role name)
- Small dropdown arrow (▼)

---

## 🎯 How to Click It

1. **Move your mouse** to the **top-right corner** of the page
2. **Look for the amber box** (yellow/orange colored)
3. **Click anywhere on the box** - it's the entire clickable area
4. **Dropdown menu appears** with 4 options:
   - Principal
   - Administrator  
   - Teacher
   - Parent
5. **Click on any option** to select that role

---

## 🐛 Common Issues & Solutions

### Issue 1: "I don't see any amber box"

**Possible causes:**
- App not fully loaded yet
- Database not initialized
- Browser zoom too high/low

**Solutions:**
1. **Wait 2-3 seconds** for app to fully load
2. **Refresh the page** (F5 or Ctrl+R)
3. **Check browser console** for errors (F12)
4. **Reset browser zoom** to 100% (Ctrl+0)

---

### Issue 2: "I see the box but can't click it"

**Possible causes:**
- CSS z-index issue
- Another element overlaying it
- Browser extension blocking it

**Solutions:**
1. **Try clicking directly on the text** ("Principal", "Role", etc.)
2. **Try clicking on the dropdown arrow** (right side of box)
3. **Disable browser extensions** temporarily
4. **Try a different browser** (Chrome, Firefox, Edge)
5. **Try incognito/private mode**

---

### Issue 3: "Box shows 'Role' but nothing happens"

**Possible causes:**
- Users not loaded from database
- Click event not registering

**Solutions:**
1. **Check browser console** (F12) for JavaScript errors
2. **Verify database initialized**:
   - Open browser DevTools (F12)
   - Go to **Application** tab → **IndexedDB** → **SAMS_DB** → **users**
   - Should see 4 users listed
3. **Clear browser cache** and reload
4. **Delete IndexedDB** and reload (will recreate with demo data):
   - F12 → Application → IndexedDB → Right-click SAMS_DB → Delete

---

### Issue 4: "Selected a role but nothing changed"

**This is expected behavior!**

When you select a role:
- Role changes immediately
- **Page stays the same**
- **Permissions apply** to your actions

**To see the effect:**
1. Select **Principal** role
2. Go to **Settings** page
3. ✅ You should see "Save Settings" button **enabled**
4. Now select **Administrator** role
5. ❌ "Save Settings" button should become **disabled/locked**

---

## 🔍 Detailed Visual Guide

### What the Selector Looks Like:

```
Normal State (before click):
┌─────────────────────────────┐
│ ⚠️ 👑 Principal        ▼    │ ← Amber background
└─────────────────────────────┘

Hover State:
┌─────────────────────────────┐
│ ⚠️ 👑 Principal        ▼    │ ← Slightly lighter
└─────────────────────────────┘
  Tooltip appears below

Clicked State (dropdown open):
┌─────────────────────────────┐
│ ⚠️ 👑 Principal        ▼    │
├─────────────────────────────┤
│ Principal                   │ ← Current selection
│ Administrator               │
│ Teacher                     │
│ Parent                      │
└─────────────────────────────┘
```

### Icons for Each Role:
- 👑 **Principal** - Crown icon
- 🛡️ **Administrator** - Shield icon  
- 🎓 **Teacher** - Graduation cap icon
- 👥 **Parent** - Users/people icon

---

## 🧪 Test If It's Working

### Test 1: Can you see it?
1. Open app: http://localhost:3000
2. Look at **top-right corner**
3. Do you see an **amber/yellow box**?
   - ✅ YES → Go to Test 2
   - ❌ NO → See "Issue 1" above

### Test 2: Can you click it?
1. **Click on the amber box**
2. Does a **dropdown menu appear**?
   - ✅ YES → Go to Test 3
   - ❌ NO → See "Issue 2" above

### Test 3: Does it change roles?
1. Click dropdown
2. Select "**Administrator**"
3. Does text change to "**Administrator**"?
4. Does icon change to **shield** (🛡️)?
   - ✅ YES → It's working! ✨
   - ❌ NO → See "Issue 3" above

### Test 4: Do permissions work?
1. Select **Principal** role
2. Go to **Students** page
3. Click **"+ Add Student"** button
4. ✅ Form should open
5. Now select **Teacher** role
6. ❌ Button should be **disabled**
   - ✅ If this happens → RBAC is working! 🎉

---

## 🖼️ Screenshots to Help

### What you're looking for:

**Good** ✅:
```
Top of page shows:
┌──────────────────────────────────────────────────┐
│ SHAAL Academy • 2026-2027    [⚠️ 👑 Principal ▼] │
└──────────────────────────────────────────────────┘
                                 ↑
                                 This amber box!
```

**Missing** ❌:
```
Top of page shows:
┌──────────────────────────────────────────────────┐
│ SHAAL Academy • 2026-2027                        │
└──────────────────────────────────────────────────┘
                                 ↑
                                 No amber box here
```

---

## 💻 Browser Console Check

If selector not visible, check console:

1. Press **F12** to open DevTools
2. Click **Console** tab
3. Look for errors (red text)
4. Common errors:
   - `Cannot read property 'role' of null` → User not loaded
   - `users is undefined` → Database not initialized
   - `RoleSelectorCompact is not defined` → Import error

5. If you see errors, **share them** for debugging

---

## 🔄 Force Reset (Nuclear Option)

If nothing works, try this:

### Step 1: Clear everything
```bash
# Stop the dev server (Ctrl+C)

# Clear browser data:
# Chrome: Settings → Privacy → Clear browsing data
# Firefox: Settings → Privacy → Clear Data
```

### Step 2: Delete IndexedDB
1. Open browser
2. Press **F12**
3. Go to **Application** tab
4. Click **IndexedDB** in left sidebar
5. Right-click **SAMS_DB** → **Delete database**
6. Close DevTools

### Step 3: Fresh start
```bash
# Restart dev server
npm run dev

# Open app: http://localhost:3000
# Database will recreate with demo users
# Role selector should appear after 2-3 seconds
```

---

## 📞 Still Not Working?

### Collect this information:

1. **Browser & Version:**
   - Chrome 120? Firefox 121? Safari 17?

2. **Console errors:**
   - Press F12 → Console tab
   - Copy any red error messages

3. **What you see:**
   - "I see nothing in top-right corner"
   - "I see gray box but no amber"
   - "I see amber box but can't click"
   - "I click but dropdown doesn't open"

4. **Screenshot:**
   - Take screenshot of your screen
   - Show the top-right corner clearly

### Check these files exist:
```bash
ls -la src/components/RoleSelector.tsx
ls -la src/permissions.ts
```
Both should exist.

---

## ✅ Expected Behavior Summary

### On First Load:
1. App starts
2. Database initializes (2-3 seconds)
3. 4 demo users created automatically
4. **Principal auto-selected** (first user)
5. Amber box appears top-right showing "👑 Principal"

### When Clicking:
1. Click amber box
2. Dropdown opens instantly
3. Shows 4 options
4. Click any option
5. Box updates to show new role
6. Icon changes
7. Permissions apply immediately

### When Navigating:
1. Role persists as you navigate pages
2. **Role resets on page refresh** (expected)
3. Must select again after refresh

---

## 🎯 Quick Fix Commands

```bash
# Restart dev server
npm run dev

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run lint

# Build and check for errors
npm run build
```

---

## 📚 Related Files

If you want to check the code:

- **Role Selector Component:** `src/components/RoleSelector.tsx`
- **Main App:** `src/App.tsx` (line ~2193)
- **Permissions:** `src/permissions.ts`
- **Types:** `src/types.ts` (User interface)

---

## 🆘 Emergency Fallback

If you absolutely cannot click the role selector, you can **manually set the role in code**:

### Temporary Fix (for testing only):

Edit `src/App.tsx`, find this line (~line 178):
```typescript
if (!currentUser && u.length > 0) {
  setCurrentUser(u[0]); // Principal
}
```

Change to force a specific role:
```typescript
// Force Principal role (full access)
if (u.length > 0) {
  setCurrentUser(u[0]); // Always Principal
}

// OR Force Administrator:
// setCurrentUser(u[1]);

// OR Force Teacher:
// setCurrentUser(u[2]);

// OR Force Parent:
// setCurrentUser(u[3]);
```

Save file, app will reload, and you'll be locked to that role.

**Remember to undo this change later!**

---

**Last Updated:** September 27, 2026  
**Status:** Active Troubleshooting Document
