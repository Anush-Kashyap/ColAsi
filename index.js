import { registerRootComponent } from 'expo';
import { NativeModules } from 'react-native';
import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';
import App from './App';

// Register Android Home Screen Widget background task handler only if native module is present
if (NativeModules && NativeModules.RNAndroidWidget) {
    try {
        const widgetModule = require('react-native-android-widget');
        if (widgetModule && widgetModule.registerWidgetTaskHandler) {
            widgetModule.registerWidgetTaskHandler(widgetTaskHandler);
        }
    } catch (e) {
        // Ignore in Expo Go
    }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
