# ColAsi Bug Fixes & Lessons Learned

This file documents critical development errors made during the mobile application setup and the fixes applied. **All subsequent agents and builders MUST read this file first before making changes to ensure these errors are not repeated.**

---

## 1. StyleSheet Property Naming (kebab-case vs. camelCase)
- **Error:** Attempted to use standard CSS syntax `line-height: 12` inside the React Native StyleSheet object in `src/screens/ScheduleScreen.js`.
- **Cause:** React Native stylesheets are JavaScript objects, which require `camelCase` properties rather than CSS `kebab-case`. Using kebab-case properties without quotes is invalid JS syntax and breaks the Babel parser/bundler.
- **Fix:** Changed `line-height: 12` to `lineHeight: 12`.
- **Rule for future work:** Always write styles using camelCase (e.g., `lineHeight`, `backgroundColor`, `marginVertical`, `borderTopLeftRadius`, etc.). Never use hyphens unless quoting the property name as a string (which should still be avoided in favor of camelCase).

---

## 2. Unresolved Global Constants
- **Error:** ReferenceError: `TOTAL_HOURS` is not defined in `src/screens/ScheduleScreen.js`.
- **Cause:** The weekly grid code referenced `TOTAL_HOURS` to calculate sizes and map items, but the constant was only declared in the web version and was missed during the React Native rewrite.
- **Fix:** Added `const TOTAL_HOURS = END_HOUR - START_HOUR;` (evaluates to `10`) alongside `START_HOUR` and `END_HOUR` definitions at the top of the file.
- **Rule for future work:** Double-check that all constants used in render loops (such as hour blocks, day arrays, dimensions) are properly defined at the top of screen files or in the theme.

---

## 3. Deprecated React Native SafeAreaView
- **Error:** Warning: "SafeAreaView has been deprecated and will be removed in a future release. Please use 'react-native-safe-area-context' instead."
- **Cause:** React Native's built-in `SafeAreaView` is deprecated in newer React Native/Expo SDK versions due to layout inconsistencies on notch devices.
- **Fix:** 
  1. Installed `react-native-safe-area-context` via Expo CLI.
  2. Updated `App.js` to import `SafeAreaProvider` and `SafeAreaView` from `react-native-safe-area-context` instead of `react-native`.
  3. Wrapped the main application layout inside `<SafeAreaProvider>`.
- **Rule for future work:** Never import or use `SafeAreaView` from the standard `'react-native'` package. Always use the one exported by `'react-native-safe-area-context'`.

---

## 4. Syntax Error in Storage Module (Unclosed Function Block)
- **Error:** `SyntaxError: 'import' and 'export' may only appear at the top level.` in `src/database/storage.js`.
- **Cause:** When appending helper functions into `storage.js`, a previous function (`cleanupCatalogsForSubject`) had an unclosed `try` block (missing closing brace `}` for its `try` block before the next `export`). This caused Babel to interpret subsequent top-level `export` keywords as being nested inside an unclosed block statement.
- **Fix:** Properly closed the `try...catch` block in `cleanupCatalogsForSubject` before declaring top-level `export` functions.
---

## 5. Missing Sub-dependency `@ide/backoff`
- **Error:** `Unable to resolve "@ide/backoff" from "node_modules\expo-notifications\build\utils\updateDevicePushTokenAsync.js"`.
- **Cause:** `expo-notifications` requires `@ide/backoff` for exponential retry backoffs when registering push tokens, but npm did not automatically hoist it during single-package installation.
- **Fix:** Explicitly installed `@ide/backoff` into `package.json` (`npm install @ide/backoff --save`) and cleared Metro cache (`npx expo start --clear`).
- **Rule for future work:** When Metro fails to resolve internal subdependencies from `expo-notifications`, explicitly install `@ide/backoff` and restart Metro with `--clear`.

---

