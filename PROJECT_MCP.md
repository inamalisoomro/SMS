# Student Management System (SMS) - Model Context Protocol

**Project Name:** Student Attendance Management System (SAMS)  

**Framework:** React 19 + TypeScript + Vite  

**Database:** IndexedDB (Offline-first local storage)  

**Email System:** EmailJS API (Client-side email notifications)  

**Styling:** Tailwind CSS v4 with animations (Motion/Framer Motion)  

**Icons:** Lucide React  

**API:** Google Gemini AI Integration  

**Platform:** Progressive Web App (PWA)

---

## 📋 Project Overview

A comprehensive **Student Management System** built as a Progressive Web Application (PWA) with offline-first capabilities. The system enables educational institutions to manage students, classes, subjects, and attendance records efficiently using a secure, browser-based IndexedDB database. Includes email notification system for parent communication.

### Key Characteristics:

- **Offline-First**: All data stored locally using IndexedDB

- **Email Notifications**: Parent email alerts via EmailJS (200 emails/month free)

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

| **Email Service** | EmailJS API (Client-side) |

| **Runtime** | Node.js (dev/build) |

| **AI Integration** | Google Gemini AI (@google/genai) |

### Project Structure

```

src/

├── App.tsx                 # Main application component & state management

├── main.tsx                # Application entry point

├── index.css              # Global styles

├── database.ts            # IndexedDB database class (SAMSIndexedDB)

├── emailService.ts        # EmailJS integration service

├── notificationHelper.ts  # Email notification helper functions

├── types.ts               # TypeScript type definitions

├── utils.ts               # Utility functions

└── components/            # React components

    ├── Sidebar.tsx        # Navigation sidebar

    ├── DashboardView.tsx   # Dashboard/home view

    ├── StudentsView.tsx    # Student management (with parent emails)

    ├── ClassesView.tsx     # Class management

    ├── SubjectsView.tsx    # Subject/course management

    ├── AttendanceView.tsx   # Attendance marking & tracking

    ├── AnnouncementsView.tsx # School announcements with email notifications

    ├── ReportsView.tsx     # Report generation

    ├── AnalyticsView.tsx   # Data analytics & charts

    └── SettingsView.tsx    # Application settings (includes EmailJS config)

public/

├── manifest.json          # PWA manifest

└── service-worker.js      # Service worker for offline support

config/

├── vite.config.ts         # Vite build configuration

├── tsconfig.json          # TypeScript configuration

├── tailwind.config.js     # Tailwind CSS configuration

└── postcss.config.js      # PostCSS configuration

docs/

├── EMAIL_SETUP.md         # EmailJS setup guide

└── TESTING_GUIDE.md       # Complete testing instructions

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

  parentEmail?: string;          // Primary parent email (for notifications)

  secondaryParentEmail?: string; // Secondary parent email (optional)

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

#### 7. **Notifications Store** (NEW)

```typescript

interface EmailNotification {

  id: string;                    // UUID

  type: NotificationType;        // Type of notification

  recipientEmail: string;        // Recipient email address

  recipientName: string;         // Recipient name

  subject: string;               // Email subject

  message: string;               // Email body content

  status: 'pending' | 'sent' | 'failed';  // Delivery status

  sentAt?: number;               // Timestamp when sent

  error?: string;                // Error message if failed

  retryCount: number;            // Number of retry attempts

  metadata?: Record<string, any>; // Additional context data

}

```

#### 8. **Announcements Store** (NEW)

```typescript

interface Announcement {

  id: string;                    // UUID

  type: 'general' | 'urgent' | 'event' | 'holiday';

  title: string;                 // Announcement title

  message: string;               // Announcement content

  targetAudience: 'all' | 'specific_classes';

  targetClassIds?: string[];     // Class IDs if specific classes

  createdAt: number;             // Creation timestamp

  createdBy: string;             // Creator name/ID

  emailsSent: number;            // Count of emails sent

  emailsFailed: number;          // Count of failed emails

}

```

#### 9. **Homework Store** (NEW)

```typescript

interface Homework {

  id: string;                    // UUID

  classId: string;               // Foreign key

  subjectId: string;             // Foreign key

  title: string;                 // Assignment title

  description: string;           // Assignment details

  dueDate: string;               // Due date (YYYY-MM-DD)

  assignedDate: string;          // Assignment date

  createdAt: number;             // Timestamp

}

```

#### 10. **Results Store** (NEW)

```typescript

interface Result {

  id: string;                    // UUID

