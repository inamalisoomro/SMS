# Student Management System (SMS) - Model Context Protocol

**Project Name:** Student Attendance Management System (SAMS)  
**Framework:** React 19 + TypeScript + Vite  
**Database:** IndexedDB (Offline-first local storage)  
**Styling:** Tailwind CSS v4 with animations (Motion/Framer Motion)  
**Icons:** Lucide React  
**API:** Google Gemini AI Integration  
**Platform:** Progressive Web App (PWA)

---

## 📋 Project Overview

A comprehensive **Student Management System** built as a Progressive Web Application (PWA) with offline-first capabilities. The system enables educational institutions to manage students, classes, subjects, and attendance records efficiently using a secure, browser-based IndexedDB database.

### Key Characteristics:
- **Offline-First**: All data stored locally using IndexedDB
- **Real-time UI**: Smooth animations and transitions powered by Motion library
- **Audit Trail**: Complete activity logging system
- **Backup/Restore**: JSON-based database export/import
- **Theme Support**: Light/dark mode with persistent settings
- **Responsive Design**: Mobile-first responsive UI

---

## 🏗️ Architecture Overview

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript |
| **Build Tool** | Vite 6.2.3 |
| **UI Framework** | Tailwind CSS 4.1.14 |
| **Animations** | Motion (Framer Motion) 12.23.24 |
| **Icons** | Lucide React 0.546 |
| **Database** | IndexedDB (Browser API) |
| **Runtime** | Node.js (dev/build) |
| **Backend** | Express.js (optional) |
| **AI Integration** | Google Gemini AI (@google/genai) |

### Project Structure

```
src/
├── App.tsx                 # Main application component & state management
├── main.tsx                # Application entry point
├── index.css              # Global styles
├── database.ts            # IndexedDB database class (SAMSIndexedDB)
├── types.ts               # TypeScript type definitions
├── utils.ts               # Utility functions
└── components/            # React components
    ├── Sidebar.tsx        # Navigation sidebar
    ├── DashboardView.tsx   # Dashboard/home view
    ├── StudentsView.tsx    # Student management
    ├── ClassesView.tsx     # Class management
    ├── SubjectsView.tsx    # Subject/course management
    ├── AttendanceView.tsx   # Attendance marking & tracking
    ├── ReportsView.tsx     # Report generation
    ├── AnalyticsView.tsx   # Data analytics & charts
    └── SettingsView.tsx    # Application settings

public/
├── manifest.json          # PWA manifest
└── service-worker.js      # Service worker for offline support

config/
├── vite.config.ts         # Vite build configuration
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── postcss.config.js      # PostCSS configuration
```

---

## 🗄️ Database Schema

### IndexedDB Stores

#### 1. **Students Store**
```typescript
interface Student {
  id: string;                    // UUID - unique database identifier
  studentId: string;             // Human-readable ID (e.g., ST-2026-001)
  name: string;                  // Full name of student
  rollNumber: string;            // Roll number in class
  classId: string;               // Foreign key to Class
  section: string;               // Section designation (A, B, C, etc.)
  contactNumber: string;         // Primary contact phone
  email?: string;                // Email address (optional)
  photo?: string;                // Base64 encoded photo (optional)
}
```

#### 2. **Classes Store**
```typescript
interface Class {
  id: string;                    // UUID
  name: string;                  // Class name (e.g., "Grade 10")
  section: string;               // Section (A, B, C, etc.)
}
```

#### 3. **Subjects Store**
```typescript
interface Subject {
  id: string;                    // UUID
  name: string;                  // Subject name (e.g., "Mathematics")
  code?: string;                 // Subject code (e.g., "MATH-101")
}
```

#### 4. **Attendance Store**
```typescript
interface AttendanceRecord {
  id: string;                    // Composite: classId_subjectId_date_studentId
  studentId: string;             // Foreign key
  classId: string;               // Foreign key
  subjectId: string;             // Foreign key
  date: string;                  // YYYY-MM-DD format
  status: 'present' | 'absent' | 'late' | 'leave';  // Attendance status
  notes?: string;                // Optional notes
  updatedAt: number;             // Timestamp of last update
}
```

