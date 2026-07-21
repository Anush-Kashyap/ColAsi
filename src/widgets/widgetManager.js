import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimetableWidget } from './TimetableWidget';

let requestWidgetUpdateFn = null;
try {
    const widgetModule = require('react-native-android-widget');
    if (widgetModule && widgetModule.requestWidgetUpdate) {
        requestWidgetUpdateFn = widgetModule.requestWidgetUpdate;
    }
} catch (e) {
    // Native module not linked in Expo Go
}

const STORAGE_KEYS = {
    SUBJECTS: 'colasi_subjects_native',
    TIMETABLE: 'colasi_timetable_native',
    EVENTS: 'colasi_events_native',
};

const formatHour = (h) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}:00 ${ampm}`;
};

const getTodayDetails = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Month names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateFormatted = `${d.getDate()} ${monthNames[d.getMonth()]} ${year}`;

    // Special Schedule Overrides
    let dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
    if (dateStr === '2026-11-05') {
        dayName = 'Friday'; // NITC Calendar Nov 5 Friday Schedule Override
    }

    return { dateStr, dateFormatted, dayName };
};

/**
 * Fetch local data and trigger widget UI update
 */
export async function updateTimetableWidget() {
    try {
        if (!requestWidgetUpdateFn) {
            return;
        }

        const { dateStr, dateFormatted, dayName } = getTodayDetails();

        // 1. Load data from AsyncStorage
        const rawSubjects = await AsyncStorage.getItem(STORAGE_KEYS.SUBJECTS);
        const rawTimetable = await AsyncStorage.getItem(STORAGE_KEYS.TIMETABLE);
        const rawEvents = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS);

        const subjects = rawSubjects ? JSON.parse(rawSubjects) : [];
        const timetable = rawTimetable ? JSON.parse(rawTimetable) : [];
        const events = rawEvents ? JSON.parse(rawEvents) : [];

        // 2. Check for Holiday on today's date
        const todayEvents = events.filter(e => e.date === dateStr);
        const holidayEvent = todayEvents.find(e => e.type === 'holiday');
        const isHoliday = !!holidayEvent;

        // 3. Filter today's timetable sessions
        const dayClasses = timetable
            .filter(slot => slot.day === dayName)
            .sort((a, b) => a.startHour - b.startHour)
            .map(slot => {
                const sub = subjects.find(s => s.id === slot.subjectId);
                return {
                    id: slot.id,
                    startTime: formatHour(slot.startHour),
                    endTime: formatHour(slot.endHour),
                    subjectName: sub ? sub.name : 'Class Session',
                    shortName: sub ? sub.shortName : 'CLS',
                    color: sub ? sub.color : '#ECC875',
                    room: slot.room || '',
                };
            });

        // 4. Request Widget Refresh safely
        await requestWidgetUpdateFn({
            widgetName: 'ColAsiTimetable',
            renderWidget: () => (
                <TimetableWidget
                    dayName={dayName}
                    dateFormatted={dateFormatted}
                    classes={dayClasses}
                    isHoliday={isHoliday}
                    holidayTitle={holidayEvent ? holidayEvent.title : ''}
                />
            ),
        });
    } catch (e) {
        // Safe catch for widget manager
    }
}
