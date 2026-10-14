# 🚀 SAMS Quick Start Guide

## Getting Started in 3 Steps

### Step 1: Install & Run
```bash
npm install
npm run dev
```
Open browser to: http://localhost:3000

---

### Step 2: Select Your Role 👤

**Location:** Top-right corner (amber box with ⚠️ icon)

```
┌─────────────────────────────────────────────────────┐
│  SAMS  [Dashboard] [Students] [Classes]  [🌙] [⚠️▼] │ ← Click here!
└─────────────────────────────────────────────────────┘
```

**Choose from:**
- 👑 **Principal** - Full access (recommended for first-time users)
- 🛡️ **Administrator** - High access (no settings/backup)
- 🎓 **Teacher** - Limited to assigned classes
- 👥 **Parent** - View children only

---

### Step 3: Explore Features

#### If you selected **Principal** 👑:
1. ✅ Click **Students** → Add a student
2. ✅ Click **Classes** → Create a class
3. ✅ Click **Attendance** → Mark attendance
4. ✅ Click **Settings** → Configure school info
5. ✅ Try **Backup** → Export your data

#### If you selected **Administrator** 🛡️:
1. ✅ Manage students, teachers, classes
2. ✅ Mark attendance
3. ✅ Enter marks and publish results
4. ❌ Cannot change settings or backup (Principal only)

#### If you selected **Teacher** 🎓:
1. ✅ View assigned classes (Grade 10-A, 10-B)
2. ✅ Mark attendance for your classes
3. ✅ Enter marks for your subject (Math)
4. ❌ Cannot add/edit students or access analytics

#### If you selected **Parent** 👥:
1. ✅ **Parent Portal** opens automatically
2. ✅ View children: Alexander Chen, Sophia Martinez
3. ✅ Check attendance, results, fees
4. ❌ Cannot modify any data (read-only)

---

## 📍 Role Selector Location

### Desktop View:
```
┌──────────────────────────────────────────────────────────┐
│  🎓 SAMS                                    [🌙] [⚠️ ▼]    │
│  ┌──────────┐                                    ↑         │
│  │Dashboard │                                    │         │
│  │Students  │                          Role Selector Here  │
│  │Classes   │                                              │
│  │...       │                                              │
│  └──────────┘                                              │
│                                                            │
│  [Main Content Area]                                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Mobile View:
```
┌─────────────────────┐
│ ☰  SAMS    [⚠️ ▼]   │ ← Tap here
└─────────────────────┘
```

---

## 🎯 What Each Role Can Do

| Feature | Principal | Admin | Teacher | Parent |
|---------|-----------|-------|---------|--------|
| Add Students | ✅ | ✅ | ❌ | ❌ |
| Mark Attendance | ✅ | ✅ | ✅* | ❌ |
| Enter Marks | ✅ | ✅ | ✅* | ❌ |
| View Reports | ✅ | ✅ | ✅* | ✅** |
| Manage Fees | ✅ | ✅ | ❌ | ❌ |
| Change Settings | ✅ | ❌ | ❌ | ❌ |
| Backup/Restore | ✅ | ❌ | ❌ | ❌ |

\* Only assigned classes  
\** Only own children

---

## ⚡ Quick Tips

1. **Role Not Selected?** 
   - Look for dropdown in top-right corner
   - Click and select "Principal" for full access

2. **Permission Denied?**
   - Current role doesn't have access
   - Switch to Principal or Administrator

3. **Can't Find Role Selector?**
   - Look for amber/yellow box with ⚠️ icon
   - Located next to theme toggle (sun/moon)

4. **Role Lost After Refresh?**
   - Normal behavior (prototype mode)
   - Select role again from dropdown

5. **Want Full Access?**
   - Select **Principal** role
   - All features unlocked

---

## 🔐 Security Warning

⚠️ **This role selector is for DEVELOPMENT/TESTING only!**

- No passwords required
- No secure authentication
- For production, implement real auth system

---

## 📖 More Help

- **ROLE_SELECTION_GUIDE.md** - Complete role guide
- **PROJECT_MCP.md** - Full documentation
- **RBAC_DOCUMENTATION.md** - Permission details

---

## 🆘 Common Issues

**Q: Where is the role selector?**  
A: Top-right corner, amber box with ⚠️ icon next to theme toggle

**Q: I selected a role but can't see anything**  
A: Navigate to Dashboard first, then explore other sections

**Q: Why can't I add students as Teacher?**  
A: Teachers can't add students. Switch to Principal or Admin role

**Q: Parent portal looks different**  
A: Yes! Parents have a dedicated view showing only their children

**Q: Role disappeared after refresh**  
A: Expected behavior. Select role again after page refresh

---

**Ready to explore?** Select your role and start managing your school! 🎓

**Recommended:** Start with **Principal** role for full access