#### 5. **Sessions Store**
```typescript
interface AcademicSession {
  id: string;                    // UUID
  name: string;                  // Session name (e.g., "2026-2027")
  isActive: boolean;             // Current active session flag
}
```

#### 6. **Logs Store**
```typescript
interface ActivityLog {
  id: string;                    // UUID
  action: string;                // Action type (Student Registered, Class Modified, etc.)
  details: string;               // Detailed description
  timestamp: number;             // Unix timestamp
}
```

#### 7. **Settings** (LocalStorage)
```typescript
interface AppSettings {
  schoolName: string;            // Institution name
  schoolLogo: string;            // Emoji or base64 image
  theme: 'light' | 'dark';       // UI theme
  academicYear: string;          // Current academic year (e.g., "2026-2027")
}
```

---

## 📱 Core Features & Functionality

### 1. **Dashboard View** (`DashboardView.tsx`)
- **Quick Statistics**: Total students, classes, and subject count
- **Recent Activity**: Live activity log showing last 100 actions
- **Attendance Summary**: Visual breakdown of attendance by status
- **Navigation Shortcuts**: Quick links to main sections
- **Backup Trigger**: Direct export database button

### 2. **Student Management** (`StudentsView.tsx`)
- **Add Student**: Register new students with details (name, roll number, class assignment)
- **Edit Student**: Update student information
- **Delete Student**: Remove student records (with undo capability)
- **Batch Import**: CSV file import for bulk student registration
- **Search/Filter**: Filter students by class or search by name
- **Student List**: Organized table view with inline actions

### 3. **Class Management** (`ClassesView.tsx`)
- **Add Class**: Create new class (name + section)
- **Edit Class**: Modify class details
- **Delete Class**: Remove class records (with undo)
- **Class Summary**: Display enrolled student count per class
- **Class List**: Table view of all classes

### 4. **Subject/Course Management** (`SubjectsView.tsx`)
- **Add Subject**: Register new subjects/courses with code
- **Edit Subject**: Update subject information
- **Delete Subject**: Remove subjects (with undo)
- **Subject Catalog**: Full list of all courses
- **Subject Codes**: Optional subject code tracking

### 5. **Attendance Marking** (`AttendanceView.tsx`)
- **Daily Attendance Sheet**: Date-based class attendance marking
- **Multiple Statuses**: Present, Absent, Late, Leave
- **Bulk Entry**: Mark attendance for entire class at once
- **Date Selection**: Pick specific class and date
- **Attendance History**: View past attendance records
- **Notes**: Add optional notes to attendance records

### 6. **Reports Generation** (`ReportsView.tsx`)
- **Attendance Reports**: Generate attendance summary by class/student
- **Class Reports**: Detailed class-wise attendance analysis
- **Student Reports**: Individual student attendance history
- **Date Range**: Filter reports by date range
- **Export**: Download reports in formats (CSV/PDF potential)
- **Attendance Percentage**: Calculate and display attendance percentages

### 7. **Analytics & Visualization** (`AnalyticsView.tsx`)
- **Attendance Charts**: Visual representation of attendance trends
- **Class Distribution**: Student distribution across classes
- **Attendance Breakdown**: Pie/bar charts for status distribution
- **Trend Analysis**: Historical attendance trends
- **Performance Metrics**: Key statistics and KPIs

### 8. **Settings & Configuration** (`SettingsView.tsx`)
- **School Branding**: Update school name and logo
- **Academic Year**: Set current academic year
- **Theme Toggle**: Switch between light/dark mode
- **Database Backup**: Export full database as JSON
- **Database Restore**: Import from JSON backup file
- **System Reset**: Reset database to default demo data

---

## 🔄 Data Flow & State Management

