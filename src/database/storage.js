/**
 * ColAsi AsyncStorage Database Layer
 * Manages database persistence for subjects and schedule slots on mobile.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    SUBJECTS: 'colasi_subjects_native',
    TIMETABLE: 'colasi_timetable_native',
    CATALOGS: 'colasi_catalogs_native',
    EVENTS: 'colasi_events_native'
};

/**
 * Custom light UUID generation
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Get all subjects from database
 */
export async function getSubjects() {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.SUBJECTS);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error fetching subjects', e);
        return [];
    }
}

/**
 * Save all subjects to database
 */
export async function saveSubjects(subjects) {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
    } catch (e) {
        console.error('Error saving subjects', e);
    }
}

/**
 * Get all timetable slots
 */
export async function getTimetable() {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.TIMETABLE);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error fetching timetable', e);
        return [];
    }
}

/**
 * Save all timetable slots
 */
export async function saveTimetable(slots) {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(slots));
    } catch (e) {
        console.error('Error saving timetable', e);
    }
}

/**
 * Clean up timetable slots that reference a deleted subject
 */
export async function cleanupTimetableForSubject(subjectId) {
    try {
        const slots = await getTimetable();
        const filtered = slots.filter(slot => slot.subjectId !== subjectId);
        await saveTimetable(filtered);
    } catch (e) {
        console.error('Error cleaning up timetable for subject', e);
    }
}

/**
 * Get catalog/modules data for a specific subject
 */
export async function getCatalogs(subjectId) {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.CATALOGS);
        const allCatalogs = data ? JSON.parse(data) : {};
        return allCatalogs[subjectId] || [];
    } catch (e) {
        console.error('Error fetching catalogs for subject', e);
        return [];
    }
}

/**
 * Save catalog/modules data for a specific subject
 */
export async function saveCatalogs(subjectId, modules) {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.CATALOGS);
        const allCatalogs = data ? JSON.parse(data) : {};
        allCatalogs[subjectId] = modules;
        await AsyncStorage.setItem(STORAGE_KEYS.CATALOGS, JSON.stringify(allCatalogs));
    } catch (e) {
        console.error('Error saving catalogs for subject', e);
    }
}

/**
 * Clean up catalog data when a subject is deleted
 */
export async function cleanupCatalogsForSubject(subjectId) {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.CATALOGS);
        if (data) {
            const allCatalogs = JSON.parse(data);
            delete allCatalogs[subjectId];
            await AsyncStorage.setItem(STORAGE_KEYS.CATALOGS, JSON.stringify(allCatalogs));
        }
    } catch (e) {
        console.error('Error cleaning up catalogs for subject', e);
    }
}
/**
 * Get all scheduled calendar events
 */
export async function getEvents() {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error fetching calendar events', e);
        return [];
    }
}

/**
 * Save all scheduled calendar events
 */
export async function saveEvents(events) {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    } catch (e) {
        console.error('Error saving calendar events', e);
    }
}

/**
 * Clean up events for a deleted subject
 */
export async function cleanupEventsForSubject(subjectId) {
    try {
        const events = await getEvents();
        const filtered = events.filter(ev => ev.subjectId !== subjectId);
        await saveEvents(filtered);
    } catch (e) {
        console.error('Error cleaning up events for subject', e);
    }
}

/**
 * Export all local data to a backup string
 */
export async function exportAllData() {
    try {
        const subjects = await AsyncStorage.getItem(STORAGE_KEYS.SUBJECTS);
        const timetable = await AsyncStorage.getItem(STORAGE_KEYS.TIMETABLE);
        const catalogs = await AsyncStorage.getItem(STORAGE_KEYS.CATALOGS);
        const events = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS);
        
        const backupObj = {
            subjects: subjects ? JSON.parse(subjects) : [],
            timetable: timetable ? JSON.parse(timetable) : [],
            catalogs: catalogs ? JSON.parse(catalogs) : {},
            events: events ? JSON.parse(events) : []
        };
        
        const jsonStr = JSON.stringify(backupObj);
        // Simple base64 encoding (UTF-8 safe)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        // Convert string to UTF-8 bytes to ensure special characters encode cleanly
        const utf8 = unescape(encodeURIComponent(jsonStr));
        let result = '';
        let i = 0;
        while (i < utf8.length) {
            const c1 = utf8.charCodeAt(i++) & 0xff;
            if (i === utf8.length) {
                result += chars.charAt(c1 >> 2);
                result += chars.charAt((c1 & 0x3) << 4);
                result += '==';
                break;
            }
            const c2 = utf8.charCodeAt(i++);
            if (i === utf8.length) {
                result += chars.charAt(c1 >> 2);
                result += chars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
                result += chars.charAt((c2 & 0xF) << 2);
                result += '=';
                break;
            }
            const c3 = utf8.charCodeAt(i++);
            result += chars.charAt(c1 >> 2);
            result += chars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
            result += chars.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6));
            result += chars.charAt(c3 & 0x3F);
        }
        return `COLASI_BKP_${result}`;
    } catch (e) {
        console.error('Error exporting data', e);
        return null;
    }
}

/**
 * Import all local data from a backup string
 */
export async function importAllData(backupString) {
    try {
        if (!backupString || !backupString.startsWith('COLASI_BKP_')) {
            throw new Error('Invalid backup code format');
        }
        const base64 = backupString.substring(11);
        
        // Base64 decoding
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let str = base64.replace(/=+$/, '');
        let raw = '';
        let i = 0;
        let bc = 0;
        let bs = 0;
        while (i < str.length) {
            const char = str.charAt(i++);
            const idx = chars.indexOf(char);
            if (idx === -1) continue;
            
            bs = bc % 4 === 0 ? idx : (bs << 6) + idx;
            if (bc++ % 4) {
                raw += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
            }
        }
        
        // Convert UTF-8 raw string back
        const result = decodeURIComponent(escape(raw));
        const backupObj = JSON.parse(result);
        
        if (backupObj.subjects) {
            await AsyncStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(backupObj.subjects));
        }
        if (backupObj.timetable) {
            await AsyncStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(backupObj.timetable));
        }
        if (backupObj.catalogs) {
            await AsyncStorage.setItem(STORAGE_KEYS.CATALOGS, JSON.stringify(backupObj.catalogs));
        }
        if (backupObj.events) {
            await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(backupObj.events));
        }
        return true;
    } catch (e) {
        console.error('Error importing data', e);
        return false;
    }
}