## 6. Invalid Java Namespace (Reserved Java Keyword)
- **Error:** `Namespace 'com.voidistakensteam.void' is not a valid Java package name as 'void' is a Java keyword.`
- **Cause:** The `android.package` property inside `app.json` was set to `com.voidistakensteam.void`. Since `void` is a reserved keyword in Java, compilation of the generated Android project fails.
- **Fix:** Changed the package identifier to `com.voidistakensteam.colasi` in `app.json`.
- **Rule for future work:** Always ensure that Android package identifiers (`android.package`) do not contain reserved Java keywords (such as `void`, `class`, `int`, `null`, etc.).

---

## 7. EAS Build Missing Update Channel Configuration
- **Error:** `This build has an invalid EAS Update configuration: update.url is set... but a channel is not specified for the current build profile "null" in eas.json.`
- **Cause:** When EAS updates are enabled for a project, the build profiles in `eas.json` must map to an update channel so that the built native binary knows which OTA update stream to subscribe to.
- **Fix:** Added `"channel": "preview"` to the `preview` profile inside `eas.json`.
- **Rule for future work:** When using EAS Update, ensure every build profile in `eas.json` that supports updates has an explicit `"channel"` defined.

---

## 8. BottomSheet Tap Bubbling (Unexpected Close)
- **Error:** Tapping anywhere inside the modal BottomSheet form or typing on the keyboard closed/canceled the sheet immediately.
- **Cause:** In `BottomSheet.js`, the wrapper `TouchableWithoutFeedback` backdrop caught tap events from child components because the inner `TouchableWithoutFeedback` was missing an empty `onPress` handler. React Native bubbles events up unless a child specifically intercepts them with a defined press handler.
- **Fix:** Added `onPress={() => {}}` to the inner `TouchableWithoutFeedback` inside `BottomSheet.js` to absorb and stop event bubbling.
- **Rule for future work:** Always add an empty `onPress={() => {}}` handler to inner `TouchableWithoutFeedback` containers to stop modal backdrop dismiss actions from firing on inner layout clicks.

---

## 9. Subject Detail Keyboard Coverage
- **Error:** The inline text inputs (adding a topic) in `SubjectDetailScreen.js` were covered by the native keyboard.
- **Cause:** The screen used a standard `ScrollView` container without a `KeyboardAvoidingView` wrapper, causing the screen content to stay static while the keyboard slid up over it.
- **Fix:** Wrapped the main `ScrollView` in `SubjectDetailScreen.js` inside a `<KeyboardAvoidingView>` component configured to offset layout heights correctly on keyboard changes.
- **Rule for future work:** Always wrap scrolling lists containing text input fields in a `KeyboardAvoidingView` to ensure input visibility.

---

## 10. Java Keyword Package Name in EAS Build
- **Error:** `Namespace 'com.voidistakensteam.void' is not a valid Java package name as 'void' is a Java keyword.`
- **Cause:** EAS Build reads tracked files from git. Since local changes to `app.json` specifying `"package": "com.voidistakensteam.colasi"` had not been committed to git yet, EAS Build auto-generated the package name from `com.owner.slug` (`com.voidistakensteam.void`), which failed Gradle compilation because `void` is a reserved Java keyword.
- **Fix:** Staged and committed all pending workspace changes and `app.json` updates to git (`git add . && git commit`).
---

## 11. Expo Notifications Invalid Trigger Input Object
- **Error:** `TypeError: The trigger object you provided is invalid. It needs to contain a type or channelId entry.`
- **Cause:** `Notifications.scheduleNotificationAsync` in SDK 52+ expects an object with an explicit `type` field (e.g. `{ type: Notifications.SchedulableTriggerInputTypes.DATE, date: notifDate }`), rather than passing a raw `Date` instance directly to `trigger`.
- **Fix:** Formatted the `trigger` parameter to `{ type: Notifications.SchedulableTriggerInputTypes?.DATE || 'date', date: notifDate }` in `CalendarScreen.js`.
- **Rule for future work:** Always format `Notifications.scheduleNotificationAsync` trigger inputs as `{ type: 'date', date: targetDate }` when scheduling date-based local notifications.