  studentId: string;             // Foreign key

  examType: string;              // Exam name/type

  subjectId: string;             // Foreign key

  marks: number;                 // Score obtained

  totalMarks: number;            // Maximum marks

  grade?: string;                // Grade (A/B/C etc.)

  remarks?: string;              // Teacher remarks

  publishedAt: number;           // Timestamp

}

```

#### 11. **Settings** (LocalStorage)

```typescript

interface AppSettings {

  schoolName: string;            // Institution name

  schoolLogo: string;            // Emoji or base64 image

  schoolLogoImage?: string;      // Optional logo image URL

  theme: 'light' | 'dark';       // UI theme

  academicYear: string;          // Current academic year (e.g., "2026-2027")

  emailJsPublicKey?: string;     // EmailJS public key

  emailJsServiceId?: string;     // EmailJS service ID

  emailJsTemplateId?: string;    // EmailJS template ID

}

```

---

## 📧 Email Notification System

### EmailJS Integration (Client-Side)

**Why EmailJS?**

- ✅ **No Backend Required** - Sends emails directly from browser

- ✅ **Free Forever** - 200 emails/month free tier (no credit card)

- ✅ **No Deployment Costs** - Works with local/offline setup

- ✅ **Simple Setup** - 5 minutes configuration

### Email Service Architecture

```typescript

// emailService.ts - EmailJS API integration

class EmailService {

  async sendEmail(params: EmailParams): Promise<boolean>

  async sendBulkEmails(params: BulkEmailParams): Promise<EmailResult>

  async sendTestEmail(toEmail: string, toName: string): Promise<boolean>

}

```

### Notification Types

```typescript

type NotificationType =

  | 'homework'              // Homework assignment notifications

  | 'certificate'           // Certificate issued notifications

  | 'result'                // Exam result published notifications

  | 'announcement'          // School announcements

  | 'attendance_alert'      // Absence/late alerts

  | 'fee_reminder'          // Fee payment reminders

  | 'event'                 // School event notifications

  | 'general';              // General messages

```

### Notification Helper Functions

```typescript

// notificationHelper.ts

// Send homework assignment notification

async sendHomeworkNotification(

  homework: Homework,

  students: Student[],

  className: string,

  subjectName: string

): Promise<EmailResult>

// Send announcement to parents

async sendAnnouncementNotification(

  announcement: Announcement,

  recipients: Array<{ email: string; name: string; studentName: string }>

): Promise<EmailResult>

// Send exam result notification

async sendResultNotification(

  result: Result,

  student: Student,

  subjectName: string

): Promise<EmailResult>

// Send attendance alert

async sendAttendanceAlert(

  student: Student,

  date: string,

  status: string

): Promise<EmailResult>

```

### Email Configuration (Settings Page)

Users configure EmailJS in the Settings page:

1. **Public Key** - EmailJS account public key

2. **Service ID** - Connected email service (Gmail/Outlook/etc.)

3. **Template ID** - Email template for notifications

4. **Test Email** - Send test email to verify setup

### Email Template Format

```

To: {{to_email}}

From: {{from_name}}

Subject: {{subject}}

Hello {{to_name}},

{{message}}

---

Sent automatically from {{from_name}}

Student Management System

