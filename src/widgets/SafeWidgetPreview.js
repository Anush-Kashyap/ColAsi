import React from 'react';
import { View, Text, NativeModules } from 'react-native';
import { colors, fonts } from '../styles/theme';

let WidgetPreviewComponent = null;

if (NativeModules && NativeModules.RNAndroidWidget) {
    try {
        const widgetModule = require('react-native-android-widget');
        if (widgetModule && widgetModule.WidgetPreview) {
            WidgetPreviewComponent = widgetModule.WidgetPreview;
        }
    } catch (e) {
        // Native module not linked in Expo Go
    }
}

export function SafeWidgetPreview({ renderWidget, width = 200, height = 300 }) {
    if (!WidgetPreviewComponent) {
        return (
            <View style={{ padding: 14, alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 14, borderWidth: 1, borderColor: colors.gold, marginVertical: 8 }}>
                <Text style={{ fontFamily: fonts.headingBold, color: colors.gold, fontSize: 13, marginBottom: 4 }}>
                    📱 Home Screen Widget Ready
                </Text>
                <Text style={{ fontFamily: fonts.body, color: colors.cream, fontSize: 11, textAlign: 'center', lineHeight: 16 }}>
                    Android Home Screen Widgets require a compiled APK build (eas build -p android --profile preview).
                </Text>
                <Text style={{ fontFamily: fonts.body, color: colors.textSecondary, fontSize: 10, textAlign: 'center', marginTop: 6 }}>
                    Long-press your phone screen ➔ Widgets ➔ ColAsi Today Schedule!
                </Text>
            </View>
        );
    }

    try {
        const Component = WidgetPreviewComponent;
        return (
            <Component
                renderWidget={renderWidget}
                width={width}
                height={height}
            />
        );
    } catch (err) {
        return (
            <View style={{ padding: 12, alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 12 }}>
                <Text style={{ fontFamily: fonts.body, color: colors.gold, fontSize: 11 }}>
                    Widget Preview active in APK build
                </Text>
            </View>
        );
    }
}
