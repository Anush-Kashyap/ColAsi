/**
 * ColAsi AsyncStorage Database Layer
 * Manages database persistence for subjects and schedule slots on mobile.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WidgetManager from '../widgets/widgetManager';

const STORAGE_KEYS = {
    SUBJECTS: 'colasi_subjects_native',
    TIMETABLE: 'colasi_timetable_native',
    CATALOGS: 'colasi_catalogs_native',
    EVENTS: 'colasi_events_native',
    VAULTS: 'colasi_vaults_native',
    DATE_OVERRIDES: 'colasi_date_overrides_native'
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
        if (WidgetManager && typeof WidgetManager.updateTimetableWidget === 'function') {
            WidgetManager.updateTimetableWidget().catch(() => {});
        }
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
        if (WidgetManager && typeof WidgetManager.updateTimetableWidget === 'function') {
            WidgetManager.updateTimetableWidget().catch(() => {});
        }
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
        if (WidgetManager && typeof WidgetManager.updateTimetableWidget === 'function') {
            WidgetManager.updateTimetableWidget().catch(() => {});
        }
    } catch (e) {
        console.error('Error saving calendar events', e);
    }
}

/**
 * Get all single-day timetable overrides
 */
export async function getDateOverrides() {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.DATE_OVERRIDES);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error('Error fetching date overrides', e);
        return {};
    }
}

/**
 * Save single-day timetable override for a specific date (e.g. '2026-07-22')
 */
export async function saveDateOverride(dateStr, slots) {
    try {
        const allOverrides = await getDateOverrides();
        allOverrides[dateStr] = slots;
        await AsyncStorage.setItem(STORAGE_KEYS.DATE_OVERRIDES, JSON.stringify(allOverrides));
        if (WidgetManager && typeof WidgetManager.updateTimetableWidget === 'function') {
            WidgetManager.updateTimetableWidget().catch(() => {});
        }
    } catch (e) {
        console.error('Error saving date override', e);
    }
}

/**
 * Delete single-day timetable override for a specific date (resets date to weekly schedule)
 */
export async function deleteDateOverride(dateStr) {
    try {
        const allOverrides = await getDateOverrides();
        delete allOverrides[dateStr];
        await AsyncStorage.setItem(STORAGE_KEYS.DATE_OVERRIDES, JSON.stringify(allOverrides));
        if (WidgetManager && typeof WidgetManager.updateTimetableWidget === 'function') {
            WidgetManager.updateTimetableWidget().catch(() => {});
        }
    } catch (e) {
        console.error('Error deleting date override', e);
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
 * Get all vault items for a specific subject
 */
export async function getVaultItems(subjectId) {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.VAULTS);
        const allVaults = data ? JSON.parse(data) : {};
        return allVaults[subjectId] || [];
    } catch (e) {
        console.error('Error fetching vault items', e);
        return [];
    }
}

/**
 * Save vault items for a specific subject
 */
export async function saveVaultItems(subjectId, items) {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.VAULTS);
        const allVaults = data ? JSON.parse(data) : {};
        allVaults[subjectId] = items;
        await AsyncStorage.setItem(STORAGE_KEYS.VAULTS, JSON.stringify(allVaults));
    } catch (e) {
        console.error('Error saving vault items', e);
    }
}

/**
 * Delete all vault items for a deleted subject
 */