### Application State (App.tsx - Top-level)

```typescript
// Collections State
const [students, setStudents] = useState<Student[]>([]);
const [classes, setClasses] = useState<Class[]>([]);
const [subjects, setSubjects] = useState<Subject[]>([]);
const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
const [logs, setLogs] = useState<ActivityLog[]>([]);

// UI State
const [currentTab, setCurrentTab] = useState('dashboard');
const [sidebarOpen, setSidebarOpen] = useState(false);
const [notificationsOpen, setNotificationsOpen] = useState(false);

// Toast/Notification Queue
const [toasts, setToasts] = useState<Toast[]>([]);

// Undo Cache
const [deletedCache, setDeletedCache] = useState<CachedDelete | null>(null);

// Settings
const [settings, setSettings] = useState<AppSettings>(() => {
  // Load from localStorage with defaults
});

// Database Ready
const [dbReady, setDbReady] = useState(false);
```

### Data Operations Flow

1. **User Action** → Component Handler
2. **Handler** → IndexedDB Operation via `dbInstance`
3. **DB Operation** → Store/Retrieve data
4. **Log Entry** → Activity logged automatically
5. **State Update** → `loadAllData()` refreshes all state
6. **Toast Notification** → User feedback triggered
7. **Component Re-render** → UI updates with new data

---

## 💾 IndexedDB Class (SAMSIndexedDB)

### Core Methods

#### Initialization
```typescript
async init(): Promise<IDBDatabase>
async seedIfEmpty(): Promise<boolean>
async resetDatabase(): Promise<void>
```

#### Student Operations
```typescript
async getStudents(): Promise<Student[]>
async saveStudent(student: Student): Promise<void>
async deleteStudent(id: string): Promise<void>
```

#### Class Operations
```typescript
async getClasses(): Promise<Class[]>
async saveClass(cls: Class): Promise<void>
async deleteClass(id: string): Promise<void>
```

#### Subject Operations
```typescript
async getSubjects(): Promise<Subject[]>
async saveSubject(subject: Subject): Promise<void>
async deleteSubject(id: string): Promise<void>
```

#### Attendance Operations
```typescript
async getAttendance(): Promise<AttendanceRecord[]>
async saveAttendanceRecord(record: AttendanceRecord): Promise<void>
async saveAttendanceRecords(records: AttendanceRecord[]): Promise<void>
async deleteAttendanceRecord(id: string): Promise<void>
```

#### Session Operations
```typescript
async getSessions(): Promise<AcademicSession[]>
async saveSession(session: AcademicSession): Promise<void>
```

#### Logging Operations
```typescript
async getLogs(): Promise<ActivityLog[]>
async addLog(action: string, details: string): Promise<void>
```

---

## 🎨 UI/UX Components

### Sidebar Component (`Sidebar.tsx`)
- **Navigation Menu**: 8 main sections (Dashboard, Students, Classes, Subjects, Attendance, Reports, Analytics, Settings)
- **Logo Display**: Configurable school emoji/logo
- **School Name**: Branding header
- **Notifications Bell**: Activity log indicator
- **Theme Toggle**: Dark/light mode switcher
- **Mobile Support**: Collapsible on small screens
- **Active Tab Highlight**: Current page indicator

### Toast System
- **Auto-dismiss**: 5.5 second auto-hide
- **Queue**: Multiple toasts stacked
- **Types**: success, error, info
- **Actions**: Undo action buttons for deletions
- **Animations**: Smooth entry/exit with Motion

### Modal/Form Patterns
- **Add/Edit Dialogs**: Form-based data entry
- **Confirmation**: Delete confirmations with undo option
- **Loading States**: Splash screen on app boot
- **Error Handling**: User-friendly error messages

---

## 🚀 Key Features & Capabilities

### ✅ Core Functionalities

