import { updateTimetableWidget } from './widgetManager';

/**
 * Task handler called by Android OS for background widget updates
 */
export async function widgetTaskHandler(props) {
    const { widgetAction } = props;

    if (widgetAction === 'WIDGET_ADDED' || widgetAction === 'WIDGET_UPDATE' || widgetAction === 'WIDGET_RESIZED') {
        await updateTimetableWidget();
    }
}
