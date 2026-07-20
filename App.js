import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Outfit_500Medium, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Quicksand_500Medium, Quicksand_700Bold } from '@expo-google-fonts/quicksand';
import * as Notifications from 'expo-notifications';
import { colors } from './src/styles/theme';
import ScheduleScreen from './src/screens/ScheduleScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import SubjectsScreen from './src/screens/SubjectsScreen';

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

    useEffect(() => {
        setupNotifications();
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
                    <Text style={styles.logoText}>ColAsi</Text>
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
    }
});