export async function cleanupVaultForSubject(subjectId) {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.VAULTS);
        const allVaults = data ? JSON.parse(data) : {};
        delete allVaults[subjectId];
        await AsyncStorage.setItem(STORAGE_KEYS.VAULTS, JSON.stringify(allVaults));
    } catch (e) {
        console.error('Error cleaning up vault for subject', e);
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
        
        const rawSubjects = subjects ? JSON.parse(subjects) : [];
        const rawTimetable = timetable ? JSON.parse(timetable) : [];
        const rawCatalogs = catalogs ? JSON.parse(catalogs) : {};
        const rawEvents = events ? JSON.parse(events) : [];

        // Minify keys for 75%+ payload compression
        const minifiedCatalogs = {};
        for (const subId in rawCatalogs) {
            minifiedCatalogs[subId] = (rawCatalogs[subId] || []).map(m => ({
                i: m.id,
                n: m.name,
                tp: (m.topics || []).map(topic => ({
                    i: topic.id,
                    t: topic.title,
                    c: topic.classCovered ? 1 : 0,
                    s: topic.selfCovered ? 1 : 0
                }))
            }));
        }

        const compactObj = {
            s: rawSubjects.map(sub => ({
                i: sub.id,
                n: sub.name,
                sn: sub.shortName,
                c: sub.color,
                tc: sub.totalClasses,
                bc: sub.bunkedClasses
            })),
            t: rawTimetable.map(slot => ({
                i: slot.id,
                d: slot.day,
                sh: slot.startHour,
                eh: slot.endHour,
                si: slot.subjectId,
                r: slot.room || '',
                no: slot.notes || ''
            })),
            c: minifiedCatalogs,
            e: rawEvents.map(ev => ({
                i: ev.id,
                dt: ev.date,
                t: ev.title,
                d: ev.description || '',
                tp: ev.type,
                si: ev.subjectId || '',
                n: ev.notificationIds || []
            }))
        };
        
        const jsonStr = JSON.stringify(compactObj);
        const base64 = encodeBase64Utf8(jsonStr);
        return `COLASI_BKP_${base64}COLASI_END`;
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
        if (!backupInput || !backupInput.trim()) {
            return { success: false, reason: 'Please paste or share a backup code first.' };
        }
        
        let text = backupInput.trim();
        let jsonStr = '';

        // 1. Direct JSON check
        if (text.startsWith('{') || text.startsWith('[')) {
            jsonStr = text;
        } else {
            // Extract base64 payload between delimiters
            const start = text.indexOf('COLASI_BKP_');
            if (start !== -1) {
                text = text.substring(start + 11);
                const end = text.indexOf('COLASI_END');
                if (end !== -1) {
                    text = text.substring(0, end);
                } else {
                    const match = text.match(/^[A-Za-z0-9+/=]+/);
                    if (match) text = match[0];
                }
            } else {
                // Fallback: search for long base64 string
                const match = text.match(/[A-Za-z0-9+/=]{20,}/);
                if (match) {
                    text = match[0];
                } else {
                    return { success: false, reason: 'No COLASI_BKP_ code found in the text.' };
                }
            }

            text = text.replace(/\s+/g, '');
            try {
                jsonStr = decodeBase64Utf8(text);
            } catch (err) {
                return { success: false, reason: 'Failed to decode base64 backup code.' };
            }
        }

        let rawObj = null;
        try {
            rawObj = JSON.parse(jsonStr);
        } catch (err) {
            return { success: false, reason: 'Backup code is corrupted or incomplete.' };
        }

        if (!rawObj || typeof rawObj !== 'object') {
            return { success: false, reason: 'Invalid backup structure.' };
        }

        // Expand minified or standard backup format
        let finalSubjects = [];
        let finalTimetable = [];
        let finalCatalogs = {};
        let finalEvents = [];

        // 1. Subjects
        if (Array.isArray(rawObj.s)) {
            finalSubjects = rawObj.s.map(item => ({
                id: item.i,
                name: item.n,
                shortName: item.sn,
                color: item.c,
                totalClasses: item.tc || 0,
                bunkedClasses: item.bc || 0
            }));
        } else if (Array.isArray(rawObj.subjects)) {
            finalSubjects = rawObj.subjects;
        }

        // 2. Timetable
        if (Array.isArray(rawObj.t)) {
            finalTimetable = rawObj.t.map(item => ({
                id: item.i,
                day: item.d,
                startHour: item.sh,
                endHour: item.eh,
                subjectId: item.si,
                room: item.r || '',
                notes: item.no || ''
            }));
        } else if (Array.isArray(rawObj.timetable)) {
            finalTimetable = rawObj.timetable;
        }

        // 3. Catalogs
        if (rawObj.c && typeof rawObj.c === 'object') {
            for (const subId in rawObj.c) {
                const mods = rawObj.c[subId];
                if (Array.isArray(mods)) {
                    finalCatalogs[subId] = mods.map(m => {
                        if (m.tp || m.top) {
                            const topicsList = m.tp || m.top || [];
                            return {
                                id: m.i || m.id,
                                name: m.n || m.name,
                                topics: topicsList.map(tp => ({
                                    id: tp.i || tp.id,
                                    title: tp.t || tp.title,
                                    classCovered: tp.c === 1 || tp.classCovered === true,
                                    selfCovered: tp.s === 1 || tp.selfCovered === true
                                }))
                            };
                        }
                        return m;
                    });
                }
            }
        } else if (rawObj.catalogs && typeof rawObj.catalogs === 'object') {
            finalCatalogs = rawObj.catalogs;
        }

        // 4. Events
        if (Array.isArray(rawObj.e)) {
            finalEvents = rawObj.e.map(item => ({
                id: item.i,
                date: item.dt || item.d,
                title: item.t,
                description: item.d || '',
                type: item.tp || 'task',
                subjectId: item.si || '',
                notificationIds: item.n || []
            }));
        } else if (Array.isArray(rawObj.events)) {
            finalEvents = rawObj.events;
        }

        await AsyncStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(finalSubjects));
        await AsyncStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(finalTimetable));
        await AsyncStorage.setItem(STORAGE_KEYS.CATALOGS, JSON.stringify(finalCatalogs));
        await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(finalEvents));
        if (WidgetManager && typeof WidgetManager.updateTimetableWidget === 'function') {
            WidgetManager.updateTimetableWidget().catch(() => {});
        }
        
        return { success: true };
    } catch (e) {
        console.error('Error importing data', e);
        return { success: false, reason: e.message || 'Unknown import failure.' };
    }
}