| Feature | Status | Component | Details |
|---------|--------|-----------|---------|
| Student Registration | ✅ Complete | StudentsView | Add, edit, delete students |
| Class Management | ✅ Complete | ClassesView | Create and manage classes |
| Subject Catalog | ✅ Complete | SubjectsView | Maintain course list |
| Attendance Marking | ✅ Complete | AttendanceView | Daily attendance recording |
| Reports | ✅ Complete | ReportsView | Attendance analysis |
| Analytics | ✅ Complete | AnalyticsView | Data visualization |
| Settings | ✅ Complete | SettingsView | App configuration |
| Backup/Restore | ✅ Complete | SettingsView | JSON export/import |
| Undo Delete | ✅ Complete | App.tsx | Single-level undo cache |
| Activity Logging | ✅ Complete | database.ts | Comprehensive audit trail |
| Dark Mode | ✅ Complete | App.tsx | Theme toggle |
| Batch Import | ✅ Complete | StudentsView | CSV student import |

### 🔐 Security Features
- **Local Storage Only**: No server transmission of data
- **IndexedDB**: Browser storage with same-origin policy
- **Audit Trail**: Complete activity logging
- **Data Validation**: Type-safe TypeScript interfaces
- **No Authentication**: Assumes institutional network usage

### 📊 Data Insights
- **Attendance Trends**: Historical analysis
- **Class Distribution**: Student enrollment stats
- **Status Breakdown**: Present/Absent/Late/Leave percentages
- **Activity Timeline**: Complete action history

---

## 🔌 API Integration Points

### Google Gemini AI Integration
```typescript
// Imported in package.json
"@google/genai": "^2.4.0"
```
- Ready for AI-powered features (potential future enhancements)
- Currently configured but not actively used in core features

### Express.js Backend (Optional)
```typescript
"express": "^4.21.2"
```
- Can be extended for server-side operations
- Currently not required (all operations local)
- Potential for sync, authentication, or reporting

---

## 📦 Dependencies

### Production Dependencies
```json
{
  "react": "^19.0.1",                      // UI Framework
  "react-dom": "^19.0.1",                  // React rendering
  "typescript": "~5.8.2",                  // Type system
  "tailwindcss": "^4.1.14",                // Styling
  "@tailwindcss/vite": "^4.1.14",         // Vite integration
  "lucide-react": "^0.546.0",              // Icons
  "motion": "^12.23.24",                   // Animations
  "vite": "^6.2.3",                        // Build tool
  "@vitejs/plugin-react": "^5.0.4",        // React plugin
  "@google/genai": "^2.4.0",               // Gemini AI
  "express": "^4.21.2",                    // Web framework
  "dotenv": "^17.2.3"                      // Environment vars
}
```

### Development Dependencies
```json
{
  "@types/node": "^22.14.0",
  "@types/express": "^4.17.21",
  "autoprefixer": "^10.4.21",
  "esbuild": "^0.25.0",
  "tsx": "^4.21.0"
}
```

---

## 🎯 Development Scripts

```bash
# Start development server (port 3000)
npm run dev

# Production build
npm run build

# Preview built app
npm run preview

# Clean build artifacts
npm run clean

# Type check (no emit)
npm run lint
```

---

## 🌐 Environment Configuration

### .env.example
```
GEMINI_API_KEY=your_api_key_here
```

### PWA Configuration
- **Manifest**: `public/manifest.json` - PWA app metadata
- **Service Worker**: `public/service-worker.js` - Offline support
- **Install**: Can be installed as desktop/mobile app

---

## 📈 Data Seeding

On first app load, if database is empty, the system auto-seeds:

### Default Test Data
- **4 Classes**: Grade 10-12 with sections A/B
- **5 Subjects**: Mathematics, Physics, Chemistry, English, Computer Science
- **8 Sample Students**: Distributed across classes
- **Attendance Records**: Last 6 days of simulated attendance
- **Active Session**: 2026-2027 Academic Year

---

## 🔄 Complete User Workflow Example

### Scenario: Mark Attendance for Class 10-A Math on 2026-01-15

