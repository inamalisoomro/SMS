# 👤 Role Selection Guide - SAMS

## 🔐 How to Select Roles in SAMS

---

## ⚠️ IMPORTANT SECURITY NOTICE

**This role selector is for LOCAL DEVELOPMENT and UI/UX TESTING ONLY.**

It is **NOT** a secure authentication system and should **NEVER** be used in production without implementing proper authentication.

### What This Selector Does NOT Do:
- ❌ Verify user identity
- ❌ Check passwords
- ❌ Provide secure authentication
- ❌ Protect against unauthorized access
- ❌ Work across devices or browsers
- ❌ Persist securely across sessions

### For Production Deployment, You MUST Replace This With:
- ✅ Real authentication system (OAuth, SAML, JWT)
- ✅ Secure session management with encrypted tokens
- ✅ Server-side role verification
- ✅ Password hashing and secure credential storage
- ✅ Multi-factor authentication (recommended)

---

## 📍 Where to Find the Role Selector

The role selector appears in **two locations**:

### 1. **Top Navigation Bar** (Right Side)
- Look for the **amber/yellow badge** with warning icon (⚠️)
- Located next to the theme toggle (sun/moon icon)
- Shows current role icon and name
- Compact dropdown selector

### 2. **Settings Page** (Full Version)
- Navigate to **Settings** from sidebar
- Larger, more detailed version
- Includes security warning

---

## 🎭 Available Demo Roles

When you first load SAMS, **4 demo users** are automatically created:

| # | Role | Username | Icon | Access Level |
|---|------|----------|------|--------------|
| 1 | **Principal** | principal | 👑 Crown | **Full Access** - All permissions |
| 2 | **Administrator** | admin | 🛡️ Shield | **High Access** - Most permissions except system settings |
| 3 | **Teacher** | teacher1 | 🎓 Graduation Cap | **Limited Access** - Only assigned classes/subjects |
| 4 | **Parent** | parent1 | 👥 Users | **Read-Only** - Only linked children's data |

---

## 📝 Step-by-Step: How to Select a Role

### Method 1: Using Top Navigation Bar (Quick Switch)

1. **Look at the top-right** of the screen
2. **Find the amber/yellow box** with warning icon (⚠️)
3. **Click on the dropdown** (shows current role)
4. **Select from the list:**
   - Principal - principal
   - Administrator - admin
   - Teacher - teacher1
   - Parent - parent1
5. **Page automatically updates** to show relevant permissions

### Method 2: Using Settings Page (Full View)

1. **Click Settings** in the left sidebar
2. **Scroll to top** of settings page
3. **Find "Prototype Mode" section** with amber border
4. **Click the dropdown** (shows all roles with icons)
5. **Select your desired role**
6. **Navigate to other sections** to see role-based access

---

## 🔍 What Happens When You Select a Role?

### Immediate Changes:

1. **Sidebar Menu Updates**
   - Some menu items appear/disappear based on permissions
   - Locked items show 🔒 icon for restricted access

2. **Page Access Changes**
   - Principal: All pages accessible
   - Administrator: Most pages (no system settings)
   - Teacher: Only Dashboard, Attendance, Students (assigned), Classes (assigned)
   - Parent: Parent Portal only

3. **Button/Action States**
   - Buttons become disabled if no permission
   - Shows lock icon on restricted features
   - Toast notifications explain permission denials

4. **Data Filtering**
   - Teacher: Only sees assigned classes/subjects
   - Parent: Only sees linked children's data

---

## 👑 Role Details & What You Can Do

### 1. Principal (Full Access)

**Username:** principal  
**Icon:** 👑 Crown  
**Permissions:** All 21 permissions

**Can Access:**
- ✅ Dashboard
- ✅ Students (full CRUD)
- ✅ Teachers (full CRUD)
- ✅ Classes (full CRUD)
- ✅ Subjects (full CRUD)
- ✅ Attendance (mark & view all)
- ✅ Examinations (create & manage)
- ✅ Marks Entry (all classes)
- ✅ Results (publish & view)
- ✅ Fees (manage all)
- ✅ Announcements (post & manage)
- ✅ Reports (all reports)
- ✅ Analytics (full analytics)
- ✅ Settings (manage all settings)
- ✅ Backup/Restore (export & import)

**Use Case:** School administration, system configuration

