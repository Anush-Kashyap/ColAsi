import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { colors, fonts } from '../styles/theme';

export default function SubjectCard({ subject, onUpdate, onDelete, onOpenDetail, onUpdateSettings }) {
    const { name, shortName, color, totalClasses, bunkedClasses } = subject;
    const minAttendancePct = subject.minAttendancePct ?? 80;
    
    // Inline editing states for counters
    const [editingTotal, setEditingTotal] = useState(false);
    const [totalInput, setTotalInput] = useState(String(totalClasses));

    const [editingBunk, setEditingBunk] = useState(false);
    const [bunkInput, setBunkInput] = useState(String(bunkedClasses));

    // Subject Settings Modal State
    const [settingsModalVisible, setSettingsModalVisible] = useState(false);
    const [targetPctInput, setTargetPctInput] = useState(String(minAttendancePct));

    useEffect(() => {
        setTotalInput(String(totalClasses));
    }, [totalClasses]);

    useEffect(() => {
        setBunkInput(String(bunkedClasses));
    }, [bunkedClasses]);

    useEffect(() => {
        setTargetPctInput(String(minAttendancePct));
    }, [minAttendancePct]);

    const maxBunkPct = (100 - minAttendancePct) / 100;
    const maxBunks = Math.floor(totalClasses * maxBunkPct);
    const attended = totalClasses - bunkedClasses;
    
    let pct = 100;
    if (totalClasses > 0) {
        pct = Math.round((attended / totalClasses) * 100);
    }
    
    const isCritical = pct < minAttendancePct;
    const statusText = isCritical ? `Critically low (<${minAttendancePct}%)` : `Safe level (≥${minAttendancePct}%)`;
    const statusColor = isCritical ? colors.critical : colors.optimal;

    const handleTotalSubmit = () => {
        setEditingTotal(false);
        const newTotal = parseInt(totalInput, 10);
        if (!isNaN(newTotal) && newTotal >= 0) {
            const diff = newTotal - totalClasses;
            if (diff !== 0) {
                onUpdate(subject.id, diff, 0);
            }
        } else {
            setTotalInput(String(totalClasses));
        }
    };

    const handleBunkSubmit = () => {
        setEditingBunk(false);
        const newBunk = parseInt(bunkInput, 10);
        if (!isNaN(newBunk) && newBunk >= 0) {
            const diff = newBunk - bunkedClasses;
            if (diff !== 0) {
                onUpdate(subject.id, 0, diff);
            }
        } else {
            setBunkInput(String(bunkedClasses));
        }
    };

    const handleSaveSettings = () => {
        const val = parseInt(targetPctInput, 10);
        if (isNaN(val) || val < 1 || val > 100) {
            Alert.alert('Invalid Percentage', 'Please enter a target percentage between 1 and 100.');
            return;
        }
        if (onUpdateSettings) {
            onUpdateSettings(subject.id, val);
        }
        setSettingsModalVisible(false);
    };

    return (
        <View style={[styles.card, { borderTopColor: color }]}>
            {/* Tappable Card Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.titleGroup} 
                    onPress={() => onOpenDetail && onOpenDetail(subject)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.colorDot, { backgroundColor: color }]} />
                    <Text style={styles.name} numberOfLines={1}>{name}</Text>
                    <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
                        <Text style={[styles.badgeText, { color: color }]}>{shortName}</Text>
                    </View>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity 
                        onPress={() => setSettingsModalVisible(true)} 
                        style={styles.settingsButton} 
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={styles.settingsText}>⚙️</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={onDelete} 
                        style={styles.deleteButton} 
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={styles.deleteText}>×</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.body}>
                <View style={styles.statsContainer}>
                    {/* Total Classes Counter */}
                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Total conducted</Text>
                        <View style={styles.counterGroup}>
                            <TouchableOpacity 
                                style={styles.counterBtn} 
                                onPress={() => onUpdate(subject.id, -1, 0)}
                            >
                                <Text style={styles.counterBtnText}>-</Text>
                            </TouchableOpacity>

                            {editingTotal ? (
                                <TextInput
                                    style={styles.counterInput}
                                    keyboardType="number-pad"
                                    value={totalInput}
                                    onChangeText={setTotalInput}
                                    onBlur={handleTotalSubmit}
                                    onSubmitEditing={handleTotalSubmit}
                                    autoFocus
                                    selectTextOnFocus
                                />
                            ) : (
                                <TouchableOpacity 
                                    onPress={() => { setTotalInput(String(totalClasses)); setEditingTotal(true); }}
                                    style={styles.valTouch}
                                >
                                    <Text style={styles.counterVal}>{totalClasses}</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity 
                                style={styles.counterBtn} 
                                onPress={() => onUpdate(subject.id, 1, 0)}
                            >
                                <Text style={styles.counterBtnText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Bunked Classes Counter */}
                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Bunked classes</Text>
                        <View style={styles.counterGroup}>
                            <TouchableOpacity 
                                style={styles.counterBtn} 
                                onPress={() => onUpdate(subject.id, 0, -1)}
                            >
                                <Text style={styles.counterBtnText}>-</Text>
                            </TouchableOpacity>

                            {editingBunk ? (
                                <TextInput
                                    style={styles.counterInput}
                                    keyboardType="number-pad"
                                    value={bunkInput}
                                    onChangeText={setBunkInput}
                                    onBlur={handleBunkSubmit}
                                    onSubmitEditing={handleBunkSubmit}
                                    autoFocus
                                    selectTextOnFocus
                                />
                            ) : (
                                <TouchableOpacity 
                                    onPress={() => { setBunkInput(String(bunkedClasses)); setEditingBunk(true); }}
                                    style={styles.valTouch}
                                >
                                    <Text style={styles.counterVal}>{bunkedClasses}</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity 
                                style={styles.counterBtn} 
                                onPress={() => onUpdate(subject.id, 0, 1)}
                                disabled={totalClasses === 0 || bunkedClasses >= maxBunks}
                                style={[
                                    styles.counterBtn, 
                                    (totalClasses === 0 || bunkedClasses >= maxBunks) && styles.disabledBtn
                                ]}
                            >
                                <Text style={[
                                    styles.counterBtnText, 
                                    (totalClasses === 0 || bunkedClasses >= maxBunks) && styles.disabledText
                                ]}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    
                    <View style={styles.limitRow}>
                        <Text style={styles.hintText}>💡 Tap number to type value directly</Text>
                        <Text style={styles.limitText}>Max bunks ({100 - minAttendancePct}% max): {maxBunks}</Text>
                    </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                    <View style={styles.progressLabels}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                        <Text style={styles.pctText}>{totalClasses > 0 ? `${pct}%` : '100%'}</Text>
                    </View>
                </View>

                {/* Action to view catalog & syllabus */}
                <TouchableOpacity 
                    style={styles.catalogButton}
                    onPress={() => onOpenDetail && onOpenDetail(subject)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.catalogButtonText}>📚 Syllabus & Module Catalog</Text>
                    <Text style={styles.catalogButtonArrow}>→</Text>
                </TouchableOpacity>
            </View>

            {/* Subject Settings Modal */}
            <Modal visible={settingsModalVisible} transparent animationType="fade">
                <View style={styles.modalBackdrop}>
                    <View style={styles.settingsFormCard}>
                        <Text style={styles.settingsFormTitle}>⚙️ {name} Settings</Text>
                        <Text style={styles.settingsFormSub}>Set minimum attendance policy for this subject</Text>

                        <Text style={styles.settingsFormLabel}>Required Attendance Target (%)</Text>

                        {/* Quick preset capsules */}
                        <View style={styles.presetRow}>
                            {[75, 80, 85, 90].map((presetVal) => (
                                <TouchableOpacity 
                                    key={presetVal}
                                    style={[
                                        styles.presetCapsule, 
                                        targetPctInput === String(presetVal) && styles.presetCapsuleActive
                                    ]}
                                    onPress={() => setTargetPctInput(String(presetVal))}
                                >
                                    <Text style={[
                                        styles.presetCapsuleText,
                                        targetPctInput === String(presetVal) && styles.presetCapsuleTextActive
                                    ]}>
                                        {presetVal}%
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={styles.settingsFormInput}
                            value={targetPctInput}
                            onChangeText={setTargetPctInput}
                            keyboardType="number-pad"
                            placeholder="e.g. 75 or 80"
                            placeholderTextColor={colors.textMuted}
                            selectTextOnFocus
                        />

                        <Text style={styles.settingsHint}>
                            Allowable bunks will be calculated as {100 - (parseInt(targetPctInput, 10) || 0)}% of conducted classes.
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                            <TouchableOpacity 
                                style={[styles.settingsModalBtn, { flex: 1, backgroundColor: colors.bgTertiary }]}
                                onPress={() => { setTargetPctInput(String(minAttendancePct)); setSettingsModalVisible(false); }}
                            >
                                <Text style={styles.settingsModalBtnText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.settingsModalBtn, { flex: 1, backgroundColor: colors.gold }]}
                                onPress={handleSaveSettings}
                            >
                                <Text style={[styles.settingsModalBtnText, { color: colors.bgPrimary }]}>Save Settings</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.bgSecondary,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.02)',
        borderTopWidth: 4,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    titleGroup: {
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
    name: {
        fontFamily: fonts.heading,
        fontSize: 18,
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
    settingsButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsText: {
        fontSize: 13,
    },
    deleteButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteText: {
        color: colors.textMuted,
        fontSize: 16,
        marginTop: -2,
    },
    body: {
        gap: 12,
    },
    statsContainer: {
        backgroundColor: colors.bgTertiary,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 4,
    },
    statLabel: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.textSecondary,
    },
    counterGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: 12,
        padding: 2,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.01)',
    },
    counterBtn: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    counterBtnText: {
        color: colors.gold,
        fontFamily: fonts.headingBold,
        fontSize: 16,
    },
    counterVal: {
        width: 38,
        textAlign: 'center',
        fontFamily: fonts.bodyBold,
        fontSize: 14,
        color: colors.cream,
    },
    valTouch: {
        paddingVertical: 2,
        paddingHorizontal: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 6,
    },
    counterInput: {
        width: 44,
        height: 28,
        backgroundColor: colors.bgPrimary,
        color: colors.gold,
        fontFamily: fonts.bodyBold,
        fontSize: 14,
        textAlign: 'center',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.gold,
        padding: 0,
    },
    disabledBtn: {
        opacity: 0.3,
    },
    disabledText: {
        color: colors.textMuted,
    },
    limitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
    },
    hintText: {
        fontFamily: fonts.body,
        fontSize: 10,
        color: colors.gold,
        opacity: 0.8,
    },
    limitText: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.textMuted,
    },
    progressContainer: {
        gap: 6,
    },
    progressBarBg: {
        width: '100%',
        height: 6,
        backgroundColor: colors.bgTertiary,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusText: {
        fontFamily: fonts.bodyBold,
        fontSize: 12,
    },
    pctText: {
        fontFamily: fonts.headingBold,
        fontSize: 13,
        color: colors.cream,
    },
    catalogButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.bgTertiary,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginTop: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
    },
    catalogButtonText: {
        fontFamily: fonts.heading,
        fontSize: 13,
        color: colors.cream,
    },
    catalogButtonArrow: {
        fontFamily: fonts.headingBold,
        fontSize: 14,
        color: colors.gold,
    },

    // Modal Styles
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsFormCard: {
        width: '88%',
        backgroundColor: colors.bgSecondary,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.gold,
    },
    settingsFormTitle: {
        fontFamily: fonts.headingBold,
        fontSize: 18,
        color: colors.gold,
        marginBottom: 4,
        textAlign: 'center',
    },
    settingsFormSub: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 16,
        textAlign: 'center',
    },
    settingsFormLabel: {
        fontFamily: fonts.bodyBold,
        fontSize: 12,
        color: colors.cream,
        marginBottom: 8,
    },
    presetRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    presetCapsule: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    presetCapsuleActive: {
        backgroundColor: colors.gold,
        borderColor: colors.gold,
    },
    presetCapsuleText: {
        fontFamily: fonts.headingBold,
        fontSize: 12,
        color: colors.textSecondary,
    },
    presetCapsuleTextActive: {
        color: colors.bgPrimary,
    },
    settingsFormInput: {
        backgroundColor: colors.bgPrimary,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: colors.gold,
        fontFamily: fonts.bodyBold,
        fontSize: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        textAlign: 'center',
    },
    settingsHint: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 8,
        textAlign: 'center',
    },
    settingsModalBtn: {
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: 'center',
    },
    settingsModalBtnText: {
        fontFamily: fonts.headingBold,
        fontSize: 13,
        color: colors.cream,
    }
});
