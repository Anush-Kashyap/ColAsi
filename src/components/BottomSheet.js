/**
 * Cozy Bottom Sheet Component
 * Slides up from the bottom of the screen, providing a native look-and-feel form container.
 */

import React from 'react';
import { StyleSheet, Modal, View, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { colors } from '../styles/theme';

export default function BottomSheet({ visible, onClose, children }) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.backdrop}>
                    <TouchableWithoutFeedback onPress={() => {}}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                            style={styles.sheetWrapper}
                        >
                            <View style={styles.sheetContainer}>
                                {/* Top slide handle element */}
                                <View style={styles.dragHandle} />
                                
                                <ScrollView 
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={styles.scrollContent}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {children}
                                </ScrollView>
                            </View>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },
    sheetWrapper: {
        width: '100%',
        maxHeight: '90%',
    },
    sheetContainer: {
        backgroundColor: colors.bgSecondary,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        paddingHorizontal: 20,
    },
    dragHandle: {
        width: 44,
        height: 4,
        backgroundColor: colors.bgTertiary,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    scrollContent: {
        paddingBottom: 20,
    }
});
