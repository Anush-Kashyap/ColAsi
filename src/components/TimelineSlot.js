/**
 * Timeline Slot Component
 * Cozy card displaying a single scheduled class in the vertical timeline.
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { colors, fonts } from '../styles/theme';

export default function TimelineSlot({ slot, subject, onPress }) {
    const { startHour, endHour, room, notes } = slot;
    const { name, shortName, color } = subject;
    
    const duration = endHour - startHour;
    const durationLabel = duration === 1 ? '1 hour' : `${duration} hours`;
    
    // Time formatter helper
    const formatHour = (h) => {
        if (h === 12) return '12:00 PM';
        if (h > 12) return `${h - 12}:00 PM`;
        return `${h}:00 AM`;
    };

    return (
        <View style={styles.container}>
            {/* Timeline bullet track */}
            <View style={styles.trackColumn}>
                <View style={[styles.bullet, { backgroundColor: color, shadowColor: color }]} />
                <View style={styles.trackLine} />
            </View>

            {/* Main Content card */}
            <View style={styles.cardWrapper}>
                <Text style={styles.timeLabel}>
                    {formatHour(startHour)} - {formatHour(endHour)}
                    <Text style={styles.durationLabel}>  •  {durationLabel}</Text>
                </Text>
                
                <TouchableOpacity 
                    onPress={onPress}
                    style={[styles.card, { borderLeftColor: color }]}
                    activeOpacity={0.8}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
                            <Text style={[styles.badgeText, { color: color }]}>{shortName}</Text>
                        </View>
                    </View>
                    
                    <Text style={styles.title}>{name}</Text>
                    
                    {room ? (
                        <View style={styles.metaRow}>
                            {/* Location Pin Icon */}
                            <Text style={styles.metaIcon}>📍</Text>
                            <Text style={styles.metaText}>{room}</Text>
                        </View>
                    ) : null}

                    {notes ? (
                        <Text style={styles.notesText} numberOfLines={2}>
                            {notes}
                        </Text>
                    ) : null}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        width: '100%',
    },
    trackColumn: {
        width: 24,
        alignItems: 'center',
    },
    bullet: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: colors.bgPrimary,
        zIndex: 2,
        marginTop: 22,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 5,
        elevation: 3,
    },
    trackLine: {
        position: 'absolute',
        top: 22,
        bottom: -22,
        width: 2,
        backgroundColor: colors.bgTertiary,
        zIndex: 1,
    },
    cardWrapper: {
        flex: 1,
        marginLeft: 8,
        paddingBottom: 20,
    },
    timeLabel: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    durationLabel: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.textMuted,
    },
    card: {
        backgroundColor: colors.bgSecondary,
        borderRadius: 20,
        borderLeftWidth: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.02)',
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    badgeText: {
        fontFamily: fonts.headingBold,
        fontSize: 9,
    },
    title: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.cream,
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    metaIcon: {
        fontSize: 12,
        marginRight: 4,
    },
    metaText: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.textSecondary,
    },
    notesText: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.textMuted,
        fontStyle: 'italic',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.03)',
        borderStyle: 'dashed',
    }
});
