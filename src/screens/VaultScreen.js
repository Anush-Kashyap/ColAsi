/**
 * Consolidated Vault Screen
 * Shows all subjects as compact cards → tap to view that subject's vault files/links/notes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
    StyleSheet, 
    View, 
    Text, 
    ScrollView, 
    TouchableOpacity, 
    TextInput, 
    Alert,
    Modal,
    Linking,
    Platform
} from 'react-native';
import { colors, fonts } from '../styles/theme';
import * as DB from '../database/storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as IntentLauncher from 'expo-intent-launcher';

export default function VaultScreen({ subjects, onGoBack }) {
    // null = subject picker view, object = viewing that subject's vault
    const [selectedSubject, setSelectedSubject] = useState(null);

    // Vault file counts per subject (for the picker view)
    const [vaultCounts, setVaultCounts] = useState({});

    // Items for the selected subject
    const [vaultItems, setVaultItems] = useState([]);

    // Resource modal states
    const [resourceModalVisible, setResourceModalVisible] = useState(false);
    const [resourceType, setResourceType] = useState('link'); // 'link' | 'note'
    const [resourceTitle, setResourceTitle] = useState('');
    const [resourceUri, setResourceUri] = useState('');
    const [editingItem, setEditingItem] = useState(null);

    // Load vault counts for all subjects
    const loadAllVaultCounts = useCallback(async () => {
        const counts = {};
        const safeSubjects = Array.isArray(subjects) ? subjects : [];
        for (const sub of safeSubjects) {
            const items = await DB.getVaultItems(sub.id);
            const safeItems = Array.isArray(items) ? items : [];
            const files = safeItems.filter(i => i.type === 'file').length;
            const links = safeItems.filter(i => i.type === 'link').length;
            const notes = safeItems.filter(i => i.type === 'note').length;
            counts[sub.id] = { total: safeItems.length, files, links, notes };
        }
        setVaultCounts(counts);
    }, [subjects]);

    useEffect(() => {
        loadAllVaultCounts();
    }, [loadAllVaultCounts]);

    // Load vault items for the selected subject
    const loadVaultItems = useCallback(async () => {
        if (!selectedSubject) return;
        const items = await DB.getVaultItems(selectedSubject.id);
        setVaultItems(items);
    }, [selectedSubject]);

    useEffect(() => {
        if (selectedSubject) {
            loadVaultItems();
        }
    }, [selectedSubject, loadVaultItems]);

    // Helper to determine exact MIME type from file extension
    const getMimeType = (filename, mimeType) => {
        if (mimeType && mimeType !== '*/*' && mimeType.includes('/')) {
            return mimeType;
        }
        const ext = filename ? filename.split('.').pop().toLowerCase() : '';
        switch (ext) {
            case 'pdf': return 'application/pdf';
            case 'jpg':
            case 'jpeg': return 'image/jpeg';
            case 'png': return 'image/png';
            case 'gif': return 'image/gif';
            case 'webp': return 'image/webp';
            case 'txt': return 'text/plain';
            case 'html': return 'text/html';
            case 'doc': return 'application/msword';
            case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            case 'ppt': return 'application/vnd.ms-powerpoint';
            case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
            case 'xls': return 'application/vnd.ms-excel';
            case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            case 'zip': return 'application/zip';
            case 'mp4': return 'video/mp4';
            case 'mp3': return 'audio/mpeg';
            default: return 'application/octet-stream';
        }
    };

    // === Vault Operations (extracted from SubjectDetailScreen) ===

    const handlePickFileAndUpload = async () => {
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

                const detectedMime = getMimeType(cleanFileName, asset.mimeType);

                const newItem = {
                    id: DB.generateUUID(),
                    subjectId: selectedSubject.id,
                    title: cleanFileName,
                    type: 'file',
                    uri: destUri,
                    mimeType: detectedMime,
                    dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                };

                const updated = [newItem, ...vaultItems];
                await DB.saveVaultItems(selectedSubject.id, updated);
                setVaultItems(updated);
                Alert.alert('File Added!', `"${cleanFileName}" is stored in ${selectedSubject.name} Vault.`);
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
            await DB.saveVaultItems(selectedSubject.id, updated);
            setVaultItems(updated);
            setResourceModalVisible(false);
            Alert.alert('Updated', 'Resource display name updated successfully.');
            return;
        }

        const newItem = {
            id: DB.generateUUID(),
            subjectId: selectedSubject.id,
            title: resourceTitle.trim(),
            type: resourceType,
            uri: resourceUri.trim(),
            dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        };

        const updated = [newItem, ...vaultItems];
        await DB.saveVaultItems(selectedSubject.id, updated);
        setVaultItems(updated);
        setResourceModalVisible(false);
    };

    const handleOpenResource = async (item) => {
        try {
            if (item.type === 'file') {
                const info = await FileSystem.getInfoAsync(item.uri);
                if (!info.exists) {
                    Alert.alert('File Missing', `The file "${item.title}" could not be found on local device storage.`);
                    return;
                }

                const mime = getMimeType(item.title, item.mimeType);

                if (Platform.OS === 'android' && IntentLauncher && typeof IntentLauncher.startActivityAsync === 'function') {
                    try {
                        const contentUri = await FileSystem.getContentUriAsync(item.uri);
                        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                            data: contentUri,
                            type: mime,
                            flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
                        });
                        return;
                    } catch (intentErr) {
                        console.error('IntentLauncher error, falling back to Sharing', intentErr);
                    }
                }

                // Fallback for iOS or if IntentLauncher fails
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(item.uri, {
                        mimeType: mime,
                        dialogTitle: `Open ${item.title}`
                    });
                } else {
                    Alert.alert('File Location', item.uri);
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

    const handleShareResource = async (item) => {
        try {
            const mime = getMimeType(item.title, item.mimeType);
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(item.uri, {
                    mimeType: mime,
                    dialogTitle: `Share ${item.title}`
                });
            } else {
                Alert.alert('File Location', item.uri);
            }
        } catch (e) {
            console.error('Error sharing resource', e);
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
                        await DB.saveVaultItems(selectedSubject.id, updated);
                        setVaultItems(updated);
                    }
                }
            ]
        );
    };

    const handleGoBackFromFiles = () => {
        setSelectedSubject(null);
        setVaultItems([]);
        loadAllVaultCounts(); // refresh counts
    };

    // === RENDER: Subject Vault File List ===
    if (selectedSubject) {
        return (
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={handleGoBackFromFiles} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Vault</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
                        <TouchableOpacity 
                            style={[styles.headerActionBtn, { backgroundColor: colors.gold }]}
                            onPress={handlePickFileAndUpload}
                        >
                            <Text style={[styles.headerActionBtnText, { color: colors.bgPrimary }]}>📄 Upload</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.headerActionBtn, { borderWidth: 1, borderColor: colors.gold }]}
                            onPress={() => handleOpenAddResource('link')}
                        >
                            <Text style={[styles.headerActionBtnText, { color: colors.gold }]}>🔗 Link</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.headerActionBtn}
                            onPress={() => handleOpenAddResource('note')}
                        >
                            <Text style={styles.headerActionBtnText}>📝 Note</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Subject Banner */}
                    <View style={[styles.subjectBanner, { borderLeftColor: selectedSubject.color }]}>
                        <View style={[styles.colorDot, { backgroundColor: selectedSubject.color }]} />
                        <Text style={styles.subjectBannerName}>{selectedSubject.name}</Text>
                        <View style={[styles.badge, { backgroundColor: `${selectedSubject.color}20` }]}>
                            <Text style={[styles.badgeText, { color: selectedSubject.color }]}>{selectedSubject.shortName}</Text>
                        </View>
                    </View>

                    {/* File List */}
                    {vaultItems.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={{ fontSize: 42, marginBottom: 10 }}>🏛️</Text>
                            <Text style={styles.emptyTitle}>Vault is Empty</Text>
                            <Text style={styles.emptyDesc}>
                                Upload textbooks, PDF notes, drive links, or exam reminders for {selectedSubject.name}.
                            </Text>
                        </View>
                    ) : (
                        vaultItems.map(item => (
                            <View key={item.id} style={styles.vaultItemRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                    <Text style={{ fontSize: 24 }}>
                                        {item.type === 'file' ? '📄' : item.type === 'link' ? '🔗' : '📝'}
                                    </Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.vaultItemTitle} numberOfLines={2}>
                                            {item.title}
                                        </Text>
                                        <Text style={styles.vaultItemMeta}>
                                            {item.type.toUpperCase()} • Added {item.dateAdded}
                                        </Text>
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <TouchableOpacity 
                                        style={styles.itemActionBtn}
                                        onPress={() => handleOpenResource(item)}
                                    >
                                        <Text style={styles.itemActionBtnText}>📖 Open</Text>
                                    </TouchableOpacity>

                                    {item.type === 'file' && (
                                        <TouchableOpacity 
                                            style={styles.itemActionBtn}
                                            onPress={() => handleShareResource(item)}
                                        >
                                            <Text style={styles.itemActionBtnText}>📤</Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity 
                                        style={styles.itemActionBtn}
                                        onPress={() => handleOpenRenameModal(item)}
                                    >
                                        <Text style={styles.itemActionBtnText}>✏️</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={[styles.itemActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
                                        onPress={() => handleDeleteResource(item.id)}
                                    >
                                        <Text style={{ color: '#EF4444', fontFamily: fonts.headingBold, fontSize: 11 }}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>

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
                                    <Text style={[styles.resourceModalBtnText, { color: colors.bgPrimary }]}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    // === RENDER: Subject Picker Grid ===
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.topNav}>
                <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Subjects</Text>
                </TouchableOpacity>
                <Text style={styles.screenTitle}>🏛️ Vault</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {subjects.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={{ fontSize: 42, marginBottom: 10 }}>🏛️</Text>
                        <Text style={styles.emptyTitle}>No Subjects Yet</Text>
                        <Text style={styles.emptyDesc}>
                            Add subjects first, then come here to store files, links, and notes for each one.
                        </Text>
                    </View>
                ) : (
                    subjects.map(sub => {
                        const counts = vaultCounts[sub.id] || { total: 0, files: 0, links: 0, notes: 0 };
                        return (
                            <TouchableOpacity 
                                key={sub.id} 
                                style={[styles.subjectPickerCard, { borderLeftColor: sub.color }]}
                                onPress={() => setSelectedSubject(sub)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.pickerCardHeader}>
                                    <View style={styles.pickerTitleGroup}>
                                        <View style={[styles.colorDot, { backgroundColor: sub.color }]} />
                                        <Text style={styles.pickerCardName} numberOfLines={1}>{sub.name}</Text>
                                        <View style={[styles.badge, { backgroundColor: `${sub.color}20` }]}>
                                            <Text style={[styles.badgeText, { color: sub.color }]}>{sub.shortName}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.pickerArrow}>→</Text>
                                </View>

                                <View style={styles.pickerCardStats}>
                                    {counts.total === 0 ? (
                                        <Text style={styles.pickerEmptyText}>No items yet</Text>
                                    ) : (
                                        <View style={styles.pickerCountRow}>
                                            {counts.files > 0 && (
                                                <View style={styles.pickerCountPill}>
                                                    <Text style={styles.pickerCountPillText}>📄 {counts.files} file{counts.files !== 1 ? 's' : ''}</Text>
                                                </View>
                                            )}
                                            {counts.links > 0 && (
                                                <View style={styles.pickerCountPill}>
                                                    <Text style={styles.pickerCountPillText}>🔗 {counts.links} link{counts.links !== 1 ? 's' : ''}</Text>
                                                </View>
                                            )}
                                            {counts.notes > 0 && (
                                                <View style={styles.pickerCountPill}>
                                                    <Text style={styles.pickerCountPillText}>📝 {counts.notes} note{counts.notes !== 1 ? 's' : ''}</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    topNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 12,
    },
    backButton: {
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
    },
    backButtonText: {
        fontFamily: fonts.heading,
        fontSize: 13,
        color: colors.cream,
    },
    screenTitle: {
        fontFamily: fonts.headingBold,
        fontSize: 20,
        color: colors.gold,
    },
    scrollContent: {
        padding: 20,
        paddingTop: 6,
        paddingBottom: 40,
    },

    // Header action buttons (file list view)
    headerActionBtn: {
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
    },
    headerActionBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 11,
        color: colors.cream,
    },

    // Subject Picker Cards
    subjectPickerCard: {
        backgroundColor: colors.bgSecondary,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
        borderLeftWidth: 4,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    pickerCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    pickerTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    colorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    pickerCardName: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.cream,
        flexShrink: 1,
        marginRight: 6,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    badgeText: {
        fontFamily: fonts.headingBold,
        fontSize: 10,
    },
    pickerArrow: {
        fontFamily: fonts.headingBold,
        fontSize: 16,
        color: colors.gold,
    },
    pickerCardStats: {
        paddingLeft: 16,
    },
    pickerEmptyText: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    pickerCountRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    pickerCountPill: {
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    pickerCountPillText: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.textSecondary,
    },

    // Subject Banner (file list view)
    subjectBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: 16,
        borderLeftWidth: 4,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
    },
    subjectBannerName: {
        fontFamily: fonts.headingBold,
        fontSize: 17,
        color: colors.cream,
        flex: 1,
        marginRight: 8,
    },

    // Vault Item Rows
    vaultItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.02)',
        marginBottom: 8,
    },
    vaultItemTitle: {
        fontFamily: fonts.heading,
        fontSize: 13,
        color: colors.cream,
    },
    vaultItemMeta: {
        fontFamily: fonts.body,
        fontSize: 10,
        color: colors.gold,
        marginTop: 2,
    },
    itemActionBtn: {
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 10,
    },
    itemActionBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 11,
        color: colors.cream,
    },

    // Empty State
    emptyState: {
        backgroundColor: colors.bgSecondary,
        borderRadius: 24,
        alignItems: 'center',
        paddingVertical: 50,
        paddingHorizontal: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
        borderStyle: 'dashed',
        marginTop: 20,
    },
    emptyTitle: {
        fontFamily: fonts.headingBold,
        fontSize: 17,
        color: colors.cream,
        marginBottom: 8,
    },
    emptyDesc: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },

    // Resource Form Modal
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
    },
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
    },
});
