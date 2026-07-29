/**
 * Cozy Calendar & Event Scheduling Screen
 * Interactive date calendar with subject event reminders & local push notification scheduling.
 */

import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, 
    View, 
    Text, 
    ScrollView, 
    TouchableOpacity, 
    TextInput, 
    Alert, 
    Platform 
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import * as Notifications from 'expo-notifications';
import { colors, fonts } from '../styles/theme';
import * as DB from '../database/storage';
import BottomSheet from '../components/BottomSheet';

const NITC_ACADEMIC_CALENDAR_2026 = [
    // --- Official Holidays ---
    { date: '2026-08-15', title: '🇮🇳 Independence Day', description: 'National Holiday', type: 'holiday' },
    { date: '2026-08-25', title: '🌙 Id-E-Milad*', description: 'Holiday (*Depends on moon sighting)', type: 'holiday' },
    { date: '2026-08-26', title: '🌸 Onam', description: 'Holiday', type: 'holiday' },
    { date: '2026-10-02', title: '🕊️ Mahatma Gandhi Jayanti', description: 'National Holiday', type: 'holiday' },
    { date: '2026-10-09', title: '🎉 Tathva Tech Fest (Day 1)', description: 'Annual Tech Festival', type: 'holiday' },
    { date: '2026-10-10', title: '🎉 Tathva Tech Fest (Day 2)', description: 'Annual Tech Festival', type: 'holiday' },
    { date: '2026-10-11', title: '🎉 Tathva Tech Fest (Day 3)', description: 'Annual Tech Festival', type: 'holiday' },
    { date: '2026-10-19', title: '🪔 Dussehra (Mahashtami)', description: 'Holiday', type: 'holiday' },
    { date: '2026-10-20', title: '🪔 Dussehra (Vijay Dashmi)', description: 'Holiday', type: 'holiday' },
    { date: '2026-11-08', title: '🪔 Deepavali', description: 'Holiday', type: 'holiday' },
    { date: '2026-11-11', title: '⏸️ Buffer Day', description: 'No Instructional Class', type: 'holiday' },
    { date: '2026-11-24', title: '🪔 Guru Nanak Jayanti', description: 'Holiday', type: 'holiday' },
    { date: '2026-12-25', title: '🎄 Christmas Day', description: 'Holiday', type: 'holiday' },

    // --- Mid Sem Examinations ---
    { date: '2026-09-14', title: '📝 Mid Sem Exam - Day 1', description: 'Monsoon Semester Mid-Sem Examination', type: 'exam' },
    { date: '2026-09-15', title: '📝 Mid Sem Exam - Day 2', description: 'Monsoon Semester Mid-Sem Examination', type: 'exam' },
    { date: '2026-09-16', title: '📝 Mid Sem Exam - Day 3', description: 'Monsoon Semester Mid-Sem Examination', type: 'exam' },
    { date: '2026-09-17', title: '📝 Mid Sem Exam - Day 4', description: 'Monsoon Semester Mid-Sem Examination', type: 'exam' },
    { date: '2026-09-18', title: '📝 Mid Sem Exam - Day 5', description: 'Monsoon Semester Mid-Sem Examination', type: 'exam' },
    { date: '2026-09-19', title: '📝 Mid Sem Exam (Optional)', description: 'Optional Exam Day', type: 'exam' },

    // --- End Sem Examinations ---
    { date: '2026-11-12', title: '🎯 End Sem Exam - Day 1', description: 'Monsoon Semester Final Examination', type: 'exam' },
    { date: '2026-11-13', title: '🎯 End Sem Exam - Day 2', description: 'Monsoon Semester Final Examination', type: 'exam' },
    { date: '2026-11-14', title: '🎯 End Sem Exam (Optional)', description: 'Optional Exam Day', type: 'exam' },
    { date: '2026-11-16', title: '🎯 End Sem Exam - Day 3', description: 'Monsoon Semester Final Examination', type: 'exam' },
    { date: '2026-11-17', title: '🎯 End Sem Exam - Day 4', description: 'Monsoon Semester Final Examination', type: 'exam' },
    { date: '2026-11-18', title: '🎯 End Sem Exam - Day 5', description: 'Monsoon Semester Final Examination', type: 'exam' },
    { date: '2026-11-19', title: '🎯 End Sem Exam - Day 6', description: 'Monsoon Semester Final Examination', type: 'exam' },
    { date: '2026-11-20', title: '🎯 End Sem Exam - Day 7', description: 'Monsoon Semester Final Examination', type: 'exam' },
    { date: '2026-11-21', title: '🎯 End Sem Exam (Optional)', description: 'Optional Exam Day', type: 'exam' },
    { date: '2026-11-23', title: '🎯 End Sem Exam - Day 8', description: 'Monsoon Semester Final Examination', type: 'exam' },
    { date: '2026-11-25', title: '🎯 End Sem Exam - Day 9', description: 'Monsoon Semester Final Examination', type: 'exam' },

    // --- Key Academic Dates ---
    { date: '2026-07-20', title: '📋 Monsoon 2026 Enrolment Day', description: 'Mandatory Physical Reporting', type: 'academic' },
    { date: '2026-07-21', title: '🚀 First Instructional Day', description: 'Classes Begin', type: 'academic' },
    { date: '2026-07-30', title: '⚠️ Last Date for Add/Drop Courses', description: 'Course Registration Deadline', type: 'academic' },
    { date: '2026-08-22', title: '🎓 22nd Convocation', description: 'Graduation Ceremony', type: 'academic' },
    { date: '2026-09-01', title: '🏛️ Institute Foundation Day', description: 'Institute Event (Instructional / Working Day)', type: 'academic' },
    { date: '2026-11-05', title: '📅 Friday Time Table Day', description: 'Instructional Day with Friday Schedule', type: 'academic' },
    { date: '2026-11-10', title: '🏁 Last Instructional Day', description: 'End of Classes', type: 'academic' },
    { date: '2026-12-10', title: '📊 Result Declaration', description: 'Monsoon Semester Results', type: 'academic' },
];

