/**
 * Subject Detail, Syllabus Catalog & Resource Vault Screen
 * Manages modules, topics, dual progress tracking, and subject resource vault.
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
    KeyboardAvoidingView,
    Platform,
    Modal,
    Linking
} from 'react-native';
import { colors, fonts } from '../styles/theme';
import * as DB from '../database/storage';
import BottomSheet from '../components/BottomSheet';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

export default function SubjectDetailScreen({ subject, onGoBack }) {
    // Active Tab state: 'modules' | 'vault'
    const [activeTab, setActiveTab] = useState('modules');

    const [modules, setModules] = useState([]);
    const [moduleModalVisible, setModuleModalVisible] = useState(false);
    const [newModuleName, setNewModuleName] = useState('');
    const [expandedModuleId, setExpandedModuleId] = useState(null);

    // Topic adding state per module
    const [addingTopicModuleId, setAddingTopicModuleId] = useState(null);
    const [newTopicTitle, setNewTopicTitle] = useState('');

    // Smart Bulk Parse state
    const [bulkModalVisible, setBulkModalVisible] = useState(false);
    const [bulkText, setBulkText] = useState('');

    // Editing state
    const [editingModuleId, setEditingModuleId] = useState(null);
    const [editingModuleName, setEditingModuleName] = useState('');
    const [editingTopicKey, setEditingTopicKey] = useState(null); // "modId_topicId"
    const [editingTopicTitle, setEditingTopicTitle] = useState('');

    // Vault States
    const [vaultItems, setVaultItems] = useState([]);
    const [resourceModalVisible, setResourceModalVisible] = useState(false);
    const [resourceType, setResourceType] = useState('link'); // 'link' | 'note' | 'file'
    const [resourceTitle, setResourceTitle] = useState('');
    const [resourceUri, setResourceUri] = useState('');
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        loadCatalogs();
        loadVaultItems();
    }, [subject.id]);

    const loadCatalogs = async () => {
        const loaded = await DB.getCatalogs(subject.id);
        setModules(loaded);
        if (loaded.length > 0 && !expandedModuleId) {
            setExpandedModuleId(loaded[0].id);
        }
    };

    const loadVaultItems = async () => {
        const items = await DB.getVaultItems(subject.id);
        setVaultItems(items);
    };

    const persistModules = async (updatedList) => {
        setModules(updatedList);
        await DB.saveCatalogs(subject.id, updatedList);
    };

    const handleAddModule = async () => {
        if (!newModuleName.trim()) {
            Alert.alert('Missing Name', 'Please enter a name for the module (e.g. Module 1).');
            return;
        }

        const newMod = {
            id: DB.generateUUID(),
            name: newModuleName.trim(),
            topics: []
        };

        const updated = [...modules, newMod];
        await persistModules(updated);
        setNewModuleName('');
        setModuleModalVisible(false);
        setExpandedModuleId(newMod.id);
    };

    const handleDeleteModule = (modId, modName) => {
        Alert.alert(
            'Delete Module',
            `Are you sure you want to delete "${modName}" and all its syllabus topics?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        const updated = modules.filter(m => m.id !== modId);
                        await persistModules(updated);
                    }
                }
            ]
        );
    };

    const handleAddTopic = async (modId) => {
        if (!newTopicTitle.trim()) {
            Alert.alert('Missing Topic', 'Please enter a topic title.');
            return;
        }

        const updated = modules.map(mod => {
            if (mod.id === modId) {
                return {
                    ...mod,
                    topics: [
                        ...mod.topics,
                        {
                            id: DB.generateUUID(),
                            title: newTopicTitle.trim(),
                            classCovered: false,
                            selfCovered: false
                        }
                    ]
                };
            }
            return mod;
        });

        await persistModules(updated);
        setNewTopicTitle('');
        setAddingTopicModuleId(null);
    };

    const handleSmartParse = async () => {
        if (!bulkText.trim()) {
            Alert.alert('Empty', 'Please paste the syllabus text first.');
            return;
        }

        const blocks = bulkText.split(/\n\s*\n/);
        let newModules = [...modules];

        blocks.forEach(block => {
            const trimmed = block.trim();
            if (!trimmed) return;

            const fullText = trimmed.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

            let moduleName = '';
            let topicsText = '';

            const colonIndex = fullText.indexOf(':');
            if (colonIndex > 0 && colonIndex < 100) {
                moduleName = fullText.substring(0, colonIndex).trim();
                topicsText = fullText.substring(colonIndex + 1).trim();
            } else {
                const periodIndex = fullText.indexOf('.');
                if (periodIndex > 0 && periodIndex < 80) {
                    moduleName = fullText.substring(0, periodIndex).trim();
                    topicsText = fullText.substring(periodIndex + 1).trim();
                } else {
                    moduleName = fullText.length > 60 ? fullText.substring(0, 60).trim() : fullText;
                    topicsText = fullText;
                }
            }

            moduleName = moduleName.replace(/:$/, '').replace(/\*\*?/g, '').trim();

            const newMod = {
                id: DB.generateUUID(),
                name: moduleName,
                topics: []
            };

            const hyphenCount = (topicsText.match(/[-–]/g) || []).length;
            const commaCount = (topicsText.match(/,/g) || []).length;
            const semiCount = (topicsText.match(/;/g) || []).length;

            let delimiter;
            if (hyphenCount >= commaCount && hyphenCount >= semiCount && hyphenCount > 0) {
                delimiter = /[-–]+/;
            } else {
                delimiter = /[,;]+/;
            }

            const rawTopics = topicsText.split(delimiter);
            rawTopics.forEach(t => {
                let cleanTopic = t.trim()
                    .replace(/\*\*?/g, '')
                    .replace(/^[-–]\s*/, '')
                    .replace(/\.\s*$/, '')
                    .trim();
                if (cleanTopic.length > 1) {
                    newMod.topics.push({
                        id: DB.generateUUID(),
                        title: cleanTopic,
                        classCovered: false,
                        selfCovered: false
                    });
                }
            });

            if (newMod.topics.length > 0 || moduleName.length > 0) {
                newModules.push(newMod);
            }
        });

        await persistModules(newModules);
        setBulkModalVisible(false);
        setBulkText('');
    };

    const handleToggleCoverage = async (modId, topicId, field) => {
        const updated = modules.map(mod => {
            if (mod.id === modId) {
                const updatedTopics = mod.topics.map(topic => {
                    if (topic.id === topicId) {
                        return {
                            ...topic,
                            [field]: !topic[field]
                        };
                    }
                    return topic;
                });
                return { ...mod, topics: updatedTopics };
            }
            return mod;
        });

        await persistModules(updated);
    };

    const handleDeleteTopic = async (modId, topicId) => {
        const updated = modules.map(mod => {
            if (mod.id === modId) {
                return {
                    ...mod,
                    topics: mod.topics.filter(t => t.id !== topicId)
                };
            }
            return mod;
        });

        await persistModules(updated);
    };

    const handleSaveModuleName = async (modId) => {
        if (!editingModuleName.trim()) {
            setEditingModuleId(null);
            return;
        }
        const updated = modules.map(mod => {
            if (mod.id === modId) {
                return { ...mod, name: editingModuleName.trim() };
            }
            return mod;
        });
        await persistModules(updated);
        setEditingModuleId(null);
        setEditingModuleName('');
    };

    const handleSaveTopicTitle = async (modId, topicId) => {
        if (!editingTopicTitle.trim()) {
            setEditingTopicKey(null);
            return;
        }
        const updated = modules.map(mod => {
            if (mod.id === modId) {
                const updatedTopics = mod.topics.map(topic => {
                    if (topic.id === topicId) {
                        return { ...topic, title: editingTopicTitle.trim() };
                    }
                    return topic;
                });
                return { ...mod, topics: updatedTopics };
            }
            return mod;
        });
        await persistModules(updated);
        setEditingTopicKey(null);
        setEditingTopicTitle('');
    };

    // Vault Functions
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

                const newItem = {
                    id: DB.generateUUID(),
                    subjectId: subject.id,
                    title: cleanFileName,
                    type: 'file',
                    uri: destUri,
                    mimeType: asset.mimeType || '',
                    dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                };

                const updated = [newItem, ...vaultItems];
                await DB.saveVaultItems(subject.id, updated);
                setVaultItems(updated);
                Alert.alert('File Added!', `"${cleanFileName}" is stored in ${subject.name} Vault.`);
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
            await DB.saveVaultItems(subject.id, updated);
            setVaultItems(updated);
            setResourceModalVisible(false);
            Alert.alert('Updated', 'Resource display name updated successfully.');
            return;
        }

        const newItem = {
            id: DB.generateUUID(),
            subjectId: subject.id,
            title: resourceTitle.trim(),
            type: resourceType,
            uri: resourceUri.trim(),
            dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        };

        const updated = [newItem, ...vaultItems];
        await DB.saveVaultItems(subject.id, updated);
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
                        await DB.saveVaultItems(subject.id, updated);
                        setVaultItems(updated);
                    }
                }
            ]
        );
    };

    // Calculate Overall Syllabus Stats
    let totalTopics = 0;
    let totalClassCovered = 0;
    let totalSelfCovered = 0;

    modules.forEach(m => {
        (m.topics || []).forEach(t => {
            totalTopics += 1;
            if (t.classCovered) totalClassCovered += 1;
            if (t.selfCovered) totalSelfCovered += 1;
        });
    });

    const classPct = totalTopics > 0 ? Math.round((totalClassCovered / totalTopics) * 100) : 0;
    const selfPct = totalTopics > 0 ? Math.round((totalSelfCovered / totalTopics) * 100) : 0;

    return (
        <View style={styles.container}>
            {/* Header bar */}
            <View style={styles.topNav}>
                <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity 
                        style={[styles.addModHeaderBtn, { backgroundColor: activeTab === 'vault' ? colors.gold : colors.bgTertiary }]}
                        onPress={() => setActiveTab(activeTab === 'vault' ? 'modules' : 'vault')}
                    >
                        <Text style={[styles.addModHeaderBtnText, { color: colors.cream }]}>
                            {activeTab === 'vault' ? '📚 Syllabus' : '🏛️ Vault'}
                        </Text>
                    </TouchableOpacity>

                    {activeTab === 'modules' ? (
                        <>
                            <TouchableOpacity 
                                style={[styles.addModHeaderBtn, { backgroundColor: colors.accent }]}
                                onPress={() => setBulkModalVisible(true)}
                            >
                                <Text style={styles.addModHeaderBtnText}>+ Smart Paste</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.addModHeaderBtn}
                                onPress={() => setModuleModalVisible(true)}
                            >
                                <Text style={styles.addModHeaderBtnText}>+ Module</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.addModHeaderBtn, { backgroundColor: colors.gold }]}
                            onPress={handlePickFileAndUpload}
                        >
                            <Text style={[styles.addModHeaderBtnText, { color: colors.cream }]}>📄 Upload File</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Subject Banner Card */}
                    <View style={[styles.bannerCard, { borderTopColor: subject.color }]}>
                        <View style={styles.bannerHeader}>
                            <View style={styles.bannerTitleRow}>
                                <View style={[styles.colorDot, { backgroundColor: subject.color }]} />
                                <Text style={styles.subjectName}>{subject.name}</Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: `${subject.color}20` }]}>
                                <Text style={[styles.badgeText, { color: subject.color }]}>{subject.shortName}</Text>
                            </View>
                        </View>

                        {/* Progress Breakdown */}
                        <View style={styles.statsSummary}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryValue}>{classPct}%</Text>
                                <Text style={styles.summaryLabel}>🏫 Class Covered</Text>
                                <View style={styles.miniProgressBg}>
                                    <View style={[styles.miniProgressFill, { width: `${classPct}%`, backgroundColor: colors.gold }]} />
                                </View>
                            </View>

                            <View style={styles.summaryDivider} />

                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryValue}>{selfPct}%</Text>
                                <Text style={styles.summaryLabel}>🧠 Self Studied</Text>
                                <View style={styles.miniProgressBg}>
                                    <View style={[styles.miniProgressFill, { width: `${selfPct}%`, backgroundColor: colors.optimal }]} />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Mode Switcher Tabs */}
                    <View style={styles.tabBarRow}>
                        <TouchableOpacity 
                            style={[styles.tabCapsule, activeTab === 'modules' && styles.tabCapsuleActive]}
                            onPress={() => setActiveTab('modules')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabCapsuleText, activeTab === 'modules' && styles.tabCapsuleTextActive]}>
                                📚 Syllabus ({modules.length} Modules)
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.tabCapsule, activeTab === 'vault' && styles.tabCapsuleActive]}
                            onPress={() => setActiveTab('vault')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabCapsuleText, activeTab === 'vault' && styles.tabCapsuleTextActive]}>
                                🏛️ Vault ({vaultItems.length} Items)
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Active Tab View */}
                    {activeTab === 'vault' ? (
                        <View style={styles.vaultWindowContainer}>
                            {/* Vault Quick Action Bar */}
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
                            {vaultItems.length === 0 ? (
                                <View style={styles.vaultEmptyState}>
                                    <Text style={{ fontSize: 36, marginBottom: 8 }}>🏛️</Text>
                                    <Text style={styles.vaultEmptyStateTitle}>Vault is Empty</Text>
                                    <Text style={styles.vaultEmptyStateDesc}>
                                        Upload textbooks, PDF notes, drive links, or exam reminders for {subject.name}.
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
                                ))
                            )}
                        </View>
                    ) : (
                        <View>
                            {/* Section Header */}
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Syllabus Catalog ({modules.length} Modules)</Text>
                                <Text style={styles.sectionSubtext}>Track class topics & personal preparation</Text>
                            </View>

                            {modules.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyTitle}>No Modules Added</Text>
                                    <Text style={styles.emptyDesc}>Tap "+ Module" above to add your syllabus units (e.g. Module 1: Introduction, Module 2: Deep Learning).</Text>
                                    <TouchableOpacity 
                                        style={styles.emptyAddBtn}
                                        onPress={() => setModuleModalVisible(true)}
                                    >
                                        <Text style={styles.emptyAddBtnText}>+ Add First Module</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                modules.map((mod) => {
                                    const isExpanded = expandedModuleId === mod.id;
                                    const modTopics = mod.topics || [];
                                    const modClassDone = modTopics.filter(t => t.classCovered).length;
                                    const modSelfDone = modTopics.filter(t => t.selfCovered).length;

                                    return (
                                        <View key={mod.id} style={styles.moduleCard}>
                                            {/* Module Header */}
                                            <TouchableOpacity 
                                                style={styles.moduleHeader}
                                                onPress={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                                                activeOpacity={0.8}
                                            >
                                                <View style={styles.moduleTitleGroup}>
                                                    <Text style={styles.moduleExpandIcon}>{isExpanded ? '▼' : '►'}</Text>
                                                    {editingModuleId === mod.id ? (
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                            <TextInput
                                                                style={[styles.moduleName, { borderBottomWidth: 1, borderBottomColor: colors.gold, flex: 1, padding: 0 }]}
                                                                value={editingModuleName}
                                                                onChangeText={setEditingModuleName}
                                                                autoFocus
                                                                onSubmitEditing={() => handleSaveModuleName(mod.id)}
                                                                onBlur={() => handleSaveModuleName(mod.id)}
                                                            />
                                                        </View>
                                                    ) : (
                                                        <TouchableOpacity
                                                            onLongPress={() => { setEditingModuleId(mod.id); setEditingModuleName(mod.name); }}
                                                            activeOpacity={0.7}
                                                            style={{ flex: 1 }}
                                                        >
                                                            <Text style={styles.moduleName}>{mod.name}</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>

                                                <View style={styles.moduleMeta}>
                                                    <Text style={styles.moduleCountText}>{modTopics.length} topics</Text>
                                                    <TouchableOpacity 
                                                        onPress={() => handleDeleteModule(mod.id, mod.name)}
                                                        style={styles.modDeleteBtn}
                                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                    >
                                                        <Text style={styles.modDeleteText}>×</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </TouchableOpacity>

                                            {/* Module Progress Bar & Open/Close Toggle */}
                                            <View style={styles.moduleProgressRow}>
                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                    <View style={styles.modulePill}>
                                                        <Text style={styles.modulePillText}>Class: {modClassDone}/{modTopics.length}</Text>
                                                    </View>
                                                    <View style={[styles.modulePill, { backgroundColor: `${colors.optimal}20` }]}>
                                                        <Text style={[styles.modulePillText, { color: colors.optimal }]}>Self: {modSelfDone}/{modTopics.length}</Text>
                                                    </View>
                                                </View>

                                                <TouchableOpacity 
                                                    style={styles.openCloseBtn}
                                                    onPress={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={styles.openCloseBtnText}>{isExpanded ? 'Close ▲' : 'Open ▼'}</Text>
                                                </TouchableOpacity>
                                            </View>

                                            {/* Expanded Topics View */}
                                            {isExpanded && (
                                                <View style={styles.topicsContainer}>
                                                    {/* Legend Header */}
                                                    <View style={styles.legendRow}>
                                                        <Text style={styles.legendTitle}>Topic Name</Text>
                                                        <View style={styles.legendCheckboxes}>
                                                            <Text style={styles.legendCheckLabel}>Class</Text>
                                                            <Text style={styles.legendCheckLabel}>Self</Text>
                                                        </View>
                                                    </View>

                                                    {modTopics.length === 0 ? (
                                                        <Text style={styles.emptyTopicsText}>No topics in this module yet.</Text>
                                                    ) : (
                                                        modTopics.map(topic => (
                                                            <View key={topic.id} style={styles.topicRow}>
                                                                <TouchableOpacity 
                                                                    style={styles.topicDeleteBtn}
                                                                    onPress={() => handleDeleteTopic(mod.id, topic.id)}
                                                                >
                                                                    <Text style={styles.topicDeleteText}>-</Text>
                                                                </TouchableOpacity>

                                                                {editingTopicKey === `${mod.id}_${topic.id}` ? (
                                                                    <TextInput
                                                                        style={[styles.topicTitle, { borderBottomWidth: 1, borderBottomColor: colors.gold, flex: 1, padding: 0 }]}
                                                                        value={editingTopicTitle}
                                                                        onChangeText={setEditingTopicTitle}
                                                                        autoFocus
                                                                        onSubmitEditing={() => handleSaveTopicTitle(mod.id, topic.id)}
                                                                        onBlur={() => handleSaveTopicTitle(mod.id, topic.id)}
                                                                    />
                                                                ) : (
                                                                    <TouchableOpacity
                                                                        onLongPress={() => { setEditingTopicKey(`${mod.id}_${topic.id}`); setEditingTopicTitle(topic.title); }}
                                                                        activeOpacity={0.7}
                                                                        style={{ flex: 1 }}
                                                                    >
                                                                        <Text style={styles.topicTitle}>{topic.title}</Text>
                                                                    </TouchableOpacity>
                                                                )}

                                                                <View style={styles.checkboxGroup}>
                                                                    {/* Checkbox 1: Class Coverage */}
                                                                    <TouchableOpacity 
                                                                        style={[
                                                                            styles.checkbox, 
                                                                            topic.classCovered && styles.checkboxClassActive
                                                                        ]}
                                                                        onPress={() => handleToggleCoverage(mod.id, topic.id, 'classCovered')}
                                                                        activeOpacity={0.7}
                                                                    >
                                                                        <Text style={styles.checkboxIcon}>
                                                                            {topic.classCovered ? '✓' : ''}
                                                                        </Text>
                                                                    </TouchableOpacity>

                                                                    {/* Checkbox 2: Personal Coverage */}
                                                                    <TouchableOpacity 
                                                                        style={[
                                                                            styles.checkbox, 
                                                                            topic.selfCovered && styles.checkboxSelfActive
                                                                        ]}
                                                                        onPress={() => handleToggleCoverage(mod.id, topic.id, 'selfCovered')}
                                                                        activeOpacity={0.7}
                                                                    >
                                                                        <Text style={styles.checkboxIcon}>
                                                                            {topic.selfCovered ? '✓' : ''}
                                                                        </Text>
                                                                    </TouchableOpacity>
                                                                </View>
                                                            </View>
                                                        ))
                                                    )}

                                                    {/* Inline Add Topic Form */}
                                                    {addingTopicModuleId === mod.id ? (
                                                        <View style={styles.inlineAddTopicForm}>
                                                            <TextInput 
                                                                style={styles.inlineInput}
                                                                placeholder="Enter topic name..."
                                                                placeholderTextColor={colors.textMuted}
                                                                value={newTopicTitle}
                                                                onChangeText={setNewTopicTitle}
                                                                autoFocus
                                                            />
                                                            <TouchableOpacity 
                                                                style={styles.inlineAddBtn}
                                                                onPress={() => handleAddTopic(mod.id)}
                                                            >
                                                                <Text style={styles.inlineAddBtnText}>Add</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity 
                                                                style={styles.inlineCancelBtn}
                                                                onPress={() => { setAddingTopicModuleId(null); setNewTopicTitle(''); }}
                                                            >
                                                                <Text style={styles.inlineCancelBtnText}>Cancel</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    ) : (
                                                        <TouchableOpacity 
                                                            style={styles.addTopicTrigger}
                                                            onPress={() => { setAddingTopicModuleId(mod.id); setNewTopicTitle(''); }}
                                                        >
                                                            <Text style={styles.addTopicTriggerText}>+ Add Topic to {mod.name}</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modal for Smart Bulk Paste */}
            <BottomSheet visible={bulkModalVisible} onClose={() => setBulkModalVisible(false)}>
                <Text style={styles.sheetTitle}>Smart Bulk Paste</Text>
                <Text style={{ fontFamily: fonts.body, color: colors.textMuted, fontSize: 13, marginBottom: 15 }}>
                    Paste the entire syllabus text (e.g. from an image). The app will automatically group Modules and Topics. 
                    Separate Modules with double-spaces (or a new line) and separate Topics with commas.
                </Text>
                <View style={styles.formGroup}>
                    <TextInput 
                        style={[styles.sheetInput, { height: 150, textAlignVertical: 'top' }]}
                        placeholder="Paste syllabus text here..."
                        placeholderTextColor={colors.textMuted}
                        value={bulkText}
                        onChangeText={setBulkText}
                        multiline
                    />
                </View>
                <View style={styles.sheetActions}>
                    <TouchableOpacity 
                        style={styles.sheetCancelBtn}
                        onPress={() => setBulkModalVisible(false)}
                    >
                        <Text style={styles.sheetCancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.sheetSaveBtn}
                        onPress={handleSmartParse}
                    >
                        <Text style={styles.sheetSaveBtnText}>Parse & Save</Text>
                    </TouchableOpacity>
                </View>
            </BottomSheet>

            {/* Modal to Add Module */}
            <BottomSheet visible={moduleModalVisible} onClose={() => setModuleModalVisible(false)}>
                <Text style={styles.sheetTitle}>New Module Catalog</Text>
                <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Module Name / Unit</Text>
                    <TextInput 
                        style={styles.sheetInput}
                        placeholder="e.g. Module 1: Core Fundamentals"
                        placeholderTextColor={colors.textMuted}
                        value={newModuleName}
                        onChangeText={setNewModuleName}
                    />
                </View>
                <View style={styles.sheetActions}>
                    <TouchableOpacity 
                        style={styles.sheetCancelBtn}
                        onPress={() => setModuleModalVisible(false)}
                    >
                        <Text style={styles.sheetCancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.sheetSaveBtn}
                        onPress={handleAddModule}
                    >
                        <Text style={styles.sheetSaveBtnText}>Save Module</Text>
                    </TouchableOpacity>
                </View>
            </BottomSheet>

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
    addModHeaderBtn: {
        backgroundColor: colors.gold,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
    },
    addModHeaderBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 13,
        color: colors.cream,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    bannerCard: {
        backgroundColor: colors.bgSecondary,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.02)',
        borderTopWidth: 4,
        padding: 18,
        marginBottom: 16,
    },
    bannerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    bannerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    colorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    subjectName: {
        fontFamily: fonts.headingBold,
        fontSize: 22,
        color: colors.cream,
        flexShrink: 1,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontFamily: fonts.headingBold,
        fontSize: 12,
    },
    statsSummary: {
        flexDirection: 'row',
        backgroundColor: colors.bgTertiary,
        borderRadius: 16,
        padding: 14,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryValue: {
        fontFamily: fonts.headingBold,
        fontSize: 20,
        color: colors.cream,
        marginBottom: 2,
    },
    summaryLabel: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    summaryDivider: {
        width: 1,
        height: 36,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginHorizontal: 10,
    },
    miniProgressBg: {
        width: '80%',
        height: 4,
        backgroundColor: colors.bgPrimary,
        borderRadius: 2,
        overflow: 'hidden',
    },
    miniProgressFill: {
        height: '100%',
        borderRadius: 2,
    },

    // Mode Switcher Capsule Tabs
    tabBarRow: {
        flexDirection: 'row',
        backgroundColor: colors.bgSecondary,
        borderRadius: 18,
        padding: 4,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
    },
    tabCapsule: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 14,
        alignItems: 'center',
    },
    tabCapsuleActive: {
        backgroundColor: colors.bgTertiary,
        borderWidth: 1,
        borderColor: colors.gold,
    },
    tabCapsuleText: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.textSecondary,
    },
    tabCapsuleTextActive: {
        fontFamily: fonts.headingBold,
        color: colors.gold,
    },

    // Vault Window Styles
    vaultWindowContainer: {
        gap: 12,
    },
    vaultActionBar: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
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
        backgroundColor: colors.bgSecondary,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.02)',
        marginBottom: 8,
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
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 10,
    },
    vaultItemActionBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 11,
        color: colors.cream,
    },
    vaultEmptyState: {
        backgroundColor: colors.bgSecondary,
        borderRadius: 24,
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
        borderStyle: 'dashed',
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

    sectionHeader: {
        marginBottom: 14,
    },
    sectionTitle: {
        fontFamily: fonts.headingBold,
        fontSize: 18,
        color: colors.cream,
    },
    sectionSubtext: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textSecondary,
    },
    emptyContainer: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
        borderStyle: 'dashed',
        borderRadius: 24,
        paddingVertical: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginTop: 10,
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
        marginBottom: 16,
    },
    emptyAddBtn: {
        backgroundColor: colors.gold,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 16,
    },
    emptyAddBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 13,
        color: colors.cream,
    },
    moduleCard: {
        backgroundColor: colors.bgSecondary,
        borderRadius: 20,
        marginBottom: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.02)',
    },
    moduleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    moduleTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    moduleExpandIcon: {
        color: colors.gold,
        fontSize: 12,
        marginRight: 10,
    },
    moduleName: {
        fontFamily: fonts.headingBold,
        fontSize: 15,
        color: colors.cream,
    },
    moduleMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    moduleCountText: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textMuted,
        marginRight: 10,
    },
    modDeleteBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modDeleteText: {
        color: colors.textMuted,
        fontSize: 16,
        marginTop: -2,
    },
    moduleProgressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    modulePill: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    modulePillText: {
        fontFamily: fonts.bodyBold,
        fontSize: 10,
        color: colors.gold,
    },
    openCloseBtn: {
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    openCloseBtnText: {
        fontFamily: fonts.heading,
        fontSize: 10,
        color: colors.textSecondary,
    },
    topicsContainer: {
        backgroundColor: colors.bgTertiary,
        padding: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.02)',
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.03)',
    },
    legendTitle: {
        fontFamily: fonts.bodyBold,
        fontSize: 11,
        color: colors.textMuted,
    },
    legendCheckboxes: {
        flexDirection: 'row',
        gap: 16,
        paddingRight: 4,
    },
    legendCheckLabel: {
        fontFamily: fonts.bodyBold,
        fontSize: 10,
        color: colors.textMuted,
        width: 32,
        textAlign: 'center',
    },
    emptyTopicsText: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textMuted,
        fontStyle: 'italic',
        marginVertical: 8,
    },
    topicRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.01)',
    },
    topicDeleteBtn: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    topicDeleteText: {
        color: colors.critical,
        fontSize: 14,
        marginTop: -2,
    },
    topicTitle: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.cream,
        flex: 1,
        marginRight: 8,
    },
    checkboxGroup: {
        flexDirection: 'row',
        gap: 16,
    },
    checkbox: {
        width: 32,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.bgPrimary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    checkboxClassActive: {
        backgroundColor: colors.gold,
        borderColor: colors.gold,
    },
    checkboxSelfActive: {
        backgroundColor: colors.optimal,
        borderColor: colors.optimal,
    },
    checkboxIcon: {
        color: colors.cream,
        fontFamily: fonts.headingBold,
        fontSize: 14,
    },
    addTopicTrigger: {
        marginTop: 10,
        paddingVertical: 8,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 12,
    },
    addTopicTriggerText: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.gold,
    },
    inlineAddTopicForm: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
    },
    inlineInput: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        color: colors.cream,
        fontFamily: fonts.body,
        fontSize: 12,
        borderWidth: 1,
        borderColor: colors.gold,
    },
    inlineAddBtn: {
        backgroundColor: colors.gold,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    inlineAddBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 12,
        color: colors.cream,
    },
    inlineCancelBtn: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    inlineCancelBtnText: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textMuted,
    },
    sheetTitle: {
        fontFamily: fonts.headingBold,
        fontSize: 18,
        color: colors.cream,
        marginBottom: 16,
    },
    formGroup: {
        gap: 6,
        marginBottom: 16,
    },
    inputLabel: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textSecondary,
    },
    sheetInput: {
        backgroundColor: colors.bgPrimary,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: colors.cream,
        fontFamily: fonts.body,
        fontSize: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    sheetActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
    },
    sheetCancelBtn: {
        flex: 1,
        backgroundColor: colors.bgTertiary,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
    },
    sheetCancelBtnText: {
        fontFamily: fonts.heading,
        fontSize: 13,
        color: colors.cream,
    },
    sheetSaveBtn: {
        flex: 1,
        backgroundColor: colors.gold,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
    },
    sheetSaveBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 13,
        color: colors.cream,
    }
});
