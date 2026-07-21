import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';

import App from './App';

// Register Android Home Screen Widget background task handler safely
try {
    if (typeof registerWidgetTaskHandler === 'function') {
        registerWidgetTaskHandler(widgetTaskHandler);
    }
} catch (e) {
    // Ignore in Expo Go
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
