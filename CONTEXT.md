# ColAsi — Project Context File

> **IMPORTANT FOR ALL AGENTS:** Do NOT replace, overwrite, or insert content in the middle of this file. Always APPEND new context at the bottom. Read this file first before starting any work.

---

## Project Overview

**ColAsi** is a native mobile application built using **React Native and Expo**. It acts as a cozy schedule manager and attendance tracker for college students, helping them manage their weekly schedules, visualize slots, and enforce attendance targets (specifically a 20% maximum bunk cap).

---

## Design Language (Cozy & Aesthetic Mobile UI)

- **Colors:**
  - Background Base: `#0C0B0A` (Warm Obsidian)
  - Cards & Sheet Panels: `#161412` (Cozy Bark)
  - Inputs & Borders: `#221E1B` (Warm Hearth)
  - Primary Accent: `#ECC875` (Honey Gold)
  - Secondary Accent: `#CB997E` (Warm Caramel)
  - Primary Text: `#F4EFEA` (Warm Alabaster Cream)
  - Secondary Text: `#A39E93` (Soft Ochre Grey)
- **Typography:**
  - Heading labels: `Outfit` (clean geometric font)
  - Body/Data: `Quicksand` (soft, cozy rounded font)
- **Visuals:** Warm glowing shadows, generous rounded corners (`border-radius: 24px` for cards, `16px` for buttons), smooth slide-up bottom sheets for editing, and clear vertical timelines.

---

## Core Features (Phase 1)

### 1. Timetable Schedule (ScheduleScreen)
- Mon–Fri, 8:00 AM to 6:00 PM.
- Displayed as a day-by-day vertical timeline with a swipeable/tappable Day Selector at the top.
- Supports multi-hour slots that span multiple periods.
- Clicking empty hours opens the Add Slot sheet.
- Collision checks prevent scheduling overlapping classes on the same day.

### 2. Subject Database & Attendance Tracker (SubjectsScreen)
- Users add subjects with name, short code, and cozy colors.
- Subject cards display:
  - **Total Classes** conducted.
  - **Bunked Classes** count.
- **Attendance Rule**: Bunked classes are strictly capped at 20% of total classes: `maxBunks = Math.floor(totalClasses * 0.2)`. 
- Reaching or trying to exceed the bunk limit is blocked and triggers a toast warning.
- Decreasing total classes automatically clamps the bunk count so it doesn't violate the 20% cap.

### 3. Data Storage
- Local AsyncStorage under React Native, managing serialization of `subjects` and `timetable` arrays.

---

## Tech Stack

- React Native (Expo template)
- Expo Fonts & Icons
- `@react-native-async-storage/async-storage`

---

## File Structure

```
ColAsi/
├── CONTEXT.md              # This file
├── errors.md               # Bug fixes & lessons learned log
├── App.js                  # App Entry & Navigation Controller
├── app.json                # Expo project settings
├── package.json            # Node modules & script runners
└── src/
    ├── components/
    │   ├── BottomSheet.js  # Cozy slide-up input drawer
    │   ├── SubjectCard.js  # Card showing attendance counters
    │   └── TimelineSlot.js # Individual slot item card
    ├── database/
    │   └── storage.js      # AsyncStorage wrapper functions
    ├── screens/
    │   ├── ScheduleScreen.js
    │   ├── SubjectDetailScreen.js # Syllabus catalog & dual checkbox view
    │   └── SubjectsScreen.js
    └── styles/
        └── theme.js        # Global stylesheet styling tokens
```

---

## Data Models

### Subject
```json
{
  "id": "string (uuid)",
  "name": "Object Oriented Programming",
  "shortName": "OOP",
  "color": "#ECC875",
  "totalClasses": 10,
  "bunkedClasses": 2
}
```

### Module Catalog & Syllabus Topic
```json
{
  "id": "string (uuid)",
  "name": "Module 1: Introduction",
  "topics": [
    {
      "id": "string (uuid)",
      "title": "Neural Networks Basics",
      "classCovered": true,
      "selfCovered": false
    }
  ]
}
```

