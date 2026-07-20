/**
 * Subject Detail & Syllabus Catalog Screen
 * Manages modules, topics, and dual progress tracking (Class Coverage & Personal Coverage).
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
    Platform 
} from 'react-native';
import { colors, fonts } from '../styles/theme';
import * as DB from '../database/storage';
import BottomSheet from '../components/BottomSheet';

export default function SubjectDetailScreen({ subject, onGoBack }) {
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

    useEffect(() => {
        loadCatalogs();
    }, [subject.id]);

    const loadCatalogs = async () => {
        const loaded = await DB.getCatalogs(subject.id);
        setModules(loaded);
        if (loaded.length > 0 && !expandedModuleId) {
            setExpandedModuleId(loaded[0].id);
        }
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

        // Split into module blocks by double newlines
        const blocks = bulkText.split(/\n\s*\n/);
        let newModules = [...modules];

        blocks.forEach(block => {
            const trimmed = block.trim();
            if (!trimmed) return;

            // Step 1: Join all lines into a single string (handles image-copy line wraps)
            const fullText = trimmed.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

            let moduleName = '';
            let topicsText = '';

            // Step 2: Use the FIRST colon to split module name from topics
            const colonIndex = fullText.indexOf(':');
            if (colonIndex > 0 && colonIndex < 100) {
                moduleName = fullText.substring(0, colonIndex).trim();
                topicsText = fullText.substring(colonIndex + 1).trim();
            } else {
                // No colon — try first sentence (up to first period) as module name
                const periodIndex = fullText.indexOf('.');
                if (periodIndex > 0 && periodIndex < 80) {
                    moduleName = fullText.substring(0, periodIndex).trim();
                    topicsText = fullText.substring(periodIndex + 1).trim();
                } else {
                    moduleName = fullText.length > 60 ? fullText.substring(0, 60).trim() : fullText;
                    topicsText = fullText;
                }
            }

            // Clean up moduleName
            moduleName = moduleName.replace(/:$/, '').replace(/\*\*?/g, '').trim();

            const newMod = {
                id: DB.generateUUID(),
                name: moduleName,
                topics: []
            };

            // Step 3: Auto-detect the best delimiter
            const hyphenCount = (topicsText.match(/[-–]/g) || []).length;
            const commaCount = (topicsText.match(/,/g) || []).length;
            const semiCount = (topicsText.match(/;/g) || []).length;

            let delimiter;
            if (hyphenCount >= commaCount && hyphenCount >= semiCount && hyphenCount > 0) {
                // Hyphens are dominant (e.g. Computer Architecture syllabus)
                delimiter = /[-–]+/;
            } else {
                // Commas/semicolons dominant (e.g. Math/Probability syllabus)
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
                <View style={{ flexDirection: 'row', gap: 10 }}>
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

                                {/* Module Progress Bar */}
                                <View style={styles.moduleProgressRow}>
                                    <View style={styles.modulePill}>
                                        <Text style={styles.modulePillText}>Class: {modClassDone}/{modTopics.length}</Text>
                                    </View>
                                    <View style={[styles.modulePill, { backgroundColor: `${colors.optimal}20` }]}>
                                        <Text style={[styles.modulePillText, { color: colors.optimal }]}>Self: {modSelfDone}/{modTopics.length}</Text>
                                    </View>
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
        marginBottom: 20,
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
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.02)',
        overflow: 'hidden',
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
    },
    moduleExpandIcon: {
        color: colors.gold,
        fontSize: 12,
        marginRight: 10,
    },
    moduleName: {
        fontFamily: fonts.headingBold,
        fontSize: 16,
        color: colors.cream,
        flexShrink: 1,
    },
    moduleMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    moduleCountText: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.textMuted,
    },
    modDeleteBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modDeleteText: {
        color: colors.textMuted,
        fontSize: 14,
        marginTop: -2,
    },
    moduleProgressRow: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    modulePill: {
        backgroundColor: `${colors.gold}15`,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    modulePillText: {
        fontFamily: fonts.bodyBold,
        fontSize: 10,
        color: colors.gold,
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
        paddingBottom: 8,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.03)',
    },
    legendTitle: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.textMuted,
    },
    legendCheckboxes: {
        flexDirection: 'row',
        gap: 16,
        marginRight: 4,
    },
    legendCheckLabel: {
        fontFamily: fonts.heading,
        fontSize: 11,
        color: colors.textSecondary,
        width: 32,
        textAlign: 'center',
    },
    emptyTopicsText: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textMuted,
        fontStyle: 'italic',
        marginVertical: 10,
        textAlign: 'center',
    },
    topicRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.015)',
    },
    topicDeleteBtn: {
        width: 20,
        height: 20,
        borderRadius: 10,
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
        marginRight: 10,
    },
    checkboxGroup: {
        flexDirection: 'row',
        gap: 16,
    },
    checkbox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.bgPrimary,
        borderWidth: 1.5,
        borderColor: colors.textMuted,
        justifyContent: 'center',
        alignItems: 'center',
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
        fontSize: 14,
        fontWeight: 'bold',
    },
    addTopicTrigger: {
        paddingVertical: 10,
        marginTop: 6,
        alignItems: 'center',
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
        paddingHorizontal: 12,
        paddingVertical: 8,
        color: colors.cream,
        fontFamily: fonts.body,
        fontSize: 13,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
    },
    inlineAddBtn: {
        backgroundColor: colors.gold,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    inlineAddBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 12,
        color: colors.cream,
    },
    inlineCancelBtn: {
        paddingHorizontal: 8,
        paddingVertical: 8,
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
        textAlign: 'center',
        marginBottom: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    sheetInput: {
        backgroundColor: colors.bgTertiary,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: colors.cream,
        fontFamily: fonts.body,
        fontSize: 14,
    },
    sheetActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 16,
    },
    sheetCancelBtn: {
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    sheetCancelBtnText: {
        fontFamily: fonts.heading,
        fontSize: 13,
        color: colors.cream,
    },
    sheetSaveBtn: {
        backgroundColor: colors.gold,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    sheetSaveBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 13,
        color: colors.cream,
    }
});