1. **Navigate**: Click "Attendance" in sidebar
2. **Select**: Choose Class 10-A, Subject Math, Date 2026-01-15
3. **Mark**: Toggle student status (Present/Absent/Late/Leave)
4. **Submit**: Click "Submit Roster"
5. **Confirm**: Toast notification confirms submission
6. **Log**: Activity logged in audit trail
7. **View**: Data visible in Reports and Analytics sections
8. **Export**: Optional backup from Settings

---

## 🐛 Error Handling & Recovery

### Toast Notifications
```typescript
triggerToast(type, message, action?)
// Types: 'success' | 'error' | 'info'
// Action: Optional undo/retry button
```

### Undo Capability
- Single-level delete undo with cached data
- Auto-restore deleted student/class/subject
- Cleared after navigation

### Fallback States
- Loading splash screen during DB initialization
- Empty state messages in all views
- Error messages with user guidance

---

## 🎨 Styling Details

### Tailwind CSS Configuration
- **Color Scheme**: Slate (neutral), Indigo (accent), Emerald/Rose (status)
- **Dark Mode**: CSS class-based dark mode (dark:* utilities)
- **Responsive**: Mobile-first with md: breakpoints
- **Typography**: Custom font sizing (text-xs to text-2xl)

### Animation Library (Motion)
- **Page Transitions**: Fade + slide animations
- **Toast Animations**: Scale + opacity effects
- **Drawer Animations**: Slide-in from right
- **Hover States**: Smooth transitions

### Color System
```
Neutral: slate-50/100/200/.../950
Primary: indigo-500/600
Success: emerald-500
Error: rose-500
```

---

## 🔐 Data Persistence Strategy

### IndexedDB
- **Scope**: Per-origin (HTTPS required for production)
- **Quota**: Typically 50% of available disk space
- **Persistence**: Survives browser restart
- **Sync**: Manual export/import for backup

### LocalStorage
- **Purpose**: Settings (theme, school name, academic year)
- **Size**: ~10MB limit
- **Fallback**: Default values if missing

### Auto-sync
- After every operation, `loadAllData()` refreshes state
- Ensures UI always reflects DB state
- Real-time updates without polling

---

## 📝 Types & Interfaces

All TypeScript types defined in `src/types.ts`:

```typescript
- Student
- Class
- Subject
- AttendanceRecord
- AttendanceStatus ('present' | 'absent' | 'late' | 'leave')
- AcademicSession
- ActivityLog
- AppSettings
```

---

## 🚀 Future Enhancement Opportunities

1. **Server Sync**: Connect to backend for multi-device sync
2. **Authentication**: Add user login system
3. **Permissions**: Role-based access (Admin, Teacher, Student)
4. **SMS/Email**: Automated notifications for parents
5. **AI Reports**: Gemini AI-powered insights
6. **QR Code**: QR-based attendance marking
7. **Mobile App**: React Native version
8. **Analytics Dashboard**: Advanced data visualization
9. **Timetable**: Class schedule management
10. **Marks Management**: Grade and marks tracking

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: Database fails to load
- **Solution**: Check browser IndexedDB quota, clear cache, try incognito mode

**Issue**: Theme not persisting
- **Solution**: Verify localStorage is enabled, check browser settings

**Issue**: Attendance not saving
- **Solution**: Ensure all required fields (class, subject, date) are selected

**Issue**: Cannot import CSV
- **Solution**: Verify CSV format matches expected columns, use batch import view

---

## 📄 License

SPDX-License-Identifier: Apache-2.0

---

## 📚 Additional Resources

- **React Docs**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org
- **Tailwind CSS**: https://tailwindcss.com
- **Vite**: https://vitejs.dev
- **Lucide Icons**: https://lucide.dev
- **Motion**: https://motion.dev
- **IndexedDB**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

---

**Last Updated**: September 2026  
**Project Status**: Production Ready  
**Version**: 1.0.0