```

### Email Sending Flow

1. **User Action** → Post announcement / Add homework / Publish result

2. **Gather Recipients** → Get parent emails from students

3. **Prepare Email** → Format message with template variables

4. **Send via EmailJS** → API call to EmailJS service

5. **Track Status** → Save notification record in DB

6. **User Feedback** → Toast notification with success/failure count

7. **Retry Logic** → Failed emails tracked for manual retry

---

## 📱 Core Features & Functionality

### 1. **Dashboard View** `DashboardView.tsx`)

- **Quick Statistics**: Total students, classes, and subject count

- **Recent Activity**: Live activity log showing last 100 actions

- **Attendance Summary**: Visual breakdown of attendance by status

- **Navigation Shortcuts**: Quick links to main sections

- **Backup Trigger**: Direct export database button

### 2. **Student Management** `StudentsView.tsx`)

- **Add Student**: Register new students with details (name, roll number, class assignment)

- **Parent Email Fields**: Primary and secondary parent email inputs

- **Edit Student**: Update student information including parent emails

- **Delete Student**: Remove student records (with undo capability)

- **Batch Import**: CSV file import for bulk student registration

- **Search/Filter**: Filter students by class or search by name

- **Student List**: Organized table view with inline actions

### 3. **Class Management** `ClassesView.tsx`)

- **Add Class**: Create new class (name + section)

- **Edit Class**: Modify class details

- **Delete Class**: Remove class records (with undo)

- **Class Summary**: Display enrolled student count per class

- **Class List**: Table view of all classes

### 4. **Subject/Course Management** `SubjectsView.tsx`)

- **Add Subject**: Register new subjects/courses with code

- **Edit Subject**: Update subject information

- **Delete Subject**: Remove subjects (with undo)

- **Subject Catalog**: Full list of all courses

- **Subject Codes**: Optional subject code tracking

### 5. **Attendance Marking** `AttendanceView.tsx`)

- **Daily Attendance Sheet**: Date-based class attendance marking

- **Multiple Statuses**: Present, Absent, Late, Leave

- **Bulk Entry**: Mark attendance for entire class at once

- **Date Selection**: Pick specific class and date

- **Attendance History**: View past attendance records

- **Notes**: Add optional notes to attendance records

### 6. **Announcements** `AnnouncementsView.tsx`) (NEW)

- **Post Announcements**: Create school-wide or class-specific announcements

- **Announcement Types**: General, Urgent, Event, Holiday

- **Email Distribution**: Automatically send emails to parents

- **Target Audience**: Send to all parents or specific classes

- **Announcement History**: View all past announcements

- **Email Stats**: Track emails sent/failed per announcement

- **Delete Announcements**: Remove old announcements

### 7. **Reports Generation** `ReportsView.tsx`)

- **Attendance Reports**: Generate attendance summary by class/student

- **Class Reports**: Detailed class-wise attendance analysis

- **Student Reports**: Individual student attendance history

- **Date Range**: Filter reports by date range

- **Export**: Download reports in formats (CSV/PDF potential)

- **Attendance Percentage**: Calculate and display attendance percentages

### 8. **Analytics & Visualization** `AnalyticsView.tsx`)

- **Attendance Charts**: Visual representation of attendance trends

- **Class Distribution**: Student distribution across classes

- **Attendance Breakdown**: Pie/bar charts for status distribution

- **Trend Analysis**: Historical attendance trends

- **Performance Metrics**: Key statistics and KPIs

### 9. **Settings & Configuration** `SettingsView.tsx`)

- **School Branding**: Update school name and logo

- **Academic Year**: Set current academic year

- **EmailJS Configuration**: Setup email notification credentials

- **Test Email**: Send test email to verify configuration

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

const [announcements, setAnnouncements] = useState<Announcement[]>([]);

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

5. **Email Notification** → Send emails if configured

6. **State Update** → `loadAllData()` refreshes all state

7. **Toast Notification** → User feedback triggered

8. **Component Re-render** → UI updates with new data

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

#### Announcement Operations (NEW)

```typescript

async getAnnouncements(): Promise<Announcement[]>

async saveAnnouncement(announcement: Announcement): Promise<void>

async deleteAnnouncement(id: string): Promise<void>

```

#### Notification Operations (NEW)

```typescript

async getNotifications(): Promise<EmailNotification[]>

async saveNotification(notification: EmailNotification): Promise<void>

async updateNotificationStatus(id: string, status: string, error?: string): Promise<void>

```

#### Homework Operations (NEW)

```typescript

async getHomework(): Promise<Homework[]>

async saveHomework(homework: Homework): Promise<void>

async deleteHomework(id: string): Promise<void>

```

#### Results Operations (NEW)

```typescript

async getResults(): Promise<Result[]>

async saveResult(result: Result): Promise<void>

async deleteResult(id: string): Promise<void>

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

### Sidebar Component `Sidebar.tsx`)

- **Navigation Menu**: 9 main sections (Dashboard, Attendance, Students, Classes, Subjects, Announcements, Reports, Analytics, Settings)

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

| Student Registration | ✅ Complete | StudentsView | Add, edit, delete students with parent emails |

| Class Management | ✅ Complete | ClassesView | Create and manage classes |

| Subject Catalog | ✅ Complete | SubjectsView | Maintain course list |

| Attendance Marking | ✅ Complete | AttendanceView | Daily attendance recording |

| Announcements | ✅ Complete | AnnouncementsView | Post announcements with email notifications |

| Email Notifications | ✅ Complete | emailService.ts | EmailJS integration for parent communication |

| Reports | ✅ Complete | ReportsView | Attendance analysis |

| Analytics | ✅ Complete | AnalyticsView | Data visualization |