const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function CalendarScreen({ refreshTrigger, onRefreshRequest }) {
    const todayStr = getTodayStr();
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [events, setEvents] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [timetable, setTimetable] = useState([]);
    const [dateOverrides, setDateOverrides] = useState({});
    const [sheetVisible, setSheetVisible] = useState(false);

    // Form states for Tasks
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [taskCategory, setTaskCategory] = useState('academic'); // 'academic' | 'non-academic'
    const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');

    // Form states for Date Timetable Overrides
    const [dateSlotSheetVisible, setDateSlotSheetVisible] = useState(false);
    const [editingDateSlotId, setEditingDateSlotId] = useState(null);
    const [slotStartHour, setSlotStartHour] = useState(8);
    const [slotEndHour, setSlotEndHour] = useState(9);
    const [slotSubjectId, setSlotSubjectId] = useState('');
    const [slotRoom, setSlotRoom] = useState('');
    const [slotNotes, setSlotNotes] = useState('');

    useEffect(() => {
        loadData();
    }, [refreshTrigger]);

    const importAcademicCalendar = async (quiet = false) => {
        const currentEvents = await DB.getEvents();
        let addedCount = 0;
        let updatedEvents = [...currentEvents];

        for (const item of NITC_ACADEMIC_CALENDAR_2026) {
            const idx = updatedEvents.findIndex(e => e.date === item.date && e.title === item.title);
            if (idx !== -1) {
                // Update type & description if changed
                updatedEvents[idx].type = item.type;
                updatedEvents[idx].description = item.description;
            } else {
                let notifIds = [];
                if (item.type === 'exam') {
                    notifIds = await scheduleEventNotifications(item.title, 'Academic Calendar', item.date);
                }
                updatedEvents.push({
                    id: DB.generateUUID(),
                    subjectId: null,
                    date: item.date,
                    title: item.title,
                    description: item.description,
                    type: item.type,
                    completed: false,
                    notificationIds: notifIds
                });
                addedCount++;
            }
        }

        if (addedCount > 0) {
            await DB.saveEvents(updatedEvents);
            setEvents(updatedEvents);
            if (!quiet) {
                Alert.alert('Academic Calendar Sync', `Imported ${addedCount} holidays, exam dates, and academic milestones!`);
            }
        } else if (!quiet) {
            Alert.alert('Up to Date', 'All NITC holidays and exam dates are already added to your calendar.');
        }
    };

    const loadData = async () => {
        let loadedEvents = await DB.getEvents();
        const loadedSubjects = await DB.getSubjects();
        const loadedTimetable = await DB.getTimetable();
        const loadedOverrides = await DB.getDateOverrides();

        // Auto-migrate Institute Foundation Day (Sept 1) to academic working day
        let needsSave = false;
        loadedEvents = loadedEvents.map(ev => {
            if (ev.title && ev.title.includes('Institute Foundation Day') && ev.type === 'holiday') {
                needsSave = true;
                return {
                    ...ev,
                    type: 'academic',
                    description: 'Institute Event (Instructional / Working Day)'
                };
            }
            return ev;
        });

        if (needsSave) {
            await DB.saveEvents(loadedEvents);
        }

        // Auto-import academic calendar if not present
        const hasAcademicEvents = loadedEvents.some(e => e.type === 'holiday' || e.type === 'exam' || e.type === 'academic');
        if (!hasAcademicEvents) {
            await importAcademicCalendar(true);
            loadedEvents = await DB.getEvents();
        }

        setEvents(loadedEvents);
        setSubjects(loadedSubjects);
        setTimetable(loadedTimetable);
        setDateOverrides(loadedOverrides);
        if (loadedSubjects.length > 0 && !selectedSubjectId) {
            setSelectedSubjectId(loadedSubjects[0].id);
        }
    };

    const getDayName = (dateStr) => {
        // Special Academic Timetable Overrides (e.g. Nov 5, 2026 runs Friday timetable per NITC calendar)
        if (dateStr === '2026-11-05') {
            return 'Friday';
        }
        try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const d = new Date(year, month, day);
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                return dayNames[d.getDay()];
            }
        } catch (e) {}
        return '';
    };

    /**
     * Schedule local push notifications starting 3 days prior to target date
     */
    const scheduleEventNotifications = async (eventTitle, subjectName, dateStr) => {
        const notifIds = [];
        try {
            const targetDate = new Date(`${dateStr}T09:00:00`);
            const now = new Date();

            // Schedule for 3 days before, 2 days before, and 1 day before
            const daysBeforeList = [3, 2, 1];

            for (const daysBefore of daysBeforeList) {
                const notifDate = new Date(targetDate.getTime());
                notifDate.setDate(notifDate.getDate() - daysBefore);

                // Only schedule if the notification date/time is in the future
                if (notifDate > now) {
                    const id = await Notifications.scheduleNotificationAsync({
                        content: {
                            title: `⏰ Upcoming: ${eventTitle}`,
                            body: `${subjectName || 'Schedule'} is due in ${daysBefore} day${daysBefore > 1 ? 's' : ''}! (${dateStr})`,
                            sound: true,
                        },
                        trigger: {
                            type: Notifications.SchedulableTriggerInputTypes?.DATE || 'date',
                            date: notifDate,
                        },
                    });
                    notifIds.push(id);
                }
            }
        } catch (e) {
            console.error('Error scheduling notification', e);
        }
        return notifIds;
    };

    const handleAddEvent = async () => {
        if (!title.trim()) {
            Alert.alert('Incomplete Form', 'Please supply a task title (e.g. CA2 Exam / Workout).');
            return;
        }

        const isAcademic = taskCategory === 'academic';
        const finalSubjectId = isAcademic ? selectedSubjectId : null;
        const subject = isAcademic ? subjects.find(s => s.id === finalSubjectId) : null;
        const notifIds = await scheduleEventNotifications(title.trim(), subject ? subject.name : (isAcademic ? 'Academic' : 'Personal Task'), selectedDate);

        const newEvent = {
            id: DB.generateUUID(),
            subjectId: finalSubjectId,
            category: taskCategory,
            date: selectedDate,
            title: title.trim(),
            description: description.trim(),
            completed: false,
            notificationIds: notifIds
        };

        const updated = [...events, newEvent];
        await DB.saveEvents(updated);

        setTitle('');
        setDescription('');
        setTaskCategory('academic');
        setSelectedSubjectId('');
        setSheetVisible(false);
        loadData();
    };

    const handleToggleComplete = async (eventId) => {
        const updated = events.map(ev => {
            if (ev.id === eventId) {
                const newCompleted = !ev.completed;
                // If marking as completed, cancel pending notifications for this event
                if (newCompleted && ev.notificationIds && ev.notificationIds.length > 0) {
                    ev.notificationIds.forEach(async (notifId) => {
                        try {
                            await Notifications.cancelScheduledNotificationAsync(notifId);
                        } catch (e) {
                            // Notification may have already fired
                        }
                    });
                }
                return { ...ev, completed: newCompleted };
            }
            return ev;
        });

        await DB.saveEvents(updated);
        setEvents(updated);
    };

    const handleDeleteEvent = (eventId, eventTitle) => {
        Alert.alert(
            'Delete Schedule',
            `Remove "${eventTitle}" permanently?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const targetEv = events.find(ev => ev.id === eventId);
                        if (targetEv && targetEv.notificationIds) {
                            targetEv.notificationIds.forEach(async (notifId) => {
                                try {
                                    await Notifications.cancelScheduledNotificationAsync(notifId);
                                } catch (e) {}
                            });
                        }
                        const filtered = events.filter(ev => ev.id !== eventId);
                        await DB.saveEvents(filtered);
                        setEvents(filtered);
                    }
                }
            ]
        );
    };

    // --- Date Timetable Override Handlers ---
    const isDateOverrideActive = !!(dateOverrides && dateOverrides[selectedDate] && Array.isArray(dateOverrides[selectedDate]));

    const handleOpenAddDateSlot = (defaultHour = 8) => {
        setEditingDateSlotId(null);
        setSlotStartHour(defaultHour);
        setSlotEndHour(defaultHour + 1);
        if (subjects.length > 0) {
            setSlotSubjectId(subjects[0].id);
        } else {
            setSlotSubjectId('');
        }
        setSlotRoom('');
        setSlotNotes('');
        setDateSlotSheetVisible(true);
    };

    const handleOpenEditDateSlot = (slot) => {
        setEditingDateSlotId(slot.id);
        setSlotStartHour(slot.startHour);
        setSlotEndHour(slot.endHour);
        setSlotSubjectId(slot.subjectId);
        setSlotRoom(slot.room || '');
        setSlotNotes(slot.notes || '');
        setDateSlotSheetVisible(true);
    };

    const handleSaveDateSlot = async () => {
        if (!slotSubjectId) {
            Alert.alert('Selection Required', 'Please select a subject first.');
            return;
        }

        if (slotEndHour <= slotStartHour) {
            Alert.alert('Invalid Hours', 'End hour must be after start hour.');
            return;
        }

        const selectedDayName = getDayName(selectedDate);
        let currentSlots = isDateOverrideActive
            ? [...(dateOverrides[selectedDate] || [])]
            : [...timetable.filter(s => s.day === selectedDayName).map(s => ({ ...s, id: DB.generateUUID() }))];

        const overlap = currentSlots.some(slot => {
            if (editingDateSlotId && slot.id === editingDateSlotId) return false;
            return slotStartHour < slot.endHour && slotEndHour > slot.startHour;
        });

        if (overlap) {
            Alert.alert('Time Overlap', 'This slot overlaps with another class already scheduled on this date.');
            return;
        }

        const newSlot = {
            id: editingDateSlotId || DB.generateUUID(),
            startHour: slotStartHour,
            endHour: slotEndHour,
            subjectId: slotSubjectId,
            room: slotRoom.trim(),
            notes: slotNotes.trim()
        };

        if (editingDateSlotId) {
            const idx = currentSlots.findIndex(s => s.id === editingDateSlotId);
            if (idx !== -1) currentSlots[idx] = newSlot;
            else currentSlots.push(newSlot);
        } else {
            currentSlots.push(newSlot);
        }

        await DB.saveDateOverride(selectedDate, currentSlots);
        setDateSlotSheetVisible(false);
        await loadData();
        if (onRefreshRequest) onRefreshRequest();
    };

    const handleDeleteDateSlot = async () => {
        if (!editingDateSlotId) return;

        const selectedDayName = getDayName(selectedDate);
        let currentSlots = isDateOverrideActive
            ? [...(dateOverrides[selectedDate] || [])]
            : timetable.filter(s => s.day === selectedDayName).map(s => ({ ...s, id: DB.generateUUID() }));

        currentSlots = currentSlots.filter(s => s.id !== editingDateSlotId);

        // Save currentSlots as override for selectedDate (even if empty [])
        await DB.saveDateOverride(selectedDate, currentSlots);

        setDateSlotSheetVisible(false);
        await loadData();
        if (onRefreshRequest) onRefreshRequest();
    };

    const handleDeleteSingleSlotForDate = async (slotToDelete) => {
        const selectedDayName = getDayName(selectedDate);
        let currentSlots = isDateOverrideActive
            ? [...(dateOverrides[selectedDate] || [])]
            : timetable.filter(s => s.day === selectedDayName).map(s => ({ ...s, id: DB.generateUUID() }));

        currentSlots = currentSlots.filter(s => 
            s.id !== slotToDelete.id && 
            !(s.startHour === slotToDelete.startHour && s.endHour === slotToDelete.endHour && s.subjectId === slotToDelete.subjectId)
        );

        // Save currentSlots as override for selectedDate
        await DB.saveDateOverride(selectedDate, currentSlots);
        await loadData();
        if (onRefreshRequest) onRefreshRequest();
    };

    const handleResetDateSchedule = () => {
        Alert.alert(
            'Reset Date Timetable',
            `Reset timetable for ${selectedDate} back to regular ${getDayName(selectedDate)} schedule?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset Schedule',
                    style: 'destructive',
                    onPress: async () => {
                        await DB.deleteDateOverride(selectedDate);
                        await loadData();
                        if (onRefreshRequest) onRefreshRequest();
                    }
                }
            ]
        );
    };

    // Construct markedDates object for react-native-calendars
    const markedDates = {};
    events.forEach(ev => {
        const sub = subjects.find(s => s.id === ev.subjectId);
        let dotColor = sub ? sub.color : colors.gold;
        if (ev.type === 'holiday') dotColor = '#EF4444';
        if (ev.type === 'exam') dotColor = '#8B5CF6';
        if (ev.type === 'academic') dotColor = '#3B82F6';

        if (!markedDates[ev.date]) {
            markedDates[ev.date] = {
                dots: [{ key: ev.id, color: dotColor }]
            };
        } else {
            const existingDots = markedDates[ev.date].dots || [];
            if (existingDots.length < 3) {
                markedDates[ev.date].dots = [...existingDots, { key: ev.id, color: dotColor }];
            }
        }
    });

    // Highlight dates with custom timetable overrides
    Object.keys(dateOverrides).forEach(dStr => {
        if (dateOverrides[dStr] && dateOverrides[dStr].length > 0) {
            if (!markedDates[dStr]) {
                markedDates[dStr] = { dots: [{ key: `override-${dStr}`, color: colors.gold }] };
            } else {
                const existing = markedDates[dStr].dots || [];
                if (existing.length < 3 && !existing.some(d => d.key && String(d.key).startsWith('override'))) {
                    markedDates[dStr].dots = [...existing, { key: `override-${dStr}`, color: colors.gold }];
                }
            }
        }
    });

    // Apply selection highlighting
    markedDates[selectedDate] = {
        ...(markedDates[selectedDate] || {}),
        selected: true,
        selectedColor: colors.gold,
        selectedTextColor: colors.cream,
    };

    // Filter events for selected date
    const selectedDayEvents = events.filter(ev => ev.date === selectedDate);
    const academicEvents = selectedDayEvents.filter(ev => ev.type === 'holiday' || ev.type === 'exam' || ev.type === 'academic');
    const personalTasks = selectedDayEvents.filter(ev => ev.type !== 'holiday' && ev.type !== 'exam' && ev.type !== 'academic');
    const isHoliday = academicEvents.some(ev => ev.type === 'holiday');

    // Filter timetable classes (check single-day date override first!)
    const selectedDayName = getDayName(selectedDate);
    const dayClasses = isDateOverrideActive
        ? [...dateOverrides[selectedDate]].sort((a, b) => a.startHour - b.startHour)
        : timetable
            .filter(slot => slot.day === selectedDayName)
            .sort((a, b) => a.startHour - b.startHour);

    const formatHour = (h) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const display = h % 12 === 0 ? 12 : h % 12;
        return `${display}:00 ${ampm}`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Calendar & Schedule</Text>
                    <Text style={styles.subtext}>Daily timetable & task reminders</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity 
                        style={[styles.addButton, { backgroundColor: colors.bgTertiary, borderBottomColor: colors.gold }]}
                        onPress={() => importAcademicCalendar(false)}
                    >
                        <Text style={[styles.addButtonText, { color: colors.cream }]}>🗓️ Sync Cal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.addButton}
                        onPress={() => setSheetVisible(true)}
                    >
                        <Text style={styles.addButtonText}>+ Add Task</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Calendar Component */}
                <View style={styles.calendarWrapper}>
                    <Calendar
                        current={selectedDate}
                        onDayPress={(day) => setSelectedDate(day.dateString)}
                        markingType={'multi-dot'}
                        markedDates={markedDates}
                        theme={{
                            calendarBackground: colors.bgSecondary,
                            textSectionTitleColor: colors.textSecondary,
                            selectedDayBackgroundColor: colors.gold,
                            selectedDayTextColor: colors.cream,
                            todayTextColor: colors.gold,
                            dayTextColor: colors.cream,
                            textDisabledColor: colors.textMuted,
                            monthTextColor: colors.cream,
                            indicatorColor: colors.gold,
                            arrowColor: colors.gold,
                            textDayFontFamily: fonts.body,
                            textMonthFontFamily: fonts.headingBold,
                            textDayHeaderFontFamily: fonts.heading,
                            textDayFontSize: 14,
                            textMonthFontSize: 16,
                            textDayHeaderFontSize: 12,
                        }}
                        style={styles.calendarStyle}
                    />
                </View>

                {/* 1. Academic Events & Holidays Section (Above Timetable) */}
                {academicEvents.length > 0 && (
                    <View style={{ marginBottom: 20 }}>
                        <View style={styles.daySectionHeader}>
                            <Text style={styles.daySectionTitle}>
                                🏛️ Academic Events & Holidays
                            </Text>
                            <Text style={styles.daySectionCount}>{academicEvents.length} items</Text>
                        </View>

                        {academicEvents.map(ev => {
                            let badgeColor = colors.gold;
                            if (ev.type === 'holiday') badgeColor = '#EF4444';
                            if (ev.type === 'exam') badgeColor = '#8B5CF6';
                            if (ev.type === 'academic') badgeColor = '#3B82F6';

                            return (
                                <View 
                                    key={ev.id} 
                                    style={[styles.eventCard, { borderLeftColor: badgeColor, backgroundColor: colors.bgSecondary }]}
                                >
                                    <View style={styles.eventInfo}>
                                        <View style={styles.eventTitleRow}>
                                            <Text style={styles.eventTitle}>{ev.title}</Text>
                                            <View style={[styles.subjectBadge, { backgroundColor: `${badgeColor}30` }]}>
                                                <Text style={[styles.subjectBadgeText, { color: colors.gold, textTransform: 'capitalize' }]}>
                                                    {ev.type === 'academic' ? 'Working Day' : ev.type}
                                                </Text>
                                            </View>
                                        </View>
                                        {ev.description ? (
                                            <Text style={[styles.eventDesc, { color: colors.gold, marginTop: 4 }]}>{ev.description}</Text>
                                        ) : null}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* 2. Day Timetable Section */}
                <View style={styles.daySectionHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.daySectionTitle}>
                                📖 Classes for {selectedDate === '2026-11-05' ? 'Friday (Nov 5 Override)' : (selectedDayName || 'Selected Day')}
                            </Text>
                            {isDateOverrideActive && (
                                <View style={{ backgroundColor: 'rgba(236, 200, 117, 0.2)', borderColor: colors.gold, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                    <Text style={{ color: colors.gold, fontFamily: fonts.headingBold, fontSize: 10 }}>⚡ Custom Date Schedule</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.daySectionCount}>
                            {selectedDate} • {isHoliday ? 'Holiday' : `${dayClasses.length} sessions`}
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        {isDateOverrideActive && (
                            <TouchableOpacity 
                                style={[styles.addButton, { backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 12, paddingVertical: 6 }]}
                                onPress={handleResetDateSchedule}
                            >
                                <Text style={{ color: '#EF4444', fontFamily: fonts.headingBold, fontSize: 11 }}>🔄 Reset</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            style={[styles.addButton, { paddingHorizontal: 12, paddingVertical: 6 }]}
                            onPress={() => handleOpenAddDateSlot(8)}
                        >
                            <Text style={[styles.addButtonText, { fontSize: 11 }]}>+ Add Class</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {isHoliday ? (
                    <View style={[styles.emptyContainer, { borderColor: '#EF444440', backgroundColor: '#EF444410' }]}>
                        <Text style={[styles.emptyTitle, { color: '#EF4444' }]}>🌴 Holiday - No Classes Scheduled</Text>
                        <Text style={styles.emptyDesc}>Regular timetable classes are suspended for this holiday.</Text>
                    </View>
                ) : dayClasses.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>No classes on {selectedDate}</Text>
                        <Text style={styles.emptyDesc}>Tap "+ Add Class" to set up classes specifically for this date.</Text>
                    </View>
                ) : (
                    dayClasses.map(slot => {
                        const subject = subjects.find(s => s.id === slot.subjectId);
                        const subColor = subject ? subject.color : colors.gold;

                        const now = new Date();
                        const isSelectedDateToday = selectedDate === todayStr;
                        const currentHour = now.getHours();
                        const isCompleted = isSelectedDateToday && currentHour >= slot.endHour;
                        const isLive = isSelectedDateToday && currentHour >= slot.startHour && currentHour < slot.endHour;

                        const accentColor = subColor;

                        return (
                            <View 
                                key={slot.id} 
                                style={[styles.classCard, { borderLeftColor: accentColor }]}
                            >
                                <View style={styles.classTimeBox}>
                                    {isCompleted ? (
                                        <Text style={[styles.classTimeText, { fontSize: 18, color: colors.gold }]}>✓</Text>
                                    ) : (
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={styles.classTimeText}>{formatHour(slot.startHour)}</Text>
                                            <Text style={styles.classTimeSub}>to</Text>
                                            <Text style={styles.classTimeText}>{formatHour(slot.endHour)}</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.classInfo}>
                                    <View style={styles.classTitleRow}>
                                        <Text style={styles.classNameText}>
                                            {subject ? subject.name : 'Class'}
                                        </Text>
                                        {subject && (
                                            <View style={[styles.subjectBadge, { backgroundColor: `${subColor}20` }]}>
                                                <Text style={[styles.subjectBadgeText, { color: accentColor }]}>
                                                    {isLive ? `🔴 LIVE` : subject.shortName}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    {slot.room ? <Text style={styles.classMetaText}>📍 {slot.room}</Text> : null}
                                    {slot.notes ? <Text style={styles.classMetaText}>📝 {slot.notes}</Text> : null}
                                </View>

                                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginLeft: 6 }}>
                                    <TouchableOpacity 
                                        style={{ padding: 6, backgroundColor: colors.bgTertiary, borderRadius: 8 }}
                                        onPress={() => handleOpenEditDateSlot(slot)}
                                    >
                                        <Text style={{ fontSize: 12 }}>✏️</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={{ padding: 6, backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: 8 }}
                                        onPress={() => {
                                            Alert.alert(
                                                'Cancel Class for Date',
                                                `Remove "${subject ? subject.name : 'Class'}" for ${selectedDate} only?`,
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    {
                                                        text: 'Remove for Date',
                                                        style: 'destructive',
                                                        onPress: () => handleDeleteSingleSlotForDate(slot)
                                                    }
                                                ]
                                            );
                                        }}
                                    >
                                        <Text style={{ fontSize: 12 }}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                )}

                {/* 3. Personal Tasks & Deadlines Header */}
                <View style={[styles.daySectionHeader, { marginTop: 24 }]}>
                    <Text style={styles.daySectionTitle}>
                        ⏰ Personal Tasks & Reminders ({selectedDate === todayStr ? 'Today' : selectedDate})
                    </Text>
                    <Text style={styles.daySectionCount}>{personalTasks.length} items</Text>
                </View>

                {/* Personal Tasks List */}
                {personalTasks.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>No personal tasks for this date</Text>
                        <Text style={styles.emptyDesc}>Tap "+ Add Task" to schedule a personal study goal or task.</Text>
                    </View>
                ) : (
                    personalTasks.map(ev => {
                        const subject = subjects.find(s => s.id === ev.subjectId);
                        const subColor = subject ? subject.color : colors.gold;

                        return (
                            <View 
                                key={ev.id} 
                                style={[
                                    styles.eventCard, 
                                    { borderLeftColor: subColor },
                                    ev.completed && styles.eventCardCompleted
                                ]}
                            >
                                <TouchableOpacity 
                                    style={[
                                        styles.checkbox,
                                        ev.completed && styles.checkboxActive
                                    ]}
                                    onPress={() => handleToggleComplete(ev.id)}
                                >
                                    <Text style={styles.checkboxCheck}>{ev.completed ? '✓' : ''}</Text>
                                </TouchableOpacity>

                                <View style={styles.eventInfo}>
                                    <View style={styles.eventTitleRow}>
                                        <Text 
                                            style={[
                                                styles.eventTitle,
                                                ev.completed && styles.strikethroughText
                                            ]}
                                        >
                                            {ev.title}
                                        </Text>
                                        {subject ? (
                                            <View style={[styles.subjectBadge, { backgroundColor: `${subColor}20` }]}>
                                                <Text style={[styles.subjectBadgeText, { color: subColor }]}>
                                                    {subject.shortName}
                                                </Text>
                                            </View>
                                        ) : (
                                            <View style={[styles.subjectBadge, { backgroundColor: 'rgba(236, 200, 117, 0.15)' }]}>
                                                <Text style={[styles.subjectBadgeText, { color: colors.gold }]}>
                                                    📌 Non-Academic
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {ev.description ? (
                                        <Text 
                                            style={[
                                                styles.eventSubtext,
                                                ev.completed && styles.strikethroughText
                                            ]}
                                        >
                                            {ev.description}
                                        </Text>
                                    ) : null}
                                </View>

                                <TouchableOpacity 
                                    style={styles.deleteButton}
                                    onPress={() => handleDeleteEvent(ev.id, ev.title)}
                                >
                                    <Text style={styles.deleteButtonText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* Bottom Sheet Form for Adding Task */}
            <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)}>
                <Text style={styles.sheetTitle}>Schedule Task / Deadline</Text>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Scheduled Date</Text>
                    <Text style={styles.dateDisplay}>{selectedDate}</Text>
                </View>

                {/* Category Dropdown Menu */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Category</Text>
                    <TouchableOpacity
                        style={[
                            styles.dropdownHeader,
                            categoryDropdownOpen && styles.dropdownHeaderOpen
                        ]}
                        onPress={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                        activeOpacity={0.8}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Text style={{ fontSize: 16 }}>
                                {taskCategory === 'academic' ? '🎓' : '📌'}
                            </Text>
                            <Text style={styles.dropdownHeaderText}>
                                {taskCategory === 'academic' ? 'Academic Task' : 'Non-Academic Task'}
                            </Text>
                        </View>
                        <Text style={styles.dropdownChevron}>
                            {categoryDropdownOpen ? '▲' : '▼'}
                        </Text>
                    </TouchableOpacity>

                    {categoryDropdownOpen && (
                        <View style={styles.dropdownList}>
                            <TouchableOpacity
                                style={[
                                    styles.dropdownItem,
                                    taskCategory === 'academic' && styles.dropdownItemActive
                                ]}
                                onPress={() => {
                                    setTaskCategory('academic');
                                    setCategoryDropdownOpen(false);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={{ fontSize: 18 }}>🎓</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.dropdownItemTitle, taskCategory === 'academic' && styles.dropdownItemTitleActive]}>
                                        Academic Task
                                    </Text>
                                    <Text style={styles.dropdownItemSubtitle}>
                                        Assignments, exams, lab reports & quizzes
                                    </Text>
                                </View>
                                {taskCategory === 'academic' && (
                                    <Text style={{ color: colors.gold, fontWeight: 'bold' }}>✓</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.dropdownDivider} />

                            <TouchableOpacity
                                style={[
                                    styles.dropdownItem,
                                    taskCategory === 'non-academic' && styles.dropdownItemActive
                                ]}
                                onPress={() => {
                                    setTaskCategory('non-academic');
                                    setSelectedSubjectId('');
                                    setCategoryDropdownOpen(false);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={{ fontSize: 18 }}>📌</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.dropdownItemTitle, taskCategory === 'non-academic' && styles.dropdownItemTitleActive]}>
                                        Non-Academic Task
                                    </Text>
                                    <Text style={styles.dropdownItemSubtitle}>
                                        Personal goals, club events, workout & errands
                                    </Text>
                                </View>
                                {taskCategory === 'non-academic' && (
                                    <Text style={{ color: colors.gold, fontWeight: 'bold' }}>✓</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Conditional Subject Picker (Only when Academic is selected) */}
                {taskCategory === 'academic' && (
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Select Subject</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectPills}>
                            {subjects.map(s => (
                                <TouchableOpacity
                                    key={s.id}
                                    style={[
                                        styles.subjectPill,
                                        selectedSubjectId === s.id && { backgroundColor: s.color }
                                    ]}
                                    onPress={() => setSelectedSubjectId(s.id)}
                                >
                                    <Text 
                                        style={[
                                            styles.subjectPillText,
                                            selectedSubjectId === s.id && styles.subjectPillTextActive
                                        ]}
                                    >
                                        {s.name} ({s.shortName})
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Task Title</Text>
                    <TextInput 
                        style={styles.input}
                        placeholder={taskCategory === 'academic' ? "e.g. CA2 Mid-Term Exam / Lab Report" : "e.g. Club Meeting / Gym / Laundry"}
                        placeholderTextColor={colors.textMuted}
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Description / Notes (Optional)</Text>
                    <TextInput 
                        style={[styles.input, styles.textArea]}
                        placeholder="e.g. Bring scientific calculator & ID card"
                        placeholderTextColor={colors.textMuted}
                        multiline
                        numberOfLines={3}
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <View style={styles.sheetActions}>
                    <TouchableOpacity 
                        style={styles.cancelBtn}
                        onPress={() => setSheetVisible(false)}
                    >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.saveBtn}
                        onPress={handleAddEvent}
                    >
                        <Text style={styles.saveBtnText}>Save Task</Text>
                    </TouchableOpacity>
                </View>
            </BottomSheet>

            {/* Bottom Sheet Form for Single-Day Timetable Slot */}
            <BottomSheet visible={dateSlotSheetVisible} onClose={() => setDateSlotSheetVisible(false)}>
                <Text style={styles.sheetTitle}>
                    {editingDateSlotId ? 'Modify Class for Date' : 'Add Class for Date'}
                </Text>
                <Text style={{ color: colors.gold, fontFamily: fonts.heading, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
                    🗓️ {selectedDate} ({selectedDayName}) • Single-Day Customization
                </Text>

                {/* Subject Selector */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Choose Subject</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectPills}>
                        {subjects.map(s => (
                            <TouchableOpacity
                                key={s.id}
                                style={[
                                    styles.subjectPill,
                                    slotSubjectId === s.id && { backgroundColor: s.color }
                                ]}
                                onPress={() => setSlotSubjectId(s.id)}
                            >
                                <Text 
                                    style={[
                                        styles.subjectPillText,
                                        slotSubjectId === s.id && styles.subjectPillTextActive
                                    ]}
                                >
                                    {s.name} ({s.shortName})
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Hour Selectors */}
                <View style={styles.rowForm}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Starts At (Hour 8-17)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="number-pad"
                            value={String(slotStartHour)}
                            onChangeText={val => {
                                const h = parseInt(val, 10);
                                if (!isNaN(h)) {
                                    setSlotStartHour(h);
                                    if (slotEndHour <= h) setSlotEndHour(h + 1);
                                }
                            }}
                        />
                    </View>
                    <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
                        <Text style={styles.label}>Ends At (Hour 9-18)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="number-pad"
                            value={String(slotEndHour)}
                            onChangeText={val => {
                                const h = parseInt(val, 10);
                                if (!isNaN(h)) setSlotEndHour(h);
                            }}
                        />
                    </View>
                </View>

                {/* Room Location */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Room / Location</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. NLHC 201"
                        placeholderTextColor={colors.textMuted}
                        value={slotRoom}
                        onChangeText={setSlotRoom}
                    />
                </View>

                {/* Additional Notes */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Notes (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Extra tutorial session"
                        placeholderTextColor={colors.textMuted}
                        value={slotNotes}
                        onChangeText={setSlotNotes}
                    />
                </View>

                <View style={styles.sheetActions}>
                    {editingDateSlotId && (
                        <TouchableOpacity 
                            style={[styles.cancelBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', marginRight: 'auto' }]}
                            onPress={handleDeleteDateSlot}
                        >
                            <Text style={{ color: '#EF4444', fontFamily: fonts.headingBold, fontSize: 13 }}>Delete</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                        style={styles.cancelBtn}
                        onPress={() => setDateSlotSheetVisible(false)}
                    >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.saveBtn}
                        onPress={handleSaveDateSlot}
                    >
                        <Text style={styles.saveBtnText}>Save for {selectedDate}</Text>
                    </TouchableOpacity>
                </View>
            </BottomSheet>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
    },
    title: {
        fontFamily: fonts.headingBold,
        fontSize: 26,
        color: colors.cream,
    },
    subtext: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textSecondary,
    },
    addButton: {
        backgroundColor: colors.gold,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
    },
    addButtonText: {
        fontFamily: fonts.headingBold,
        fontSize: 13,
        color: colors.cream,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    calendarWrapper: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
        marginBottom: 20,
    },
    calendarStyle: {
        borderRadius: 24,
        paddingBottom: 10,
    },
    daySectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    daySectionTitle: {
        fontFamily: fonts.headingBold,
        fontSize: 18,
        color: colors.cream,
    },
    daySectionCount: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textMuted,
    },
    emptyContainer: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
        borderStyle: 'dashed',
        borderRadius: 20,
        paddingVertical: 36,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    emptyTitle: {
        fontFamily: fonts.heading,
        fontSize: 15,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    emptyDesc: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
    },
    classCard: {
        backgroundColor: colors.bgSecondary,
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.02)',
    },
    classTimeBox: {
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
        marginRight: 12,
        minWidth: 80,
    },
    classTimeText: {
        fontFamily: fonts.headingBold,
        fontSize: 12,
        color: colors.gold,
    },
    classTimeSub: {
        fontFamily: fonts.heading,
        fontSize: 10,
        color: colors.textSecondary,
        marginVertical: 1,
    },
    classInfo: {
        flex: 1,
    },
    classTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    classNameText: {
        fontFamily: fonts.headingBold,
        fontSize: 15,
        color: colors.cream,
        flex: 1,
        marginRight: 6,
    },
    classMetaText: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    eventCard: {
        backgroundColor: colors.bgSecondary,
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.02)',
    },
    eventCardCompleted: {
        opacity: 0.55,
        backgroundColor: colors.bgTertiary,
    },
    checkbox: {
        width: 26,
        height: 26,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: colors.gold,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    checkboxActive: {
        backgroundColor: colors.gold,
    },
    checkboxCheck: {
        color: colors.cream,
        fontFamily: fonts.headingBold,
        fontSize: 14,
    },
    eventInfo: {
        flex: 1,
    },
    eventTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    eventTitle: {
        fontFamily: fonts.headingBold,
        fontSize: 15,
        color: colors.cream,
        flex: 1,
        marginRight: 6,
    },
    strikethroughText: {
        textDecorationLine: 'line-through',
        color: colors.textMuted,
    },
    subjectBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    subjectBadgeText: {
        fontFamily: fonts.headingBold,
        fontSize: 10,
    },
    eventDesc: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    eventFooter: {
        marginTop: 2,
    },
    reminderNotice: {
        fontFamily: fonts.body,
        fontSize: 10,
        color: colors.gold,
        opacity: 0.8,
    },
    deleteBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    deleteText: {
        color: colors.textMuted,
        fontSize: 16,
        marginTop: -2,
    },
    sheetTitle: {
        fontFamily: fonts.headingBold,
        fontSize: 18,
        color: colors.cream,
        textAlign: 'center',
        marginBottom: 16,
    },
    formGroup: {
        marginBottom: 14,
    },
    label: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    dateDisplay: {
        fontFamily: fonts.headingBold,
        fontSize: 16,
        color: colors.gold,
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },
    dropdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.bgTertiary,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    dropdownHeaderOpen: {
        borderColor: colors.gold,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        backgroundColor: 'rgba(236, 200, 117, 0.1)',
    },
    dropdownHeaderText: {
        fontFamily: fonts.headingBold,
        fontSize: 14,
        color: colors.cream,
    },
    dropdownChevron: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.gold,
    },
    dropdownList: {
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: colors.gold,
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: colors.bgSecondary,
    },
    dropdownItemActive: {
        backgroundColor: 'rgba(236, 200, 117, 0.15)',
    },
    dropdownItemTitle: {
        fontFamily: fonts.heading,
        fontSize: 13,
        color: colors.cream,
    },
    dropdownItemTitleActive: {
        fontFamily: fonts.headingBold,
        color: colors.gold,
    },
    dropdownItemSubtitle: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 1,
    },
    dropdownDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    subjectPills: {
        flexDirection: 'row',
        gap: 8,
    },
    subjectPill: {
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
    },
    subjectPillText: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.cream,
    },
    subjectPillTextActive: {
        color: colors.cream,
        fontFamily: fonts.headingBold,
    },
    input: {
        backgroundColor: colors.bgTertiary,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: colors.cream,
        fontFamily: fonts.body,
        fontSize: 14,
    },
    textArea: {
        height: 70,
        textAlignVertical: 'top',
    },
    sheetActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 16,
    },
    cancelBtn: {
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    cancelBtnText: {
        fontFamily: fonts.heading,
        fontSize: 13,
        color: colors.cream,
    },
    saveBtn: {
        backgroundColor: colors.gold,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    saveBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 13,
        color: colors.cream,
    }
});
