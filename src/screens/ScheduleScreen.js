/**
 * Cozy Schedule Screen
 * Renders the day capsules, vertical timeline view, weekly grid overlay, and timetable editor form.
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Platform } from 'react-native';
import { colors, fonts } from '../styles/theme';
import * as DB from '../database/storage';
import TimelineSlot from '../components/TimelineSlot';
import BottomSheet from '../components/BottomSheet';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const START_HOUR = 8;
const END_HOUR = 18;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_HEIGHT = 90; // Height of an hour block in the weekly grid

export default function ScheduleScreen({ refreshTrigger, onRefreshRequest }) {
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [subjects, setSubjects] = useState([]);
    const [slots, setSlots] = useState([]);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [gridVisible, setGridVisible] = useState(false);

    // Form States
    const [editingSlotId, setEditingSlotId] = useState(null);
    const [day, setDay] = useState('Monday');
    const [startHour, setStartHour] = useState(8);
    const [endHour, setEndHour] = useState(9);
    const [subjectId, setSubjectId] = useState('');
    const [room, setRoom] = useState('');
    const [notes, setNotes] = useState('');

    // Custom Picker Option Lists States (for bottom sheet fields)
    const [pickerType, setPickerType] = useState(null); // 'day' | 'start' | 'end' | 'subject'
    const [pickerVisible, setPickerVisible] = useState(false);

    useEffect(() => {
        loadData();
    }, [refreshTrigger]);

    const loadData = async () => {
        const loadedSubjects = await DB.getSubjects();
        const loadedSlots = await DB.getTimetable();
        setSubjects(loadedSubjects);
        setSlots(loadedSlots);
    };

    const handleOpenAdd = (defaultHour = 8) => {
        setEditingSlotId(null);
        setDay(selectedDay);
        setStartHour(defaultHour);
        setEndHour(defaultHour + 1);
        
        if (subjects.length > 0) {
            setSubjectId(subjects[0].id);
        } else {
            setSubjectId('');
        }
        setRoom('');
        setNotes('');
        setSheetVisible(true);
    };

    const handleOpenEdit = (slot) => {
        setEditingSlotId(slot.id);
        setDay(slot.day);
        setStartHour(slot.startHour);
        setEndHour(slot.endHour);
        setSubjectId(slot.subjectId);
        setRoom(slot.room || '');
        setNotes(slot.notes || '');
        setSheetVisible(true);
    };

    const handleSaveSlot = async () => {
        if (!subjectId) {
            Alert.alert('Selection Required', 'Please choose a subject first.');
            return;
        }

        if (endHour <= startHour) {
            Alert.alert('Invalid Hours', 'End hour must be after start hour.');
            return;
        }

        // Collision Check
        const overlap = slots.some(slot => {
            if (slot.day !== day) return false;
            if (editingSlotId && slot.id === editingSlotId) return false;
            return startHour < slot.endHour && endHour > slot.startHour;
        });

        if (overlap) {
            Alert.alert('Time Overlap Detected', 'This slot overlaps with another class already scheduled on this day.');
            return;
        }

        const newSlot = {
            id: editingSlotId || DB.generateUUID(),
            day,
            startHour,
            endHour,
            subjectId,
            room: room.trim(),
            notes: notes.trim()
        };

        let updatedList = [...slots];
        if (editingSlotId) {
            const idx = slots.findIndex(s => s.id === editingSlotId);
            updatedList[idx] = newSlot;
        } else {
            updatedList.push(newSlot);
        }

        await DB.saveTimetable(updatedList);
        setSheetVisible(false);
        loadData();
        onRefreshRequest();
    };

    const handleDeleteSlot = () => {
        Alert.alert(
            'Confirm Delete',
            'Remove this class from your timetable?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const filtered = slots.filter(s => s.id !== editingSlotId);
                        await DB.saveTimetable(filtered);
                        setSheetVisible(false);
                        loadData();
                        onRefreshRequest();
                    }
                }
            ]
        );
    };

    const formatHour = (h) => {
        if (h === 12) return '12:00 PM';
        if (h > 12) return `${h - 12}:00 PM`;
        return `${h}:00 AM`;
    };

    // Render helper for vertical day timeline
    const renderTimeline = () => {
        const daySlots = slots.filter(s => s.day === selectedDay);
        daySlots.sort((a, b) => a.startHour - b.startHour);

        if (subjects.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>No subjects defined</Text>
                    <Text style={styles.emptyDesc}>Please create subjects in the "Subjects" page before building your timetable.</Text>
                </View>
            );
        }

        const timelineElements = [];
        let currentHour = START_HOUR;

        while (currentHour < END_HOUR) {
            const slot = daySlots.find(s => s.startHour === currentHour);

            if (slot) {
                const subject = subjects.find(sub => sub.id === slot.subjectId);
                if (subject) {
                    const tempSlot = slot;
                    timelineElements.push(
                        <TimelineSlot
                            key={slot.id}
                            slot={slot}
                            subject={subject}
                            onPress={() => handleOpenEdit(tempSlot)}
                        />
                    );
                    currentHour = slot.endHour; // Jump ahead
                } else {
                    timelineElements.push(renderEmptyPeriod(currentHour));
                    currentHour++;
                }
            } else {
                const covered = daySlots.some(s => currentHour >= s.startHour && currentHour < s.endHour);
                if (!covered) {
                    timelineElements.push(renderEmptyPeriod(currentHour));
                }
                currentHour++;
            }
        }

        return timelineElements;
    };

    const renderEmptyPeriod = (hour) => {
        const tempHour = hour;
        return (
            <View key={`empty-${hour}`} style={styles.emptyTimelineSlot}>
                <View style={styles.trackColumn}>
                    <View style={styles.emptyBullet} />
                    <View style={styles.trackLine} />
                </View>
                <View style={styles.emptyCardWrapper}>
                    <Text style={styles.timeLabel}>{formatHour(hour)} - {formatHour(hour + 1)}</Text>
                    <TouchableOpacity 
                        style={styles.emptyCard}
                        onPress={() => handleOpenAdd(tempHour)}
                    >
                        <Text style={styles.emptyCardText}>No class scheduled  •  Tap to add</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Render helper for Custom Selection Dialogs
    const openCustomPicker = (type) => {
        setPickerType(type);
        setPickerVisible(true);
    };

    const handleCustomPickerSelect = (value) => {
        if (pickerType === 'day') {
            setDay(value);
        } else if (pickerType === 'start') {
            const sh = parseInt(value);
            setStartHour(sh);
            if (endHour <= sh) {
                setEndHour(sh + 1);
            }
        } else if (pickerType === 'end') {
            setEndHour(parseInt(value));
        } else if (pickerType === 'subject') {
            setSubjectId(value);
        }
        setPickerVisible(false);
    };

    const renderCustomPickerOptions = () => {
        if (pickerType === 'day') {
            return DAYS.map(d => (
                <TouchableOpacity key={d} style={styles.pickerOption} onPress={() => handleCustomPickerSelect(d)}>
                    <Text style={[styles.pickerOptionText, day === d && styles.pickerOptionTextActive]}>{d}</Text>
                </TouchableOpacity>
            ));
        }
        if (pickerType === 'start') {
            const list = [];
            for (let h = START_HOUR; h < END_HOUR; h++) {
                list.push(
                    <TouchableOpacity key={h} style={styles.pickerOption} onPress={() => handleCustomPickerSelect(h)}>
                        <Text style={[styles.pickerOptionText, startHour === h && styles.pickerOptionTextActive]}>{formatHour(h)}</Text>
                    </TouchableOpacity>
                );
            }
            return list;
        }
        if (pickerType === 'end') {
            const list = [];
            for (let h = startHour + 1; h <= END_HOUR; h++) {
                list.push(
                    <TouchableOpacity key={h} style={styles.pickerOption} onPress={() => handleCustomPickerSelect(h)}>
                        <Text style={[styles.pickerOptionText, endHour === h && styles.pickerOptionTextActive]}>{formatHour(h)}</Text>
                    </TouchableOpacity>
                );
            }
            return list;
        }
        if (pickerType === 'subject') {
            return subjects.map(s => (
                <TouchableOpacity key={s.id} style={styles.pickerOption} onPress={() => handleCustomPickerSelect(s.id)}>
                    <Text style={[styles.pickerOptionText, subjectId === s.id && styles.pickerOptionTextActive]}>{s.name} ({s.shortName})</Text>
                </TouchableOpacity>
            ));
        }
        return null;
    };

    return (
        <View style={styles.container}>
            {/* Header section */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Schedule</Text>
                    <Text style={styles.subtext}>Monday to Friday</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.gridBtn} onPress={() => setGridVisible(true)}>
                        <Text style={styles.gridBtnText}>🗓️ Grid</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addBtn} onPress={() => handleOpenAdd(8)}>
                        <Text style={styles.addBtnText}>+ Add Slot</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Horizontal Day Capsules */}
            <View>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.daySelectorBar}
                >
                    {DAYS.map(d => (
                        <TouchableOpacity
                            key={d}
                            style={[styles.dayCapsule, selectedDay === d && styles.dayCapsuleActive]}
                            onPress={() => setSelectedDay(d)}
                        >
                            <Text style={[styles.dayCapsuleText, selectedDay === d && styles.dayCapsuleTextActive]}>
                                {d}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Day timeline view */}
            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.timelineScroll}
            >
                {renderTimeline()}
            </ScrollView>

            {/* Editor Bottom Sheet Modal */}
            <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)}>
                <Text style={styles.sheetTitle}>{editingSlotId ? 'Modify Slot' : 'Add Timetable Slot'}</Text>

                {/* Day Input */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Target Day</Text>
                    <TouchableOpacity style={styles.customPickerTrigger} onPress={() => openCustomPicker('day')}>
                        <Text style={styles.customPickerTriggerText}>{day}</Text>
                        <Text style={styles.pickerArrow}>▼</Text>
                    </TouchableOpacity>
                </View>

                {/* Hour Range Inputs */}
                <View style={styles.rowForm}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Starts At</Text>
                        <TouchableOpacity style={styles.customPickerTrigger} onPress={() => openCustomPicker('start')}>
                            <Text style={styles.customPickerTriggerText}>{formatHour(startHour)}</Text>
                            <Text style={styles.pickerArrow}>▼</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
                        <Text style={styles.label}>Ends At</Text>
                        <TouchableOpacity style={styles.customPickerTrigger} onPress={() => openCustomPicker('end')}>
                            <Text style={styles.customPickerTriggerText}>{formatHour(endHour)}</Text>
                            <Text style={styles.pickerArrow}>▼</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Subject Selector */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Choose Subject</Text>
                    <TouchableOpacity style={styles.customPickerTrigger} onPress={() => openCustomPicker('subject')}>
                        <Text style={styles.customPickerTriggerText}>
                            {subjectId ? 
                                subjects.find(s => s.id === subjectId)?.name || 'Select Subject' 
                                : 'Select Subject'
                            }
                        </Text>
                        <Text style={styles.pickerArrow}>▼</Text>
                    </TouchableOpacity>
                </View>

                {/* Room Info */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Room / Location</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Block C, Room 302"
                        placeholderTextColor={colors.textMuted}
                        value={room}
                        onChangeText={setRoom}
                    />
                </View>

                {/* Notes Info */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Additional Notes</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Bring scientific calculator"
                        placeholderTextColor={colors.textMuted}
                        value={notes}
                        onChangeText={setNotes}
                    />
                </View>

                <View style={styles.actions}>
                    {editingSlotId ? (
                        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteSlot}>
                            <Text style={styles.deleteBtnText}>Delete</Text>
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setSheetVisible(false)}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSlot}>
                        <Text style={styles.saveBtnText}>Save Slot</Text>
                    </TouchableOpacity>
                </View>
            </BottomSheet>

            {/* Custom Picker Dialog Modal */}
            <Modal visible={pickerVisible} transparent animationType="fade">
                <TouchableOpacity style={styles.pickerBackdrop} onPress={() => setPickerVisible(false)}>
                    <View style={styles.pickerCard}>
                        <Text style={styles.pickerTitle}>Select Option</Text>
                        <ScrollView style={styles.pickerScroll}>
                            {renderCustomPickerOptions()}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Full Weekly Grid Modal View */}
            <Modal visible={gridVisible} animationType="slide" presentationStyle="fullScreen">
                <View style={styles.gridOverlayContainer}>
                    <View style={styles.gridOverlayHeader}>
                        <Text style={styles.gridOverlayTitle}>Weekly Overview</Text>
                        <TouchableOpacity style={styles.gridCloseBtn} onPress={() => setGridVisible(false)}>
                            <Text style={styles.gridCloseBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={styles.gridScrollWrapper}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.gridHorizontalScroll}>
                            <View style={styles.gridTable}>
                                {/* Grid Header Row */}
                                <View style={styles.gridRow}>
                                    <View style={[styles.gridHeaderCell, styles.cornerCell]}>
                                        <Text style={styles.gridHeaderCellText}>Time</Text>
                                    </View>
                                    {DAYS.map(dayName => (
                                        <View key={dayName} style={styles.gridHeaderCell}>
                                            <Text style={styles.gridHeaderCellText}>{dayName}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Grid Columns (Time label column + 5 day columns side-by-side) */}
                                <View style={styles.gridBodyRow}>
                                    {/* Time label blocks */}
                                    <View style={styles.timeColumn}>
                                        {Array.from({ length: TOTAL_HOURS }).map((_, idx) => {
                                            const hour = START_HOUR + idx;
                                            return (
                                                <View key={hour} style={[styles.gridTimeCell, { height: HOUR_HEIGHT }]}>
                                                    <Text style={styles.gridTimeCellText}>{formatHour(hour)}</Text>
                                                    <Text style={styles.gridTimeEndText}>{formatHour(hour + 1)}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>

                                    {/* Days Columns */}
                                    {DAYS.map(dayName => {
                                        const daySlots = slots.filter(s => s.day === dayName);
                                        return (
                                            <View key={dayName} style={[styles.dayColumn, { height: TOTAL_HOURS * HOUR_HEIGHT }]}>
                                                {/* Background lines for each hour cell */}
                                                {Array.from({ length: TOTAL_HOURS }).map((_, idx) => (
                                                    <View key={idx} style={[styles.gridBgCell, { height: HOUR_HEIGHT }]} />
                                                ))}

                                                {/* Overlay schedule cards */}
                                                {daySlots.map(slot => {
                                                    const subject = subjects.find(s => s.id === slot.subjectId);
                                                    if (!subject) return null;
                                                    
                                                    const top = (slot.startHour - START_HOUR) * HOUR_HEIGHT;
                                                    const height = (slot.endHour - slot.startHour) * HOUR_HEIGHT;

                                                    return (
                                                        <TouchableOpacity
                                                            key={slot.id}
                                                            style={[
                                                                styles.gridSlotCard,
                                                                { 
                                                                    top: top + 3,
                                                                    height: height - 6,
                                                                    borderLeftColor: subject.color
                                                                }
                                                            ]}
                                                            onPress={() => {
                                                                setGridVisible(false);
                                                                handleOpenEdit(slot);
                                                            }}
                                                        >
                                                            <View style={[styles.gridBadge, { backgroundColor: `${subject.color}15` }]}>
                                                                <Text style={[styles.gridBadgeText, { color: subject.color }]}>{subject.shortName}</Text>
                                                            </View>
                                                            <Text style={styles.gridSlotTitle} numberOfLines={2}>{subject.name}</Text>
                                                            {slot.room ? <Text style={styles.gridSlotRoom} numberOfLines={1}>{slot.room}</Text> : null}
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        </ScrollView>
                    </ScrollView>
                </View>
            </Modal>
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
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    gridBtn: {
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 24,
    },
    gridBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 13,
        color: colors.textSecondary,
    },
    addBtn: {
        backgroundColor: colors.gold,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 24,
    },
    addBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 13,
        color: colors.cream,
    },
    daySelectorBar: {
        paddingHorizontal: 20,
        paddingBottom: 12,
        gap: 8,
    },
    dayCapsule: {
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },
    dayCapsuleActive: {
        backgroundColor: colors.gold,
        borderColor: colors.gold,
    },
    dayCapsuleText: {
        fontFamily: fonts.heading,
        fontSize: 13,
        color: colors.textSecondary,
    },
    dayCapsuleTextActive: {
        fontFamily: fonts.headingBold,
        color: colors.cream,
    },
    timelineScroll: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 10,
    },
    emptyContainer: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
        borderStyle: 'dashed',
        borderRadius: 24,
        paddingVertical: 60,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginTop: 20,
    },
    emptyTitle: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    emptyDesc: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
    },
    emptyTimelineSlot: {
        flexDirection: 'row',
        width: '100%',
    },
    trackColumn: {
        width: 24,
        alignItems: 'center',
    },
    emptyBullet: {
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: colors.bgTertiary,
        backgroundColor: colors.bgPrimary,
        zIndex: 2,
        marginTop: 22,
    },
    trackLine: {
        position: 'absolute',
        top: 22,
        bottom: -22,
        width: 2,
        backgroundColor: colors.bgTertiary,
        zIndex: 1,
    },
    emptyCardWrapper: {
        flex: 1,
        marginLeft: 8,
        paddingBottom: 20,
    },
    emptyCard: {
        backgroundColor: colors.bgSecondary,
        opacity: 0.4,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
        borderStyle: 'dashed',
        padding: 14,
    },
    emptyCardText: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.textMuted,
    },
    timeLabel: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    sheetTitle: {
        fontFamily: fonts.headingBold,
        fontSize: 20,
        color: colors.cream,
        textAlign: 'center',
        marginBottom: 20,
    },
    formGroup: {
        marginBottom: 16,
    },
    rowForm: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 6,
        marginLeft: 4,
    },
    customPickerTrigger: {
        backgroundColor: colors.bgTertiary,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    customPickerTriggerText: {
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.cream,
    },
    pickerArrow: {
        color: colors.gold,
        fontSize: 10,
    },
    input: {
        backgroundColor: colors.bgTertiary,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: colors.cream,
        fontFamily: fonts.body,
        fontSize: 14,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 24,
    },
    deleteBtn: {
        backgroundColor: 'rgba(220, 53, 69, 0.15)',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 16,
        marginRight: 'auto',
    },
    deleteBtnText: {
        fontFamily: fonts.heading,
        fontSize: 14,
        color: '#FF7373',
    },
    cancelBtn: {
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 16,
    },
    cancelBtnText: {
        fontFamily: fonts.heading,
        fontSize: 14,
        color: colors.cream,
    },
    saveBtn: {
        backgroundColor: colors.gold,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 16,
    },
    saveBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 14,
        color: colors.cream,
    },
    pickerBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    pickerCard: {
        backgroundColor: colors.bgSecondary,
        width: '100%',
        maxHeight: '60%',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        padding: 20,
    },
    pickerTitle: {
        fontFamily: fonts.headingBold,
        fontSize: 16,
        color: colors.gold,
        textAlign: 'center',
        marginBottom: 16,
    },
    pickerScroll: {
        maxHeight: '100%',
    },
    pickerOption: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.02)',
    },
    pickerOptionText: {
        fontFamily: fonts.body,
        fontSize: 15,
        color: colors.cream,
        textAlign: 'center',
    },
    pickerOptionTextActive: {
        color: colors.gold,
        fontFamily: fonts.headingBold,
    },
    gridOverlayContainer: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
        paddingTop: Platform.OS === 'ios' ? 44 : 20,
    },
    gridOverlayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.03)',
    },
    gridOverlayTitle: {
        fontFamily: fonts.headingBold,
        fontSize: 18,
        color: colors.cream,
    },
    gridCloseBtn: {
        backgroundColor: colors.bgSecondary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    gridCloseBtnText: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.cream,
    },
    gridScrollWrapper: {
        flex: 1,
    },
    gridHorizontalScroll: {
        padding: 16,
    },
    gridTable: {
        flexDirection: 'column',
    },
    gridRow: {
        flexDirection: 'row',
    },
    gridHeaderCell: {
        width: 125,
        height: 40,
        backgroundColor: colors.bgSecondary,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cornerCell: {
        width: 65,
        backgroundColor: colors.bgPrimary,
    },
    gridHeaderCellText: {
        fontFamily: fonts.headingBold,
        fontSize: 12,
        color: colors.gold,
    },
    gridBodyRow: {
        flexDirection: 'row',
    },
    timeColumn: {
        width: 65,
    },
    gridTimeCell: {
        backgroundColor: colors.bgSecondary,
        borderRightWidth: 1,
        borderRightColor: 'rgba(255, 255, 255, 0.05)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridTimeCellText: {
        fontFamily: fonts.heading,
        fontSize: 10,
        color: colors.textSecondary,
    },
    gridTimeEndText: {
        fontFamily: fonts.body,
        fontSize: 8,
        color: colors.textMuted,
        marginTop: 2,
    },
    dayColumn: {
        width: 125,
        position: 'relative',
    },
    gridBgCell: {
        width: '100%',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255, 255, 255, 0.02)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.02)',
    },
    gridSlotCard: {
        position: 'absolute',
        left: 4,
        right: 4,
        backgroundColor: colors.bgTertiary,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
        borderLeftWidth: 3,
        borderRadius: 12,
        padding: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
    },
    gridBadge: {
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    gridBadgeText: {
        fontFamily: fonts.headingBold,
        fontSize: 8,
    },
    gridSlotTitle: {
        fontFamily: fonts.heading,
        fontSize: 10,
        color: colors.cream,
        marginVertical: 2,
        lineHeight: 12,
    },
    gridSlotRoom: {
        fontFamily: fonts.body,
        fontSize: 9,
        color: colors.textSecondary,
    }
});