| Settings | ✅ Complete | SettingsView | App + EmailJS configuration |

| Backup/Restore | ✅ Complete | SettingsView | JSON export/import |

| Undo Delete | ✅ Complete | App.tsx | Single-level undo cache |

| Activity Logging | ✅ Complete | database.ts | Comprehensive audit trail |

| Dark Mode | ✅ Complete | App.tsx | Theme toggle |

| Batch Import | ✅ Complete | StudentsView | CSV student import |

### 🔐 Security Features

- **Local Storage Only**: No server transmission of data (except EmailJS API for sending emails)

- **IndexedDB**: Browser storage with same-origin policy

- **Audit Trail**: Complete activity logging

- **Data Validation**: Type-safe TypeScript interfaces

- **No Authentication**: Assumes institutional network usage

- **Email Security**: EmailJS API uses HTTPS, credentials stored locally

### 📊 Data Insights

- **Attendance Trends**: Historical analysis

- **Class Distribution**: Student enrollment stats

- **Status Breakdown**: Present/Absent/Late/Leave percentages

- **Activity Timeline**: Complete action history

- **Email Delivery Stats**: Track notification success/failure rates

---

## 🔌 API Integration Points

### EmailJS API (Email Notifications)

```typescript

// API Endpoint

POST https://api.emailjs.com/api/v1.0/email/send

// Request Format

{

  service_id: string,

  template_id: string,

  user_id: string,

  template_params: {

    to_email: string,

    to_name: string,

    from_name: string,

    subject: string,

    message: string

  }

}

```

**Features:**

- 200 emails/month free forever

- No credit card required

- HTTPS secure transmission

- Multiple email provider support (Gmail, Outlook, Yahoo, etc.)

- Email template customization

### Google Gemini AI Integration

```typescript

// Imported in package.json

"@google/genai": "^2.4.0"

```

- Ready for AI-powered features (potential future enhancements)

- Currently configured but not actively used in core features

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

  "dotenv": "^17.2.3"                      // Environment vars

}

```

### Development Dependencies

```json

{

  "@types/node": "^22.14.0",

  "autoprefixer": "^10.4.21",

  "esbuild": "^0.25.0",

  "tsx": "^4.21.0"

}

```

### Removed Dependencies (Backend Not Needed)

Previously included but removed as per user requirements:

- ❌ express (no backend server)

- ❌ nodemailer (replaced with EmailJS)

- ❌ @sendgrid/mail (replaced with EmailJS)

- ❌ mailgun.js (replaced with EmailJS)

- ❌ resend (replaced with EmailJS)

- ❌ cors (no backend)

- ❌ concurrently (no backend)

---

## 🎯 Development Scripts

```bash

# Start development server (port 5173)

npm run dev

# Production build

npm run build

# Preview built app

npm run preview

# Type check (no emit)

npm run lint

```

---

## 🌐 Environment Configuration

### .env.example

```

# EmailJS Configuration (Get from https://www.emailjs.com/)

# No need for .env file - configured in Settings page UI

# Just sign up for free and enter credentials in app Settings

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

- **8 Sample Students**: Distributed across classes (no parent emails by default)

- **Attendance Records**: Last 6 days of simulated attendance

- **Active Session**: 2026-2027 Academic Year

- **No Email Config**: User must configure EmailJS in Settings

---

## 🔄 Complete User Workflow Examples

### Scenario 1: Mark Attendance for Class 10-A Math on 2026-01-15

1. **Navigate**: Click "Attendance" in sidebar

2. **Select**: Choose Class 10-A, Subject Math, Date 2026-01-15

3. **Mark**: Toggle student status (Present/Absent/Late/Leave)

4. **Submit**: Click "Submit Roster"

5. **Confirm**: Toast notification confirms submission

6. **Log**: Activity logged in audit trail

7. **View**: Data visible in Reports and Analytics sections

8. **Export**: Optional backup from Settings

### Scenario 2: Post School Announcement with Email Notifications

1. **Navigate**: Click "Announcements" in sidebar

2. **Click**: "Post Announcement" button

3. **Fill Form**:

   - Type: Urgent

   - Title: "School Holiday Tomorrow"

   - Message: "School will be closed tomorrow due to weather"

   - Send To: All Parents

4. **Submit**: Click "Post & Send Emails"

5. **Processing**:

   - System gathers all parent emails from students

   - Sends email to each parent via EmailJS

   - Tracks success/failure

6. **Result**: Toast shows "Announcement posted! Emails sent: 45, Failed: 2"

