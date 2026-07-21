import { registerRootComponent } from 'expo';
import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';
import App from './App';

// Register Android Home Screen Widget background task handler safely
try {
    const widgetModule = require('react-native-android-widget');
    if (widgetModule && widgetModule.registerWidgetTaskHandler) {
        widgetModule.registerWidgetTaskHandler(widgetTaskHandler);
    }
} catch (e) {
    // Native module not linked in Expo Go
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
