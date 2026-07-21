import * as WidgetManager from './widgetManager';

/**
 * Task handler called by Android OS for background widget updates
 */
export async function widgetTaskHandler(props) {
    try {
        if (WidgetManager && typeof WidgetManager.updateTimetableWidget === 'function') {
            await WidgetManager.updateTimetableWidget();
        }
    } catch (e) {
        // Safe catch
    }
}
