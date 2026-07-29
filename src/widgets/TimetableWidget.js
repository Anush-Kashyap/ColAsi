import React from 'react';
import { View, Text } from 'react-native';

/**
 * 4x3 Scrollable Home Screen Widget for ColAsi (4 cols wide x 3 rows high)
 * Displays today's schedule with scrollable subject cards, start/end times, room locations, and badges.
 */
export function TimetableWidget({ dayName = '', dateFormatted = '', classes = [], tasks = [], isHoliday = false, holidayTitle = '' }) {
    const displayDay = dayName.toUpperCase();

    // Dynamically resolve widget primitive components at render time
    let FlexComp = View;
    let TextComp = ({ text, style }) => <Text style={style}>{text}</Text>;
    let ListComp = ({ style, children }) => <View style={style}>{children}</View>;

    try {
        const { NativeModules } = require('react-native');
        if (NativeModules && NativeModules.AndroidWidget) {
            const widgetModule = require('react-native-android-widget');
            if (widgetModule && widgetModule.FlexWidget && widgetModule.TextWidget) {
                FlexComp = widgetModule.FlexWidget;
                TextComp = widgetModule.TextWidget;
                if (widgetModule.ListWidget) {
                    ListComp = widgetModule.ListWidget;
                }
            }
        }
    } catch (e) {
        // Native module not linked in Expo Go
    }

    const hasItems = (classes && classes.length > 0) || (tasks && tasks.length > 0);

    return (
        <FlexComp
            clickAction="OPEN_APP"
            style={{
                height: 'match_parent',
                width: 'match_parent',
                backgroundColor: '#141210',
                borderRadius: 20,
                padding: 10,
                borderWidth: 1,
                borderColor: 'rgba(236, 200, 117, 0.15)',
                flexDirection: 'column',
                justifyContent: 'flex-start',
            }}
        >
            {/* Header Banner */}
            <FlexComp
                style={{
                    width: 'match_parent',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                    paddingBottom: 5,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(236, 200, 117, 0.15)',
                }}
            >
                <FlexComp style={{ flexDirection: 'column' }}>
                    <TextComp
                        text="📖 TODAY'S CLASSES & TASKS"
                        style={{
                            color: '#ECC875',
                            fontSize: 10,
                            fontWeight: 'bold',
                        }}
                    />
                    <TextComp
                        text={dateFormatted || 'NITC Schedule'}
                        style={{
                            color: '#999086',
                            fontSize: 8,
                            marginTop: 1,
                        }}
                    />
                </FlexComp>

                <FlexComp
                    clickAction="OPEN_APP"
                    style={{
                        backgroundColor: '#221F1C',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: 'rgba(236, 200, 117, 0.3)',
                    }}
                >
                    <TextComp
                        text={displayDay || 'TODAY'}
                        style={{
                            color: '#F4EFEA',
                            fontSize: 9,
                            fontWeight: 'bold',
                        }}
                    />
                </FlexComp>
            </FlexComp>

            {/* Main Scrollable Content */}
            {isHoliday ? (
                <FlexComp
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#221F1C',
                        borderRadius: 10,
                        padding: 10,
                        borderLeftWidth: 4,
                        borderLeftColor: '#EF4444',
                    }}
                >
                    <TextComp
                        text="🌴 HOLIDAY"
                        style={{
                            color: '#EF4444',
                            fontSize: 12,
                            fontWeight: 'bold',
                            marginBottom: 2,
                        }}
                    />
                    <TextComp
                        text={holidayTitle || 'No classes scheduled today'}
                        style={{
                            color: '#F4EFEA',
                            fontSize: 9,
                            textAlign: 'center',
                        }}
                    />
                </FlexComp>
            ) : !hasItems ? (
                <FlexComp
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#221F1C',
                        borderRadius: 10,
                        padding: 10,
                        borderLeftWidth: 4,
                        borderLeftColor: '#ECC875',
                    }}
                >
                    <TextComp
                        text="☕ FREE DAY"
                        style={{
                            color: '#ECC875',
                            fontSize: 12,
                            fontWeight: 'bold',
                            marginBottom: 2,
                        }}
                    />
                    <TextComp
                        text="No classes or tasks scheduled for today!"
                        style={{
                            color: '#999086',
                            fontSize: 9,
                            textAlign: 'center',
                        }}
                    />
                </FlexComp>
            ) : (
                <ListComp style={{ height: 'match_parent', width: 'match_parent' }}>
                    {/* Render Classes */}
                    {classes.map((cls, idx) => {
                        const isDone = cls.isCompleted;
                        const isLive = cls.isOngoing;
                        const cardBorderColor = isLive ? '#ECC875' : (cls.color || '#ECC875');
                        const timeColor = '#ECC875';
                        const titleColor = '#F4EFEA';
                        const displaySubjectName = isLive ? `🔴 ${cls.subjectName}` : cls.subjectName;
                        const badgeBg = '#161412';
                        const badgeTextColor = cls.color || '#ECC875';

                        return (
                            <FlexComp
                                key={`cls-${idx}`}
                                style={{
                                    flexDirection: 'row',
                                    backgroundColor: '#221F1C',
                                    borderRadius: 10,
                                    padding: 7,
                                    marginBottom: 4,
                                    alignItems: 'center',
                                    borderLeftWidth: 3,
                                    borderLeftColor: cardBorderColor,
                                    width: 'match_parent',
                                }}
                            >
                                {/* Class Time Column */}
                                <FlexComp style={{ flexDirection: 'column', width: 54, marginRight: 6 }}>
                                    <TextComp
                                        text={isDone ? "✓" : cls.startTime}
                                        style={{
                                            color: timeColor,
                                            fontSize: isDone ? 13 : 9,
                                            fontWeight: 'bold',
                                        }}
                                    />
                                    {!isDone ? (
                                        <TextComp
                                            text={cls.endTime}
                                            style={{
                                                color: timeColor,
                                                fontSize: 8,
                                                fontWeight: 'bold',
                                                marginTop: 1,
                                            }}
                                        />
                                    ) : null}
                                </FlexComp>

                                {/* Class Info Column */}
                                <FlexComp style={{ flexDirection: 'column', flex: 1 }}>
                                    <FlexComp style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <TextComp
                                            text={displaySubjectName}
                                            style={{
                                                color: titleColor,
                                                fontSize: 10,
                                                fontWeight: 'bold',
                                                flex: 1,
                                            }}
                                        />
                                        {cls.shortName ? (
                                            <TextComp
                                                text={isLive ? 'LIVE' : cls.shortName}
                                                style={{
                                                    color: badgeTextColor,
                                                    fontSize: 8,
                                                    fontWeight: 'bold',
                                                    backgroundColor: badgeBg,
                                                    paddingHorizontal: 4,
                                                    paddingVertical: 1,
                                                    borderRadius: 4,
                                                    marginLeft: 4,
                                                }}
                                            />
                                        ) : null}
                                    </FlexComp>

                                    {cls.room ? (
                                        <TextComp
                                            text={`📍 ${cls.room}`}
                                            style={{
                                                color: '#999086',
                                                fontSize: 8,
                                                marginTop: 1,
                                            }}
                                        />
                                    ) : null}
                                </FlexComp>
                            </FlexComp>
                        );
                    })}

                    {/* Render Tasks & Deadlines */}
                    {tasks.map((tsk, idx) => {
                        const taskBorderColor = tsk.color || '#ECC875';
                        const badgeTextColor = tsk.color || '#ECC875';

                        return (
                            <FlexComp
                                key={`tsk-${idx}`}
                                style={{
                                    flexDirection: 'row',
                                    backgroundColor: '#221F1C',
                                    borderRadius: 10,
                                    padding: 7,
                                    marginBottom: 4,
                                    alignItems: 'center',
                                    borderLeftWidth: 3,
                                    borderLeftColor: taskBorderColor,
                                    width: 'match_parent',
                                }}
                            >
                                {/* Task Status Icon Column */}
                                <FlexComp style={{ flexDirection: 'column', width: 54, marginRight: 6 }}>
                                    <TextComp
                                        text={tsk.completed ? "✓" : "📌"}
                                        style={{
                                            color: '#ECC875',
                                            fontSize: tsk.completed ? 13 : 11,
                                            fontWeight: 'bold',
                                        }}
                                    />
                                    {tsk.completed ? (
                                        <TextComp
                                            text="DONE"
                                            style={{
                                                color: '#999086',
                                                fontSize: 7,
                                                fontWeight: 'bold',
                                                marginTop: 1,
                                            }}
                                        />
                                    ) : null}
                                </FlexComp>

                                {/* Task Details Column */}
                                <FlexComp style={{ flexDirection: 'column', flex: 1 }}>
                                    <FlexComp style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <TextComp
                                            text={tsk.title}
                                            style={{
                                                color: tsk.completed ? '#999086' : '#F4EFEA',
                                                fontSize: 10,
                                                fontWeight: 'bold',
                                                flex: 1,
                                            }}
                                        />
                                        <TextComp
                                            text={tsk.shortName || 'TASK'}
                                            style={{
                                                color: badgeTextColor,
                                                fontSize: 8,
                                                fontWeight: 'bold',
                                                backgroundColor: '#161412',
                                                paddingHorizontal: 4,
                                                paddingVertical: 1,
                                                borderRadius: 4,
                                                marginLeft: 4,
                                            }}
                                        />
                                    </FlexComp>

                                    {tsk.description || tsk.subjectName ? (
                                        <TextComp
                                            text={tsk.subjectName ? `📚 ${tsk.subjectName}` : `📝 ${tsk.description}`}
                                            style={{
                                                color: '#999086',
                                                fontSize: 8,
                                                marginTop: 1,
                                            }}
                                        />
                                    ) : null}
                                </FlexComp>
                            </FlexComp>
                        );
                    })}
                </ListComp>
            )}
        </FlexComp>
    );
}