7. **Log**: Activity logged in audit trail

8. **Parents Receive**: Email notification in their inbox

### Scenario 3: Add Student with Parent Email

1. **Navigate**: Click "Students" in sidebar

2. **Click**: "+ Add Student" button

3. **Fill Form**:

   - Name: John Doe

   - Roll Number: 25

   - Class: 10-A

   - Contact: +1234567890

   - **Primary Parent Email**: john.father@email.com

   - **Secondary Parent Email**: john.mother@email.com

4. **Submit**: Click "Register Student"

5. **Confirm**: Toast shows "Student registered successfully"

6. **Result**: Both parents will now receive announcements/notifications

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

- Auto-restore deleted student/class/subject/announcement

- Cleared after navigation

### Email Error Handling

- Failed emails tracked in notifications store

- Retry count maintained for manual retry

- User-friendly error messages in toast

- EmailJS API errors logged for debugging

### Fallback States

- Loading splash screen during DB initialization

- Empty state messages in all views

- Error messages with user guidance

- "Email not configured" warnings with setup link

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

Warning: amber-500

```

---

## 🔐 Data Persistence Strategy

### IndexedDB

- **Scope**: Per-origin (HTTPS required for production)

- **Quota**: Typically 50% of available disk space

- **Persistence**: Survives browser restart

- **Sync**: Manual export/import for backup

- **Version**: 3 (includes email notification stores)

### LocalStorage

- **Purpose**: Settings (theme, school name, academic year, EmailJS credentials)

- **Size**: ~10MB limit

- **Fallback**: Default values if missing

- **Security**: EmailJS keys stored locally (not transmitted except to EmailJS API)

### Auto-sync

- After every operation, `loadAllData()` refreshes state

- Ensures UI always reflects DB state

- Real-time updates without polling

---

## 📝 Types & Interfaces

All TypeScript types defined in `src/types.ts`:

```typescript

- Student (with parentEmail, secondaryParentEmail)

- Class

- Subject

- AttendanceRecord

- AttendanceStatus ('present' | 'absent' | 'late' | 'leave')

- AcademicSession

- ActivityLog

- AppSettings (with EmailJS config fields)

- EmailNotification

- NotificationType

- Announcement

- Homework

- Result

- EmailParams

- BulkEmailParams

- EmailResult

```

---

## 🚀 Future Enhancement Opportunities

1. ~~**Email Notifications**~~ ✅ Complete - EmailJS integration

2. **SMS Notifications**: Add Twilio/Nexmo for SMS alerts

3. **Server Sync**: Connect to backend for multi-device sync

4. **Authentication**: Add user login system

5. **Permissions**: Role-based access (Admin, Teacher, Student)

6. **AI Reports**: Gemini AI-powered insights

7. **QR Code**: QR-based attendance marking

8. **Mobile App**: React Native version

9. **Analytics Dashboard**: Advanced data visualization with charts

10. **Timetable**: Class schedule management

11. **Marks Management**: Grade and marks tracking

12. **Parent Portal**: Dedicated parent login to view child progress

13. **Teacher Dashboard**: Individual teacher views

14. **Bulk Email Templates**: Customizable email templates per event type

15. **Email Scheduling**: Schedule announcements for future delivery

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

**Issue**: Emails not sending

- **Solution**: 

  - Check if EmailJS is configured in Settings

  - Verify Public Key, Service ID, Template ID are correct

  - Test with "Send Test Email" button

  - Check EmailJS dashboard for quota/errors

  - Ensure students have parent email addresses

**Issue**: "Email not configured" warning

- **Solution**: Go to Settings → Configure EmailJS credentials → Save

**Issue**: Only some emails sent

- **Solution**: 

  - Check if parent emails are valid format

  - Verify EmailJS quota (200/month free)

  - Check EmailJS dashboard for blocked/invalid emails

---

## 📚 Documentation Files

- **README.md** - Project overview and setup instructions

- **PROJECT_MCP.md** - This file - complete technical documentation

- **EMAIL_SETUP.md** - Step-by-step EmailJS configuration guide

- **TESTING_GUIDE.md** - Complete testing instructions for email system

- **.env.example** - Environment configuration template

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

- **EmailJS**: https://www.emailjs.com/docs/

---

**Last Updated**: September 27, 2026  

**Project Status**: Production Ready with Email Notifications  

**Version**: 2.0.0 (Email System Added)

**Database Version**: 3 (with email notification stores)