---

### 2. Administrator (High Access)

**Username:** admin  
**Icon:** 🛡️ Shield  
**Permissions:** 19 of 21 permissions (no manage_settings, no backup_restore)

**Can Access:**
- ✅ Dashboard
- ✅ Students (full CRUD)
- ✅ Teachers (full CRUD)
- ✅ Classes (full CRUD)
- ✅ Subjects (full CRUD)
- ✅ Attendance (mark & view all)
- ✅ Examinations (create & manage)
- ✅ Marks Entry (all classes)
- ✅ Results (publish & view)
- ✅ Fees (manage all)
- ✅ Announcements (post & manage)
- ✅ Reports (all reports)
- ✅ Analytics (full analytics)
- ✅ Settings (view only - **cannot save**)
- ❌ Backup/Restore (**restricted to Principal**)

**Cannot Do:**
- Change school name/logo
- Configure EmailJS
- Backup/Restore database
- Reset system

**Use Case:** Day-to-day operations, data management

---

### 3. Teacher (Limited Access)

**Username:** teacher1  
**Icon:** 🎓 Graduation Cap  
**Permissions:** 9 of 21 permissions (only assigned classes/subjects)

**Linked To:**
- Class: Grade 10-A, Grade 10-B
- Subject: Mathematics

**Can Access:**
- ✅ Dashboard
- ✅ Students (view only assigned classes)
- ✅ Teachers (view all teachers)
- ✅ Classes (view assigned classes only)
- ✅ Subjects (view assigned subjects only)
- ✅ Attendance (mark for assigned classes/subjects only)
- ✅ Examinations (view assigned)
- ✅ Marks Entry (enter marks for assigned classes only)
- ✅ Results (view assigned classes)
- ✅ Announcements (view only)
- ✅ Reports (view assigned classes only)

**Cannot Access:**
- ❌ Manage Students (add/edit/delete)
- ❌ Manage Teachers
- ❌ Manage Classes
- ❌ Analytics
- ❌ Fees
- ❌ Settings
- ❌ Backup/Restore

**Use Case:** Teachers managing their assigned classes and subjects

---

### 4. Parent (Read-Only Access)

**Username:** parent1  
**Icon:** 👥 Users  
**Permissions:** 7 of 21 permissions (view-only for linked children)

**Linked Children:**
- Alexander Chen (Student ID: ST-2026-001)
- Sophia Martinez (Student ID: ST-2026-002)

**Can Access:**
- ✅ Parent Portal (dedicated view)
  - View child selection dropdown
  - View child's profile
  - View child's attendance (calendar view)
  - View child's results (published only)
  - View child's fee status
  - View announcements
  - Download report cards (for linked children)

**Cannot Access:**
- ❌ Dashboard
- ❌ Any management functions
- ❌ Other students' data
- ❌ Analytics
- ❌ Settings
- ❌ Any write operations

**Special Behavior:**
- Automatically redirected to Parent Portal on login
- Can only see data for Alexander and Sophia
- All other students hidden

**Use Case:** Parents monitoring their children's progress

---

## 🧪 Testing Different Roles

### Quick Test Scenarios:

#### Test 1: Principal Access
1. Select **Principal** role
2. Navigate to **Settings**
3. ✅ Should see "Save Settings" button enabled
4. Navigate to **Backup & Restore** section
5. ✅ Should see "Export Backup" and "Import Backup" enabled

#### Test 2: Administrator Restrictions
1. Select **Administrator** role
2. Navigate to **Settings**
3. ❌ "Save Settings" button should be **disabled/locked**
4. Navigate to **Backup & Restore** section
5. ❌ Backup buttons should be **locked** with message

#### Test 3: Teacher Data Filtering
1. Select **Teacher** role
2. Navigate to **Students**
3. ✅ Should only see students in **Grade 10-A and 10-B**
4. Try to click "Add Student"
5. ❌ Button should be **disabled** or show permission denied

#### Test 4: Parent Portal
1. Select **Parent** role
2. ✅ Should **auto-redirect** to Parent Portal
3. Check child selector dropdown
4. ✅ Should only show **Alexander and Sophia**
5. Try to navigate to other pages
6. ❌ Should show **permission denied** or not visible in menu

---

## 🎯 Visual Indicators

### How to Know Current Role:

1. **Top Navigation Bar:**
   - Shows icon + role name in amber box
   - Principal: 👑 Crown icon
   - Administrator: 🛡️ Shield icon
   - Teacher: 🎓 Graduation Cap icon
   - Parent: 👥 Users icon

2. **Amber Warning Badge:**
   - "DEV" badge visible on selector
   - Hover shows security warning tooltip

3. **Locked Features:**
   - 🔒 Lock icon on disabled buttons
   - Grayed-out appearance
   - Toast notification: "Permission denied: [permission_name]"

4. **Sidebar Menu:**
   - Available items shown normally
   - Unavailable items hidden or grayed

---

## ⚙️ Default Role on First Load

**On first launch:**
- No role selected initially
- **Must select a role** to access the system
- Role selector shows "-- Select Role --"
- Once selected, persists for current session only

**On page refresh:**
- Role is **lost** (not persisted)
- Must select again
- This is intentional for security (no session persistence in prototype)

---

## 🔄 Switching Between Roles

You can **switch roles at any time** while using the app:

1. **Current work is not saved** when switching
2. **Page stays the same** (doesn't navigate)
3. **Permissions update immediately**
4. **Data filtering applies instantly**
5. **No confirmation required** (instant switch)

**Example Flow:**
```
Principal → View all students → Switch to Teacher → Only see assigned classes
```

---

## 📋 Permission Matrix Quick Reference

| Feature | Principal | Admin | Teacher | Parent |
|---------|-----------|-------|---------|--------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| Manage Students | ✅ | ✅ | ❌ | ❌ |
| View Students | ✅ | ✅ | ✅* | ✅** |
| Manage Teachers | ✅ | ✅ | ❌ | ❌ |
| Mark Attendance | ✅ | ✅ | ✅* | ❌ |
| Enter Marks | ✅ | ✅ | ✅* | ❌ |
| Publish Results | ✅ | ✅ | ❌ | ❌ |
| Manage Fees | ✅ | ✅ | ❌ | ❌ |
| View Fees | ✅ | ✅ | ❌ | ✅** |
| Post Announcements | ✅ | ✅ | ❌ | ❌ |
| Manage Settings | ✅ | ❌ | ❌ | ❌ |
| Backup/Restore | ✅ | ❌ | ❌ | ❌ |
| View Analytics | ✅ | ✅ | ❌ | ❌ |
| Parent Portal | ❌ | ❌ | ❌ | ✅ |

\* Only for assigned classes/subjects  
\** Only for linked children

---

## 🛠️ Troubleshooting

### Issue: Can't see role selector
**Solution:** Look at top-right corner of screen next to theme toggle (sun/moon icon)

### Issue: Selected role but page is blank
**Solution:** You may not have permission for current page. Navigate to Dashboard or allowed section.

### Issue: Role resets after refresh
**Solution:** This is expected behavior in prototype mode. Select role again after refresh.

### Issue: "Permission denied" toast keeps appearing
**Solution:** Current role doesn't have permission for that action. Switch to Principal or Administrator.

### Issue: Teacher can't see any students
**Solution:** Teacher only sees assigned classes. Demo teacher1 is assigned to Grade 10-A and 10-B only.

### Issue: Parent can't access dashboard
**Solution:** Parents automatically go to Parent Portal. This is expected. Use sidebar to access allowed sections.

---

## 📞 Quick Help

**Need full access?** → Select **Principal** role  
**Testing admin workflows?** → Select **Administrator** role  
**Testing teacher permissions?** → Select **Teacher** role  
**Testing parent view?** → Select **Parent** role

**Can't find selector?** → Top-right corner, amber box with ⚠️ icon  
**Need to switch roles?** → Click dropdown, select different role  
**Lost after switching?** → Go to Dashboard, then navigate to desired section

---

## 📚 Related Documentation

- **RBAC_DOCUMENTATION.md** - Complete RBAC system documentation
- **RBAC_IMPLEMENTATION_REPORT.md** - Technical implementation details
- **PARENT_PORTAL_IMPLEMENTATION.md** - Parent portal guide
- **PROJECT_MCP.md** - Complete project documentation

---

**Remember:** This is a **prototype authentication system** for UI testing only. For production deployment, implement real authentication with secure user verification and password protection.

**Last Updated:** September 27, 2026  
**Version:** 2.0.0