/**
 * Upload backup to free cloud server and get a 5-character short code
 */
export async function uploadCloudBackup(forceNew = false) {
    try {
        if (!forceNew) {
            const cachedStr = await AsyncStorage.getItem('@colasi_cloud_code');
            if (cachedStr) {
                const cached = JSON.parse(cachedStr);
                const ageMs = Date.now() - (cached.timestamp || 0);
                const ONE_HOUR_MS = 60 * 60 * 1000;
                if (ageMs < ONE_HOUR_MS && cached.code) {
                    return { success: true, code: cached.code, isCached: true };
                }
            }
        }

        const payload = await exportAllData();
        if (!payload) return { success: false, reason: 'Failed to generate backup data.' };

        const response = await fetch('https://paste.rs', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: payload
        });

        if (!response.ok) {
            return { success: false, reason: 'Cloud server rejected the upload.' };
        }

        const url = (await response.text()).trim();
        const code = url.split('/').filter(Boolean).pop();

        if (!code || code.length < 2) {
            return { success: false, reason: 'Invalid response from cloud server.' };
        }

        const exactCode = code.trim();
        await AsyncStorage.setItem('@colasi_cloud_code', JSON.stringify({
            code: exactCode,
            timestamp: Date.now()
        }));

        return { success: true, code: exactCode, isCached: false };
    } catch (e) {
        console.error('Error uploading cloud backup', e);
        return { success: false, reason: 'Network error. Please check your internet connection.' };
    }
}

/**
 * Download backup from free cloud server using a 5-character short code
 */
export async function downloadCloudBackup(shortCode) {
    try {
        if (!shortCode || !shortCode.trim()) {
            return { success: false, reason: 'Please enter your sync code.' };
        }

        const cleanCode = shortCode.trim();
        let payload = null;

        // Try exact code from paste.rs
        let response = await fetch(`https://paste.rs/${cleanCode}`);
        if (response.ok) {
            payload = await response.text();
        } else {
            // Fallback: try pastes.dev
            response = await fetch(`https://api.pastes.dev/${cleanCode}`);
            if (response.ok) {
                payload = await response.text();
            }
        }

        if (!payload || !payload.trim()) {
            return { success: false, reason: `Sync code "${cleanCode}" not found or expired.` };
        }

        return await importAllData(payload);
    } catch (e) {
        console.error('Error downloading cloud backup', e);
        return { success: false, reason: 'Network error while fetching cloud backup.' };
    }
}



