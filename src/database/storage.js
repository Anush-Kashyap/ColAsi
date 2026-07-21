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
function encodeBase64Utf8(str) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let utf8Bytes = [];
    for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        if (code < 0x80) {
            utf8Bytes.push(code);
        } else if (code < 0x800) {
            utf8Bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        } else if (code < 0xd800 || code >= 0xe000) {
            utf8Bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        } else {
            i++;
            let code2 = str.charCodeAt(i);
            let surrogate = 0x10000 + (((code & 0x3ff) << 10) | (code2 & 0x3ff));
            utf8Bytes.push(
                0xf0 | (surrogate >> 18),
                0x80 | ((surrogate >> 12) & 0x3f),
                0x80 | ((surrogate >> 6) & 0x3f),
                0x80 | (surrogate & 0x3f)
            );
        }
    }
    
    let res = '';
    let i = 0;
    while (i < utf8Bytes.length) {
        let b1 = utf8Bytes[i++];
        let b2 = i < utf8Bytes.length ? utf8Bytes[i++] : NaN;
        let b3 = i < utf8Bytes.length ? utf8Bytes[i++] : NaN;

        res += chars.charAt(b1 >> 2);
        res += chars.charAt(((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4));
        res += !isNaN(b2) ? chars.charAt(((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6)) : '=';
        res += !isNaN(b3) ? chars.charAt(b3 & 63) : '=';
    }
    return res;
}

function decodeBase64Utf8(base64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = base64.replace(/[^A-Za-z0-9+/=]/g, '');
    let bytes = [];

    let i = 0;
    while (i < str.length) {
        let enc1 = chars.indexOf(str.charAt(i++));
        let enc2 = chars.indexOf(str.charAt(i++));
        let enc3 = chars.indexOf(str.charAt(i++));
        let enc4 = chars.indexOf(str.charAt(i++));

        let chr1 = (enc1 << 2) | (enc2 >> 4);
        let chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        let chr3 = ((enc3 & 3) << 6) | enc4;

        bytes.push(chr1);
        if (enc3 !== 64 && !isNaN(chr2)) bytes.push(chr2);
        if (enc4 !== 64 && !isNaN(chr3)) bytes.push(chr3);
    }

    let out = '';
    let pos = 0;
    while (pos < bytes.length) {
        let c1 = bytes[pos++];
        if (c1 < 128) {
            out += String.fromCharCode(c1);
        } else if (c1 > 191 && c1 < 224) {
            let c2 = bytes[pos++];
            out += String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
        } else if (c1 > 223 && c1 < 240) {
            let c2 = bytes[pos++];
            let c3 = bytes[pos++];
            out += String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        } else {
            let c2 = bytes[pos++];
            let c3 = bytes[pos++];
            let c4 = bytes[pos++];
            let u = (((c1 & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63)) - 0x10000;
            out += String.fromCharCode(0xd800 + (u >> 10), 0xdc00 + (u & 0x3ff));
        }
    }
    return out;
}

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
        const base64 = encodeBase64Utf8(jsonStr);
        return `COLASI_BKP_${base64}`;
    } catch (e) {
        console.error('Error exporting data', e);
        return null;
    }
}

/**
 * Import all local data from a backup string or raw JSON
 */
export async function importAllData(backupInput) {
    try {
        if (!backupInput) throw new Error('Empty backup input');
        
        let cleaned = backupInput.trim().replace(/\s+/g, '');
        let backupObj = null;

        // Check if raw JSON paste
        if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
            backupObj = JSON.parse(cleaned);
        } else {
            if (cleaned.startsWith('COLASI_BKP_')) {
                cleaned = cleaned.substring(11);
            }
            const jsonStr = decodeBase64Utf8(cleaned);
            backupObj = JSON.parse(jsonStr);
        }

        if (!backupObj || typeof backupObj !== 'object') {
            throw new Error('Invalid backup data structure');
        }

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



