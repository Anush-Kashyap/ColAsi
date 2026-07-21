/**
 * Cozy Subjects & Attendance Screen
 * Renders subject list cards, handles counters, limits bunk percentage, and adds new subjects.
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, TouchableOpacity, Alert, Share, Modal, Linking } from 'react-native';
import { colors, fonts } from '../styles/theme';
import * as DB from '../database/storage';
import SubjectCard from '../components/SubjectCard';
import BottomSheet from '../components/BottomSheet';
import SubjectDetailScreen from './SubjectDetailScreen';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

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
    const [cloudSyncModalVisible, setCloudSyncModalVisible] = useState(false);
    const [backupString, setBackupString] = useState('');
    const [importString, setImportString] = useState('');
    const [cloudCodeInput, setCloudCodeInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Vault States
    const [vaultModalVisible, setVaultModalVisible] = useState(false);
    const [vaultSubject, setVaultSubject] = useState(null);
    const [vaultItems, setVaultItems] = useState([]);
    const [resourceModalVisible, setResourceModalVisible] = useState(false);
    const [resourceType, setResourceType] = useState('link'); // 'link' | 'note' | 'file'
    const [resourceTitle, setResourceTitle] = useState('');
    const [resourceUri, setResourceUri] = useState('');
    const [editingItem, setEditingItem] = useState(null);

    const handleOpenVault = async (subject) => {
        setVaultSubject(subject);
        const items = await DB.getVaultItems(subject.id);
        setVaultItems(items);
        setVaultModalVisible(true);
    };

    const handlePickFileAndUpload = async () => {
        if (!vaultSubject) return;
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const cleanFileName = asset.name || 'uploaded_file';
                const destUri = `${FileSystem.documentDirectory}${Date.now()}_${cleanFileName}`;

                await FileSystem.copyAsync({
                    from: asset.uri,
                    to: destUri,
                });

                const newItem = {
                    id: DB.generateUUID(),
                    subjectId: vaultSubject.id,
                    title: cleanFileName,
                    type: 'file',
                    uri: destUri,
                    mimeType: asset.mimeType || '',
                    dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                };

                const updated = [newItem, ...vaultItems];
                await DB.saveVaultItems(vaultSubject.id, updated);
                setVaultItems(updated);
                Alert.alert('File Added!', `"${cleanFileName}" is stored in ${vaultSubject.name} Vault.`);
            }
        } catch (e) {
            console.error('Error picking document', e);
            Alert.alert('Upload Failed', 'Could not pick or save the file.');
        }
    };

    const handleOpenAddResource = (type) => {
        setEditingItem(null);
        setResourceType(type);
        setResourceTitle('');
        setResourceUri('');
        setResourceModalVisible(true);
    };

    const handleOpenRenameModal = (item) => {
        setEditingItem(item);
        setResourceTitle(item.title);
        setResourceUri(item.uri || '');
        setResourceModalVisible(true);
    };

    const handleSaveResource = async () => {
        if (!resourceTitle.trim()) {
            Alert.alert('Title Required', 'Please enter a title for this resource.');
            return;
        }

        if (editingItem) {
            const updated = vaultItems.map(item => {
                if (item.id === editingItem.id) {
                    return {
                        ...item,
                        title: resourceTitle.trim(),
                        uri: resourceType === 'link' || resourceType === 'note' ? resourceUri.trim() : item.uri,
                    };
                }
                return item;
            });
            await DB.saveVaultItems(vaultSubject.id, updated);
            setVaultItems(updated);
            setResourceModalVisible(false);
            Alert.alert('Updated', 'Resource display name updated successfully.');
            return;
        }

        const newItem = {
            id: DB.generateUUID(),
            subjectId: vaultSubject.id,
            title: resourceTitle.trim(),
            type: resourceType,
            uri: resourceUri.trim(),
            dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        };

        const updated = [newItem, ...vaultItems];
        await DB.saveVaultItems(vaultSubject.id, updated);
        setVaultItems(updated);
        setResourceModalVisible(false);
    };

    const handleOpenResource = async (item) => {
        try {
            if (item.type === 'file') {
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(item.uri);
                } else {
                    Alert.alert('File Path', item.uri);
                }
            } else if (item.type === 'link') {
                if (item.uri) {
                    let formattedUrl = item.uri.trim();
                    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
                        formattedUrl = 'https://' + formattedUrl;
                    }
                    const supported = await Linking.canOpenURL(formattedUrl);
                    if (supported) {
                        await Linking.openURL(formattedUrl);
                    } else {
                        Alert.alert('Invalid Link', formattedUrl);
                    }
                }
            } else if (item.type === 'note') {
                Alert.alert(`📝 ${item.title}`, item.uri || 'No text content.');
            }
        } catch (e) {
            console.error('Error opening resource', e);
            Alert.alert('Unable to Open', 'Could not open resource.');
        }
    };

    const handleDeleteResource = (itemId) => {
        Alert.alert(
            'Delete Resource',
            'Remove this resource from the vault?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const updated = vaultItems.filter(item => item.id !== itemId);
                        await DB.saveVaultItems(vaultSubject.id, updated);
                        setVaultItems(updated);
                    }
                }
            ]
        );
    };

    const handleGenerateCloudCode = async (forceNew = false) => {
        setIsUploading(true);
        const res = await DB.uploadCloudBackup(forceNew);
        setIsUploading(false);

        if (res && res.success) {
            const title = res.isCached ? '☁️ Active Sync Code (Valid for 1hr)' : '☁️ Cloud Code Generated!';
            const note = res.isCached ? '\n(This code is active for 1 hour. Tap "Generate New" if you want a fresh code.)' : '';
            Alert.alert(
                title,
                `Your 5-Character Sync Code is:\n\n${res.code}${note}`,
                [
                    {
                        text: '📋 Copy Code',
                        onPress: async () => {
                            await Clipboard.setStringAsync(res.code);
                            Alert.alert('Copied!', `Sync Code ${res.code} copied to clipboard.`);
                        }
                    },
                    {
                        text: '🔄 Generate New',
                        onPress: () => handleGenerateCloudCode(true)
                    },
                    { text: 'OK' }
                ]
            );
        } else {
            Alert.alert('Cloud Sync Failed', res?.reason || 'Could not upload to cloud.');
        }
    };

    const handleRestoreFromCloudCode = async () => {
        if (!cloudCodeInput.trim()) {
            Alert.alert('Code Required', 'Please enter your 5-character sync code.');
            return;
        }

        setIsDownloading(true);
        const res = await DB.downloadCloudBackup(cloudCodeInput.trim());
        setIsDownloading(false);

        if (res && res.success) {
            Alert.alert('Cloud Restore Success', 'Your spaces have been successfully loaded from the cloud!', [
                {
                    text: 'OK',
                    onPress: () => {
                        setCloudCodeInput('');
                        setCloudSyncModalVisible(false);
                        loadSubjects();
                        onRefreshRequest();
                    }
                }
            ]);
        } else {
            Alert.alert('Restore Failed', res?.reason || 'Sync code not found or expired.');
        }
    };

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

    const handleExportFile = async () => {
        try {
            const code = await DB.exportAllData();
            if (!code) {
                Alert.alert('Export Failed', 'Unable to generate backup payload.');
                return;
            }

            const fileUri = `${FileSystem.cacheDirectory}colasi_backup.json`;
            await FileSystem.writeAsStringAsync(fileUri, code, { encoding: 'utf8' });

            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/json',
                    dialogTitle: 'Save or Share ColAsi Backup File',
                    UTI: 'public.json'
                });
            } else {
                Alert.alert('Sharing Unavailable', 'Unable to open file sharing on this device.');
            }
        } catch (e) {
            console.error('Error exporting file', e);
            Alert.alert('Export Failed', 'Could not create backup file.');
        }
    };

    const handleImportFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const fileUri = result.assets[0].uri;
                const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' });
                
                Alert.alert(
                    'Confirm Restore File',
                    'This will overwrite all current subjects, timetable slots, catalogs, and tasks on this device. Are you sure?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Restore File',
                            onPress: async () => {
                                const res = await DB.importAllData(fileContent);
                                if (res && res.success) {
                                    Alert.alert('Restore Success', 'Your spaces have been successfully loaded from file!', [
                                        {
                                            text: 'OK',
                                            onPress: () => {
                                                setImportSheetVisible(false);
                                                loadSubjects();
                                                onRefreshRequest();
                                            }
                                        }
                                    ]);
                                } else {
                                    Alert.alert('Restore Failed', res?.reason || 'Invalid or corrupt backup file.');
                                }
                            }
                        }
                    ]
                );
            }
        } catch (e) {
            console.error('Error picking document', e);
            Alert.alert('File Error', 'Could not read selected file.');
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
                        onOpenVault={(sub) => handleOpenVault(sub)}
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
                        <Text style={styles.backupPanelTitle}>☁️ Cloud Sync</Text>
                        <View style={styles.backupRow}>
                            <TouchableOpacity 
                                style={[styles.backupBtn, { backgroundColor: colors.gold }]} 
                                onPress={() => handleGenerateCloudCode(false)}
                                disabled={isUploading}
                            >
                                <Text style={[styles.backupBtnText, { color: colors.cream }]}>
                                    {isUploading ? 'Uploading...' : '⚡ Generate Code'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.backupBtn, { borderColor: colors.gold }]} 
                                onPress={() => { setCloudCodeInput(''); setCloudSyncModalVisible(true); }}
                            >
                                <Text style={[styles.backupBtnText, { color: colors.gold }]}>🔑 Enter Code</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 14 }}>
                            <TouchableOpacity onPress={handleExportFile}>
                                <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textDecorationLine: 'underline' }}>
                                    📁 Save File
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleImportFile}>
                                <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textDecorationLine: 'underline' }}>
                                    📥 Pick File
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleExportData}>
                                <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.gold, textDecorationLine: 'underline' }}>
                                    📋 Copy Text
                                </Text>
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
                <Text style={styles.sheetTitle}>Import Backup Code</Text>
                <Text style={styles.backupInfoText}>Paste the backup code from your other phone below or select a file:</Text>
                <TouchableOpacity 
                    style={[styles.backupBtn, { marginBottom: 14, borderColor: colors.gold }]} 
                    onPress={handleImportFile}
                >
                    <Text style={[styles.backupBtnText, { color: colors.gold }]}>📁 Pick Backup File (.json)</Text>
                </TouchableOpacity>
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

            {/* Cloud Sync Code Modal */}
            <BottomSheet visible={cloudSyncModalVisible} onClose={() => setCloudSyncModalVisible(false)}>
                <Text style={styles.sheetTitle}>🔑 Enter Cloud Sync Code</Text>
                <Text style={styles.backupInfoText}>Enter the sync code generated on your other phone (case-sensitive, e.g. KeT45):</Text>
                <TextInput
                    style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 4, fontFamily: fonts.headingBold, color: colors.gold, paddingVertical: 14 }]}
                    placeholder="e.g. KeT45"
                    placeholderTextColor={colors.textMuted}
                    value={cloudCodeInput}
                    onChangeText={val => setCloudCodeInput(val.trim())}
                    maxLength={16}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <View style={styles.actions}>
                    <TouchableOpacity 
                        style={styles.cancelBtn} 
                        onPress={() => setCloudSyncModalVisible(false)}
                    >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.saveBtn} 
                        onPress={handleRestoreFromCloudCode}
                        disabled={isDownloading}
                    >
                        <Text style={styles.saveBtnText}>{isDownloading ? 'Downloading...' : 'Sync & Restore'}</Text>
                    </TouchableOpacity>
                </View>
            </BottomSheet>

            {/* Subject Vault Modal */}
            <Modal visible={vaultModalVisible} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.vaultCardContainer}>
                        {/* Header */}
                        <View style={styles.vaultHeaderRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                <View style={[styles.colorDot, { backgroundColor: vaultSubject?.color || colors.gold }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.vaultSubjectTitle} numberOfLines={1}>
                                        🏛️ {vaultSubject?.name} Vault
                                    </Text>
                                    <Text style={styles.vaultSubjectSubtitle}>
                                        {vaultSubject?.shortName} • Books, Notes & Study Resources
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setVaultModalVisible(false)} style={styles.vaultCloseIconBtn}>
                                <Text style={styles.vaultCloseIconText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Vault Quick Action Buttons */}
                        <View style={styles.vaultActionBar}>
                            <TouchableOpacity 
                                style={[styles.vaultActionCapsule, { backgroundColor: colors.gold }]}
                                onPress={handlePickFileAndUpload}
                            >
                                <Text style={[styles.vaultActionCapsuleText, { color: colors.cream }]}>📄 Upload File</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.vaultActionCapsule, { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.gold }]}
                                onPress={() => handleOpenAddResource('link')}
                            >
                                <Text style={[styles.vaultActionCapsuleText, { color: colors.gold }]}>🔗 Add Link</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.vaultActionCapsule, { backgroundColor: colors.bgSecondary }]}
                                onPress={() => handleOpenAddResource('note')}
                            >
                                <Text style={styles.vaultActionCapsuleText}>📝 Add Note</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Resources List */}
                        <FlatList
                            data={vaultItems}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ paddingVertical: 10, gap: 10 }}
                            ListEmptyComponent={
                                <View style={styles.vaultEmptyState}>
                                    <Text style={{ fontSize: 32, marginBottom: 8 }}>🏛️</Text>
                                    <Text style={styles.vaultEmptyStateTitle}>Vault is Empty</Text>
                                    <Text style={styles.vaultEmptyStateDesc}>
                                        Upload textbooks, PDF notes, drive links, or exam reminders for {vaultSubject?.name}.
                                    </Text>
                                </View>
                            }
                            renderItem={({ item }) => (
                                <View style={styles.vaultItemRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                        <Text style={{ fontSize: 22 }}>
                                            {item.type === 'file' ? '📄' : item.type === 'link' ? '🔗' : '📝'}
                                        </Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.vaultItemTitleText} numberOfLines={2}>
                                                {item.title}
                                            </Text>
                                            <Text style={styles.vaultItemMetaText}>
                                                {item.type.toUpperCase()} • Added {item.dateAdded}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <TouchableOpacity 
                                            style={styles.vaultItemActionBtn}
                                            onPress={() => handleOpenResource(item)}
                                        >
                                            <Text style={styles.vaultItemActionBtnText}>📖 Open</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity 
                                            style={styles.vaultItemActionBtn}
                                            onPress={() => handleOpenRenameModal(item)}
                                        >
                                            <Text style={styles.vaultItemActionBtnText}>✏️</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity 
                                            style={[styles.vaultItemActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
                                            onPress={() => handleDeleteResource(item.id)}
                                        >
                                            <Text style={{ color: '#EF4444', fontFamily: fonts.headingBold, fontSize: 11 }}>🗑️</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        />

                        <TouchableOpacity 
                            style={styles.vaultFooterCloseBtn}
                            onPress={() => setVaultModalVisible(false)}
                        >
                            <Text style={styles.vaultFooterCloseBtnText}>Close Vault</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Add / Rename Resource Modal */}
            <Modal visible={resourceModalVisible} transparent animationType="fade">
                <View style={styles.modalBackdrop}>
                    <View style={styles.resourceFormCard}>
                        <Text style={styles.resourceFormTitle}>
                            {editingItem ? '✏️ Rename Resource' : resourceType === 'link' ? '🔗 Add Web Link' : '📝 Add Quick Note'}
                        </Text>

                        <Text style={styles.resourceFormLabel}>Display Name / Title</Text>
                        <TextInput
                            style={styles.resourceFormInput}
                            value={resourceTitle}
                            onChangeText={setResourceTitle}
                            placeholder="e.g. AI Textbook - Russell & Norvig 4th Ed"
                            placeholderTextColor={colors.textMuted}
                        />

                        {!editingItem && resourceType === 'link' && (
                            <>
                                <Text style={[styles.resourceFormLabel, { marginTop: 12 }]}>URL / Drive Link</Text>
                                <TextInput
                                    style={styles.resourceFormInput}
                                    value={resourceUri}
                                    onChangeText={setResourceUri}
                                    placeholder="https://drive.google.com/..."
                                    placeholderTextColor={colors.textMuted}
                                    autoCapitalize="none"
                                    keyboardType="url"
                                />
                            </>
                        )}

                        {!editingItem && resourceType === 'note' && (
                            <>
                                <Text style={[styles.resourceFormLabel, { marginTop: 12 }]}>Note Content</Text>
                                <TextInput
                                    style={[styles.resourceFormInput, { height: 80, textAlignVertical: 'top' }]}
                                    value={resourceUri}
                                    onChangeText={setResourceUri}
                                    placeholder="Type quick notes, syllabus topics, or exam reminders..."
                                    placeholderTextColor={colors.textMuted}
                                    multiline
                                />
                            </>
                        )}

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                            <TouchableOpacity 
                                style={[styles.resourceModalBtn, { flex: 1, backgroundColor: colors.bgTertiary }]}
                                onPress={() => setResourceModalVisible(false)}
                            >
                                <Text style={styles.resourceModalBtnText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.resourceModalBtn, { flex: 1, backgroundColor: colors.gold }]}
                                onPress={handleSaveResource}
                            >
                                <Text style={[styles.resourceModalBtnText, { color: colors.cream }]}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
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
    },

    // Vault Modal Styles
    vaultCardContainer: {
        width: '92%',
        maxHeight: '85%',
        backgroundColor: colors.bgSecondary,
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    vaultHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    vaultSubjectTitle: {
        fontFamily: fonts.headingBold,
        fontSize: 18,
        color: colors.cream,
    },
    vaultSubjectSubtitle: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    vaultCloseIconBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.bgTertiary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    vaultCloseIconText: {
        color: colors.textMuted,
        fontSize: 14,
        fontFamily: fonts.headingBold,
    },
    vaultActionBar: {
        flexDirection: 'row',
        gap: 8,
        marginVertical: 14,
    },
    vaultActionCapsule: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    vaultActionCapsuleText: {
        fontFamily: fonts.headingBold,
        fontSize: 11,
        color: colors.cream,
    },
    vaultItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.bgTertiary,
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.02)',
    },
    vaultItemTitleText: {
        fontFamily: fonts.heading,
        fontSize: 13,
        color: colors.cream,
    },
    vaultItemMetaText: {
        fontFamily: fonts.body,
        fontSize: 10,
        color: colors.gold,
        marginTop: 2,
    },
    vaultItemActionBtn: {
        backgroundColor: colors.bgSecondary,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
    },
    vaultItemActionBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 11,
        color: colors.cream,
    },
    vaultEmptyState: {
        alignItems: 'center',
        paddingVertical: 30,
        paddingHorizontal: 20,
    },
    vaultEmptyStateTitle: {
        fontFamily: fonts.headingBold,
        fontSize: 16,
        color: colors.cream,
        marginBottom: 6,
    },
    vaultEmptyStateDesc: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
    },
    vaultFooterCloseBtn: {
        backgroundColor: colors.bgTertiary,
        borderRadius: 16,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    vaultFooterCloseBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 13,
        color: colors.cream,
    },

    // Resource Form Modal Styles
    resourceFormCard: {
        width: '88%',
        backgroundColor: colors.bgSecondary,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.gold,
    },
    resourceFormTitle: {
        fontFamily: fonts.headingBold,
        fontSize: 18,
        color: colors.gold,
        marginBottom: 14,
        textAlign: 'center',
    },
    resourceFormLabel: {
        fontFamily: fonts.bodyBold,
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    resourceFormInput: {
        backgroundColor: colors.bgPrimary,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: colors.cream,
        fontFamily: fonts.body,
        fontSize: 13,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    resourceModalBtn: {
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: 'center',
    },
    resourceModalBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 13,
        color: colors.cream,
    }
});
