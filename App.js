import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, Platform, Modal } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Outfit_500Medium, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Quicksand_500Medium, Quicksand_700Bold } from '@expo-google-fonts/quicksand';
import * as Notifications from 'expo-notifications';
import { colors } from './src/styles/theme';
import ScheduleScreen from './src/screens/ScheduleScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import SubjectsScreen from './src/screens/SubjectsScreen';
import { WidgetPreview } from 'react-native-android-widget';
import { TimetableWidget } from './src/widgets/TimetableWidget';

// Configure notification foreground behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export default function App() {
    const [currentTab, setCurrentTab] = useState('calendar');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [widgetPreviewVisible, setWidgetPreviewVisible] = useState(false);

    useEffect(() => {
        setupNotifications();
        updateTimetableWidget();
    }, []);

    const setupNotifications = async () => {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: colors.gold,
                });
            }
        } catch (e) {
            console.error('Error setting up notifications', e);
        }
    };

    // Load Cozy Fonts
    const [fontsLoaded] = useFonts({
        'Outfit-Medium': Outfit_500Medium,
        'Outfit-Bold': Outfit_700Bold,
        'Quicksand-Medium': Quicksand_500Medium,
        'Quicksand-Bold': Quicksand_700Bold,
    });

    if (!fontsLoaded) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
                <Text style={styles.loadingText}>loading cozy spaces...</Text>
            </View>
        );
    }

    const triggerRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
            
            {/* Cozy Header bar */}
            <View style={styles.appHeader}>
                <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.logoText}>ColAsi</Text>
                        <TouchableOpacity 
                            onPress={() => setInfoModalVisible(true)} 
                            style={styles.infoBadge}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={styles.infoBadgeText}>i</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.logoSubtitle}>your cozy space</Text>
                </View>
                <View style={styles.statusIndicator}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.statusText}>Active</Text>
                </View>
            </View>

            {/* Active Page Screen */}
            <View style={styles.mainContent}>
                {currentTab === 'schedule' ? (
                    <ScheduleScreen 
                        refreshTrigger={refreshTrigger} 
                        onRefreshRequest={triggerRefresh} 
                    />
                ) : currentTab === 'calendar' ? (
                    <CalendarScreen 
                        refreshTrigger={refreshTrigger} 
                        onRefreshRequest={triggerRefresh} 
                    />
                ) : (
                    <SubjectsScreen 
                        refreshTrigger={refreshTrigger} 
                        onRefreshRequest={triggerRefresh} 
                    />
                )}
            </View>

            {/* Native Mobile Bottom Navigation Bar */}
            <View style={styles.navBar}>
                <TouchableOpacity 
                    style={[styles.navBtn, currentTab === 'schedule' && styles.navBtnActive]}
                    onPress={() => setCurrentTab('schedule')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.navIcon, currentTab === 'schedule' && styles.navIconActive]}>⏰</Text>
                    <Text style={[styles.navText, currentTab === 'schedule' && styles.navTextActive]}>Schedule</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.navBtn, currentTab === 'calendar' && styles.navBtnActive]}
                    onPress={() => setCurrentTab('calendar')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.navIcon, currentTab === 'calendar' && styles.navIconActive]}>📅</Text>
                    <Text style={[styles.navText, currentTab === 'calendar' && styles.navTextActive]}>Calendar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.navBtn, currentTab === 'subjects' && styles.navBtnActive]}
                    onPress={() => setCurrentTab('subjects')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.navIcon, currentTab === 'subjects' && styles.navIconActive]}>📚</Text>
                    <Text style={[styles.navText, currentTab === 'subjects' && styles.navTextActive]}>Subjects</Text>
                </TouchableOpacity>
            </View>

            {/* App Info Modal */}
            <Modal visible={infoModalVisible} transparent animationType="fade">
                <TouchableOpacity 
                    style={styles.modalBackdrop} 
                    activeOpacity={1} 
                    onPress={() => setInfoModalVisible(false)}
                >
                    <TouchableOpacity activeOpacity={1} style={styles.infoModalCard}>
                        <Text style={styles.infoModalTitle}>ColAsi</Text>
                        <Text style={styles.infoModalSubtitle}>your cozy college companion</Text>
                        
                        <View style={styles.infoDivider} />

                        <Text style={styles.infoModalDesc}>
                            Manage your class schedules, track attendance, organize subject syllabus catalogs, and stay ahead of academic holidays and exam dates.
                        </Text>

                        <View style={styles.authorBadge}>
                            <Text style={styles.authorBadgeText}>Made by Anush 🫪</Text>
                        </View>

                        <TouchableOpacity 
                            style={[styles.authorBadge, { backgroundColor: colors.bgTertiary, marginTop: 10, borderWidth: 1, borderColor: colors.gold }]}
                            onPress={() => setWidgetPreviewVisible(!widgetPreviewVisible)}
                        >
                            <Text style={[styles.authorBadgeText, { color: colors.gold }]}>
                                {widgetPreviewVisible ? '📱 Hide Widget Preview' : '📱 Live Widget Preview'}
                            </Text>
                        </TouchableOpacity>

                        {widgetPreviewVisible && (
                            <View style={{ marginTop: 12, alignItems: 'center', backgroundColor: '#161412', padding: 10, borderRadius: 16 }}>
                                <WidgetPreview
                                    renderWidget={() => (
                                        <TimetableWidget
                                            dayName="Tuesday"
                                            dateFormatted="21 Jul 2026"
                                            classes={[
                                                { startTime: '8:00 AM', endTime: '9:00 AM', subjectName: 'Artificial Intelligence', shortName: 'AI', color: '#ECC875', room: 'NLHC 102' },
                                                { startTime: '10:00 AM', endTime: '11:00 AM', subjectName: 'Computer Networks', shortName: 'CN', color: '#3B82F6', room: 'ELHC 204' },
                                                { startTime: '1:00 PM', endTime: '2:00 PM', subjectName: 'Software Engineering', shortName: 'SE', color: '#10B981', room: 'NLHC 105' }
                                            ]}
                                        />
                                    )}
                                    width={200}
                                    height={300}
                                />
                            </View>
                        )}

                        <TouchableOpacity 
                            style={styles.infoCloseBtn}
                            onPress={() => { setWidgetPreviewVisible(false); setInfoModalVisible(false); }}
                        >
                            <Text style={styles.infoCloseBtnText}>Close</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
      </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: colors.textSecondary,
        fontSize: 16,
        fontFamily: 'Outfit-Medium',
    },
    appHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: colors.bgPrimary,
    },
    logoText: {
        fontFamily: 'Outfit-Bold',
        fontSize: 24,
        color: colors.cream,
        letterSpacing: 0.5,
    },
    logoSubtitle: {
        fontFamily: 'Quicksand-Medium',
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 1,
    },
    infoBadge: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.bgTertiary,
        borderWidth: 1,
        borderColor: colors.gold,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoBadgeText: {
        fontFamily: 'Outfit-Bold',
        fontSize: 11,
        color: colors.gold,
        marginTop: -1,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
    },
    pulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.gold,
        marginRight: 6,
    },
    statusText: {
        fontFamily: 'Outfit-Medium',
        fontSize: 11,
        color: colors.gold,
    },
    mainContent: {
        flex: 1,
    },
    navBar: {
        flexDirection: 'row',
        height: 64,
        backgroundColor: 'rgba(22, 20, 18, 0.85)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        marginHorizontal: 16,
        marginBottom: Platform.OS === 'ios' ? 24 : 12,
        borderRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 10,
        overflow: 'hidden',
    },
    navBtn: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
    },
    navBtnActive: {
        // Soft focus state
    },
    navIcon: {
        fontSize: 16,
        opacity: 0.4,
    },
    navIconActive: {
        opacity: 1,
    },
    navText: {
        fontFamily: 'Outfit-Medium',
        fontSize: 11,
        color: colors.textSecondary,
    },
    navTextActive: {
        color: colors.gold,
        fontFamily: 'Outfit-Bold',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    infoModalCard: {
        backgroundColor: colors.bgSecondary,
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        padding: 24,
        alignItems: 'center',
    },
    infoModalTitle: {
        fontFamily: 'Outfit-Bold',
        fontSize: 26,
        color: colors.cream,
    },
    infoModalSubtitle: {
        fontFamily: 'Quicksand-Medium',
        fontSize: 12,
        color: colors.gold,
        marginTop: 2,
    },
    infoDivider: {
        width: '60%',
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginVertical: 16,
    },
    infoModalDesc: {
        fontFamily: 'Quicksand-Medium',
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    authorBadge: {
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.gold,
        marginBottom: 20,
    },
    authorBadgeText: {
        fontFamily: 'Outfit-Bold',
        fontSize: 13,
        color: colors.gold,
    },
    infoCloseBtn: {
        backgroundColor: colors.gold,
        paddingHorizontal: 28,
        paddingVertical: 10,
        borderRadius: 16,
    },
    infoCloseBtnText: {
        fontFamily: 'Outfit-Bold',
        fontSize: 13,
        color: colors.cream,
    }
});
