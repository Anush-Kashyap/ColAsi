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
    { date: '2026-09-01', title: '🏛️ Institute Foundation Day', description: 'Institute Event', type: 'holiday' },
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
    const [sheetVisible, setSheetVisible] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');

    useEffect(() => {
        loadData();
    }, [refreshTrigger]);

    const importAcademicCalendar = async (quiet = false) => {
        const currentEvents = await DB.getEvents();
        let addedCount = 0;
        let updatedEvents = [...currentEvents];

        for (const item of NITC_ACADEMIC_CALENDAR_2026) {
            const exists = updatedEvents.some(e => e.date === item.date && e.title === item.title);
            if (!exists) {
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

        // Auto-import academic calendar if not present
        const hasAcademicEvents = loadedEvents.some(e => e.type === 'holiday' || e.type === 'exam' || e.type === 'academic');
        if (!hasAcademicEvents) {
            await importAcademicCalendar(true);
            loadedEvents = await DB.getEvents();
        }

        setEvents(loadedEvents);
        setSubjects(loadedSubjects);
        setTimetable(loadedTimetable);
        if (loadedSubjects.length > 0 && !selectedSubjectId) {
            setSelectedSubjectId(loadedSubjects[0].id);
        }
    };

    const getDayName = (dateStr) => {
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
            Alert.alert('Incomplete Form', 'Please supply an event title (e.g. CA2 Exam).');
            return;
        }

        const subject = subjects.find(s => s.id === selectedSubjectId);
        const notifIds = await scheduleEventNotifications(title.trim(), subject ? subject.name : '', selectedDate);

        const newEvent = {
            id: DB.generateUUID(),
            subjectId: selectedSubjectId,
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
            // Add dot if not duplicate
            const existingDots = markedDates[ev.date].dots || [];
            if (existingDots.length < 3) {
                markedDates[ev.date].dots = [...existingDots, { key: ev.id, color: dotColor }];
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

    // Filter timetable classes for selected date's day of week
    const selectedDayName = getDayName(selectedDate);
    const dayClasses = timetable
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
                <View style={{ flexDirection: 'row', gap: 6 }}>
                    {selectedDate !== todayStr && (
                        <TouchableOpacity 
                            style={[styles.addButton, { backgroundColor: colors.bgTertiary }]}
                            onPress={() => setSelectedDate(todayStr)}
                        >
                            <Text style={[styles.addButtonText, { color: colors.gold }]}>Today</Text>
                        </TouchableOpacity>
                    )}
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
                                                    {ev.type}
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

                {/* 2. Day Timetable Section (Hidden if isHoliday) */}
                <View style={styles.daySectionHeader}>
                    <Text style={styles.daySectionTitle}>
                        📖 Classes for {selectedDayName || 'Selected Day'}
                    </Text>
                    <Text style={styles.daySectionCount}>{isHoliday ? 'Holiday' : `${dayClasses.length} sessions`}</Text>
                </View>

                {isHoliday ? (
                    <View style={[styles.emptyContainer, { borderColor: '#EF444440', backgroundColor: '#EF444410' }]}>
                        <Text style={[styles.emptyTitle, { color: '#EF4444' }]}>🌴 Holiday - No Classes Scheduled</Text>
                        <Text style={styles.emptyDesc}>Regular timetable classes are suspended for this holiday.</Text>
                    </View>
                ) : dayClasses.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>No classes on {selectedDayName || 'this day'}</Text>
                        <Text style={styles.emptyDesc}>Use the Schedule tab to add recurring timetable slots for {selectedDayName || 'this day'}.</Text>
                    </View>
                ) : (
                    dayClasses.map(slot => {
                        const subject = subjects.find(s => s.id === slot.subjectId);
                        const subColor = subject ? subject.color : colors.gold;

                        return (
                            <View key={slot.id} style={[styles.classCard, { borderLeftColor: subColor }]}>
                                <View style={styles.classTimeBox}>
                                    <Text style={styles.classTimeText}>{formatHour(slot.startHour)}</Text>
                                    <Text style={styles.classTimeSub}>to {formatHour(slot.endHour)}</Text>
                                </View>

                                <View style={styles.classInfo}>
                                    <View style={styles.classTitleRow}>
                                        <Text style={styles.classNameText}>{subject ? subject.name : 'Class'}</Text>
                                        {subject && (
                                            <View style={[styles.subjectBadge, { backgroundColor: `${subColor}20` }]}>
                                                <Text style={[styles.subjectBadgeText, { color: subColor }]}>
                                                    {subject.shortName}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    {slot.room ? <Text style={styles.classMetaText}>📍 {slot.room}</Text> : null}
                                    {slot.notes ? <Text style={styles.classMetaText}>📝 {slot.notes}</Text> : null}
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
                                        {subject && (
                                            <View style={[styles.subjectBadge, { backgroundColor: `${subColor}20` }]}>
                                                <Text style={[styles.subjectBadgeText, { color: subColor }]}>
                                                    {subject.shortName}
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

            {/* Bottom Sheet Form for Adding Event */}
            <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)}>
                <Text style={styles.sheetTitle}>Schedule Task / Deadline</Text>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Scheduled Date</Text>
                    <Text style={styles.dateDisplay}>{selectedDate}</Text>
                </View>

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

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Task Title</Text>
                    <TextInput 
                        style={styles.input}
                        placeholder="e.g. CA2 Mid-Term Exam / Lab Report"
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
        minWidth: 76,
    },
    classTimeText: {
        fontFamily: fonts.headingBold,
        fontSize: 12,
        color: colors.gold,
    },
    classTimeSub: {
        fontFamily: fonts.body,
        fontSize: 10,
        color: colors.textMuted,
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