### Timetable Slot
```json
{
  "id": "string (uuid)",
  "day": "Monday",
  "startHour": 9,
  "endHour": 11,
  "subjectId": "string (uuid)",
  "room": "Room 404",
  "notes": "Bring laptop"
}
```

---

## Log

### 2026-07-18 — Project Reset & Native Mobile Initialization
- Deleted all website files to start from scratch.
- Decided on React Native + Expo as the ideal mobile stack.
- Created CONTEXT.md for state tracking.
- Initialized Expo Blank JavaScript template.
- Resolved and aligned all project dependencies (react, react-native, expo-font, expo-status-bar, async-storage) to match target Expo SDK 54 (corresponding to user's local Expo Go app version).
- Verified compilation and package integrity using npx expo-doctor (18/18 checks passed).

### 2026-07-18 — Bug Fixes
- Corrected stylesheet property syntax error in `src/screens/ScheduleScreen.js` (replaced kebab-case `line-height` with camelCase `lineHeight` in gridSlotTitle styles).
- Defined missing `TOTAL_HOURS` constant in `src/screens/ScheduleScreen.js`.
- Fixed `SafeAreaView` deprecation warnings by installing `react-native-safe-area-context` and wrapping layout in `SafeAreaProvider` in `App.js`.
- Created `errors.md` log tracking bug fixes and lessons learned for future agents.

### 2026-07-20 — Direct Class Count Input & Subject Catalog/Syllabus System
- Added direct numeric typing to class counters in `SubjectCard.js` (tappable numbers switch to numeric TextInput for quick bulk editing).
- Implemented `SubjectDetailScreen.js` for expandable module cataloging (e.g. Module 1, Module 2) and syllabus topics.
- Added dual checkboxes per topic row: Checkbox 1 (Class coverage) and Checkbox 2 (Personal/Self coverage).
- Added module and overall syllabus coverage progress indicators (percentages for Class & Self study).
- Added `getCatalogs`, `saveCatalogs`, and `cleanupCatalogsForSubject` in `storage.js` for persistent AsyncStorage data management.
- Verified 18/18 checks pass with `npx expo-doctor`.

### 2026-07-20 — Calendar Events, 3-Day Prior Notifications & APK Build Configuration
- Installed `react-native-calendars` and `expo-notifications`.
- Added `CalendarScreen.js` with interactive date selection, theme customization matching warm obsidian palette, and day event lists.
- Implemented task completion toggle with strikethrough styling (`textDecorationLine: 'line-through'`).
- Added automatic 3-day prior push notification scheduling (`expo-notifications` schedules reminders for 3 days, 2 days, and 1 day before event deadlines).
- Updated `App.js` with notification permission handlers, Android notification channel setup, and a 3-tab bottom navigation bar (`Schedule`, `Calendar`, `Subjects`).
- Created `eas.json` for APK cloud builds and generated `apk_deployment_guide.md`.
### 2026-07-20 — Calendar Default Landing & Day Class Timetable Display
- Set `Calendar` as the default landing screen upon app launch (`useState('calendar')` in `App.js`).
- Integrated daily class timetable rendering into `CalendarScreen.js`: selecting any date automatically resolves its day of the week (e.g. Monday) and displays all scheduled class periods (time block, subject name, room number, notes) right above the tasks list.
- Verified 18/18 checks pass with `npx expo-doctor`.

### 2026-07-20 — Cozy Backup & Sync Feature
- Implemented `exportAllData` and `importAllData` functions in `storage.js` to package all AsyncStorage entries (subjects, timetable, catalog, tasks) into a lightweight, URL-safe base64 string.
- Created "Cozy Backup & Sync" footer component in `SubjectsScreen.js` to allow exporting data codes and restoring imports dynamically.
- Verified 18/18 checks pass with `npx expo-doctor`.

### 2026-07-20 — Unconditional Backup Display & Clipboard Integration
- Installed `expo-clipboard` to support copying backup strings directly.
- Updated `SubjectsScreen.js` to render the Cozy Backup & Sync panel unconditionally (meaning it is accessible even on an empty database list to import codes).
- Added a "Copy Code" button inside the Export BottomSheet using `expo-clipboard`.
- Verified 18/18 checks pass with `npx expo-doctor`.








