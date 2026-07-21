/**
 * Cozy Subjects & Attendance Screen
 * Renders subject list cards, handles counters, limits bunk percentage, and adds new subjects.
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, TouchableOpacity, Alert, Share } from 'react-native';
import { colors, fonts } from '../styles/theme';
import * as DB from '../database/storage';
import SubjectCard from '../components/SubjectCard';
import BottomSheet from '../components/BottomSheet';
import SubjectDetailScreen from './SubjectDetailScreen';
import * as Clipboard from 'expo-clipboard';

export default function SubjectsScreen({ refreshTrigger, onRefreshRequest }) {
    const [subjects, setSubjects] = useState([]);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [selectedSubjectForDetail, setSelectedSubjectForDetail] = useState(null);
    
    // Form States
    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [selectedColor, setSelectedColor] = useState(colors.palette[0]);

    // Backup & Sync States
    const [exportSheetVisible, setExportSheetVisible] = useState(false);
    const [importSheetVisible, setImportSheetVisible] = useState(false);
    const [backupString, setBackupString] = useState('');
    const [importString, setImportString] = useState('');

    const handleExportData = async () => {
        const code = await DB.exportAllData();
        if (code) {
            setBackupString(code);
            setExportSheetVisible(true);
        } else {
            Alert.alert('Export Failed', 'Unable to package local data.');
        }
    };

    const handleImportData = async () => {
        if (!importString.trim()) {
            Alert.alert('Input Required', 'Please paste the backup code.');
            return;
        }

        Alert.alert(
            'Confirm Restore',
            'This will overwrite all current subjects, timetable slots, catalogs, and tasks on this device. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Restore',
                    onPress: async () => {
                        const res = await DB.importAllData(importString.trim());
                        if (res && res.success) {
                            Alert.alert('Restore Success', 'Your spaces have been successfully loaded!', [
                                {
                                    text: 'OK',
                                    onPress: () => {
                                        setImportString('');
                                        setImportSheetVisible(false);
                                        loadSubjects();
                                        onRefreshRequest();
                                    }
                                }
                            ]);
                        } else {
                            Alert.alert('Restore Failed', res?.reason || 'Invalid or corrupt backup code.');
                        }
                    }
                }
            ]
        );
    };

    const copyToClipboard = async () => {
        try {
            await Clipboard.setStringAsync(backupString);
            Alert.alert('Copied!', 'Backup code copied to clipboard successfully.');
        } catch (e) {
            Alert.alert('Copy Failed', 'Could not write backup code to clipboard.');
        }
    };

    const shareBackupCode = async () => {
        try {
            await Share.share({
                title: 'ColAsi Backup Code',
                message: backupString,
            });
        } catch (e) {
            Alert.alert('Share Failed', 'Could not open share options.');
        }
    };

    useEffect(() => {
        loadSubjects();
    }, [refreshTrigger]);

    const loadSubjects = async () => {
        const loaded = await DB.getSubjects();
        setSubjects(loaded);
    };

    const handleAddSubject = async () => {
        if (!name.trim() || !shortName.trim()) {
            Alert.alert('Incomplete Entry', 'Please supply a Subject Name and Short Code.');
            return;
        }

        const newSubject = {
            id: DB.generateUUID(),
            name: name.trim(),
            shortName: shortName.trim().toUpperCase(),
            color: selectedColor,
            totalClasses: 0,
            bunkedClasses: 0
        };

        const list = [...subjects, newSubject];
        await DB.saveSubjects(list);
        
        // Reset states
        setName('');
        setShortName('');
        setSelectedColor(colors.palette[0]);
        setSheetVisible(false);
        
        loadSubjects();
        onRefreshRequest(); // Request schedule screen updates too
    };

    const handleUpdateAttendance = async (subjectId, totalDiff, bunkDiff) => {
        const idx = subjects.findIndex(s => s.id === subjectId);
        if (idx === -1) return;

        const list = [...subjects];
        const subject = { ...list[idx] };

        let newTotal = subject.totalClasses + totalDiff;
        if (newTotal < 0) newTotal = 0;

        let newBunk = subject.bunkedClasses + bunkDiff;
        if (newBunk < 0) newBunk = 0;

        const maxBunks = Math.floor(newTotal * 0.2);

        if (newBunk > maxBunks) {
            if (bunkDiff > 0) {
                Alert.alert(
                    'Limit Reached', 
                    `Bunk limit reached for ${subject.name}!\nMax allowed bunks is 20% (${maxBunks} classes).`
                );
                return;
            } else {
                // If total classes decreases and forces limit down, clamp bunkedClasses
                newBunk = maxBunks;
            }
        }

        subject.totalClasses = newTotal;
        subject.bunkedClasses = newBunk;
        list[idx] = subject;

        await DB.saveSubjects(list);
        setSubjects(list);
        onRefreshRequest(); // Keep sync across screens
    };

    const handleDeleteSubject = (subjectId, subjectName) => {
        Alert.alert(
            'Confirm Delete',
            `Remove "${subjectName}"? This will also remove any of its sessions scheduled in your timetable.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        const filtered = subjects.filter(s => s.id !== subjectId);
                        await DB.saveSubjects(filtered);
                        await DB.cleanupTimetableForSubject(subjectId);
                        await DB.cleanupCatalogsForSubject(subjectId);
                        await DB.cleanupEventsForSubject(subjectId);
                        if (selectedSubjectForDetail && selectedSubjectForDetail.id === subjectId) {
                            setSelectedSubjectForDetail(null);
                        }
                        loadSubjects();
                        onRefreshRequest();
                    }
                }
            ]
        );
    };

    if (selectedSubjectForDetail) {
        return (
            <SubjectDetailScreen 
                subject={selectedSubjectForDetail} 
                onGoBack={() => setSelectedSubjectForDetail(null)} 
            />
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Subjects</Text>
                    <Text style={styles.subtext}>bunk policy: under 20% max</Text>
                </View>
                <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => setSheetVisible(true)}
                >
                    <Text style={styles.addButtonText}>+ Add Subject</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={subjects}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <SubjectCard
                        subject={item}
                        onUpdate={handleUpdateAttendance}
                        onDelete={() => handleDeleteSubject(item.id, item.name)}
                        onOpenDetail={(sub) => setSelectedSubjectForDetail(sub)}
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>No subjects defined</Text>
                        <Text style={styles.emptyDesc}>Tap "+ Add Subject" to begin constructing your database.</Text>
                    </View>
                }
                ListFooterComponent={
                    <View style={styles.backupPanel}>
                        <Text style={styles.backupPanelTitle}>🔄 Cozy Backup & Sync</Text>
                        <Text style={styles.backupPanelDesc}>Transfer all your data (subjects, timetable, catalog, and tasks) to another phone.</Text>
                        <View style={styles.backupRow}>
                            <TouchableOpacity style={styles.backupBtn} onPress={handleExportData}>
                                <Text style={styles.backupBtnText}>📤 Export Code</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.backupBtn, styles.backupBtnImport]} onPress={() => { setImportString(''); setImportSheetVisible(true); }}>
                                <Text style={styles.backupBtnText}>📥 Import Code</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                }
            />

            {/* Export Sheet */}
            <BottomSheet visible={exportSheetVisible} onClose={() => setExportSheetVisible(false)}>
                <Text style={styles.sheetTitle}>Export Backup</Text>
                <Text style={styles.backupInfoText}>Tap 'Copy Code' below to copy your backup string, then send it to your other phone:</Text>
                <TextInput
                    style={[styles.input, styles.codeArea]}
                    value={backupString}
                    editable={false}
                    selectTextOnFocus={true}
                    multiline
                />
                <View style={styles.actions}>
                    <TouchableOpacity 
                        style={styles.cancelBtn} 
                        onPress={copyToClipboard}
                    >
                        <Text style={styles.cancelBtnText}>📋 Copy Code</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.cancelBtn, { borderColor: colors.gold }]} 
                        onPress={shareBackupCode}
                    >
                        <Text style={[styles.cancelBtnText, { color: colors.gold }]}>📤 Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.saveBtn} 
                        onPress={() => setExportSheetVisible(false)}
                    >
                        <Text style={styles.saveBtnText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </BottomSheet>

            {/* Import Sheet */}
            <BottomSheet visible={importSheetVisible} onClose={() => setImportSheetVisible(false)}>
                <Text style={styles.sheetTitle}>Import Backup</Text>
                <Text style={styles.backupInfoText}>Paste the backup code from your other phone below:</Text>
                <TextInput
                    style={[styles.input, styles.codeArea]}
                    placeholder="Paste COLASI_BKP_ code here..."
                    placeholderTextColor={colors.textMuted}
                    value={importString}
                    onChangeText={setImportString}
                    multiline
                />
                <View style={styles.actions}>
                    <TouchableOpacity 
                        style={styles.cancelBtn} 
                        onPress={() => setImportSheetVisible(false)}
                    >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.saveBtn} 
                        onPress={handleImportData}
                    >
                        <Text style={styles.saveBtnText}>Restore Data</Text>
                    </TouchableOpacity>
                </View>
            </BottomSheet>

            {/* Bottom Sheet Modal Form */}
            <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)}>
                <Text style={styles.sheetTitle}>New Subject</Text>
                
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Subject Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Artificial Intelligence"
                        placeholderTextColor={colors.textMuted}
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Short Code</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. AI"
                        placeholderTextColor={colors.textMuted}
                        maxLength={6}
                        value={shortName}
                        onChangeText={setShortName}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Choose Theme Color</Text>
                    <View style={styles.paletteGrid}>
                        {colors.palette.map(color => (
                            <TouchableOpacity
                                key={color}
                                style={[
                                    styles.colorSwatch,
                                    { backgroundColor: color },
                                    selectedColor === color && styles.colorSwatchActive
                                ]}
                                onPress={() => setSelectedColor(color)}
                            />
                        ))}
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity 
                        style={styles.cancelBtn} 
                        onPress={() => setSheetVisible(false)}
                    >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.saveBtn} 
                        onPress={handleAddSubject}
                    >
                        <Text style={styles.saveBtnText}>Save Subject</Text>
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
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 24,
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
    label: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 6,
        marginLeft: 4,
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
    paletteGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
        marginTop: 4,
    },
    colorSwatch: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 3,
        borderColor: 'transparent',
    },
    colorSwatchActive: {
        borderColor: colors.cream,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 24,
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
    backupPanel: {
        marginTop: 32,
        padding: 20,
        backgroundColor: colors.bgSecondary,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.02)',
    },
    backupPanelTitle: {
        fontFamily: fonts.headingBold,
        fontSize: 16,
        color: colors.cream,
        marginBottom: 6,
    },
    backupPanelDesc: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 16,
        lineHeight: 18,
    },
    backupRow: {
        flexDirection: 'row',
        gap: 12,
    },
    backupBtn: {
        flex: 1,
        backgroundColor: colors.bgTertiary,
        paddingVertical: 12,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
    },
    backupBtnImport: {
        borderColor: colors.gold,
    },
    backupBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 13,
        color: colors.cream,
    },
    backupInfoText: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 12,
        lineHeight: 18,
    },
    codeArea: {
        height: 120,
        textAlignVertical: 'top',
        fontSize: 11,
        fontFamily: fonts.body,
        lineHeight: 15,
        backgroundColor: colors.bgPrimary,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
    }
});
