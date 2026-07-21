import React from 'react';
import { View, Text } from 'react-native';

/**
 * Tall Rectangular Home Screen Widget for ColAsi (More Height, Less Width)
 * Displays today's schedule, start/end times, room locations, and subject badges.
 */
export function TimetableWidget({ dayName = '', dateFormatted = '', classes = [], isHoliday = false, holidayTitle = '' }) {
    const displayDay = dayName.toUpperCase();

    // Dynamically resolve widget primitive components at render time
    let FlexComp = View;
    let TextComp = ({ text, style }) => <Text style={style}>{text}</Text>;

    try {
        const widgetModule = require('react-native-android-widget');
        if (widgetModule && widgetModule.FlexWidget && widgetModule.TextWidget) {
            FlexComp = widgetModule.FlexWidget;
            TextComp = widgetModule.TextWidget;
        }
    } catch (e) {
        // Native module not linked in Expo Go
    }

    return (
        <FlexComp
            style={{
                height: 'match_parent',
                width: 'match_parent',
                backgroundColor: '#161412',
                borderRadius: 20,
                padding: 12,
                flexDirection: 'column',
                justifyContent: 'flex-start',
            }}
        >
            {/* Header Banner */}
            <FlexComp
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                    paddingBottom: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: '#ECC87540',
                }}
            >
                <FlexComp style={{ flexDirection: 'column' }}>
                    <TextComp
                        text="📖 TODAY'S CLASSES"
                        style={{
                            color: '#ECC875',
                            fontSize: 11,
                            fontWeight: 'bold',
                        }}
                    />
                    <TextComp
                        text={dateFormatted || 'NITC Schedule'}
                        style={{
                            color: '#999086',
                            fontSize: 9,
                            marginTop: 1,
                        }}
                    />
                </FlexComp>

                <FlexComp
                    style={{
                        backgroundColor: '#221F1C',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#ECC87540',
                    }}
                >
                    <TextComp
                        text={displayDay || 'TODAY'}
                        style={{
                            color: '#F4EFEA',
                            fontSize: 10,
                            fontWeight: 'bold',
                        }}
                    />
                </FlexComp>
            </FlexComp>

            {/* Main Timetable Content */}
            {isHoliday ? (
                <FlexComp
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#221F1C',
                        borderRadius: 14,
                        padding: 12,
                        borderLeftWidth: 4,
                        borderLeftColor: '#EF4444',
                    }}
                >
                    <TextComp
                        text="🌴 HOLIDAY"
                        style={{
                            color: '#EF4444',
                            fontSize: 13,
                            fontWeight: 'bold',
                            marginBottom: 4,
                        }}
                    />
                    <TextComp
                        text={holidayTitle || 'No classes scheduled today'}
                        style={{
                            color: '#F4EFEA',
                            fontSize: 10,
                            textAlign: 'center',
                        }}
                    />
                </FlexComp>
            ) : classes.length === 0 ? (
                <FlexComp
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#221F1C',
                        borderRadius: 14,
                        padding: 12,
                        borderLeftWidth: 4,
                        borderLeftColor: '#ECC875',
                    }}
                >
                    <TextComp
                        text="☕ FREE DAY"
                        style={{
                            color: '#ECC875',
                            fontSize: 13,
                            fontWeight: 'bold',
                            marginBottom: 4,
                        }}
                    />
                    <TextComp
                        text="No classes scheduled for today!"
                        style={{
                            color: '#999086',
                            fontSize: 10,
                            textAlign: 'center',
                        }}
                    />
                </FlexComp>
            ) : (
                <FlexComp style={{ flexDirection: 'column', flex: 1 }}>
                    {classes.slice(0, 6).map((cls, idx) => (
                        <FlexComp
                            key={idx}
                            style={{
                                flexDirection: 'row',
                                backgroundColor: '#221F1C',
                                borderRadius: 12,
                                padding: 8,
                                marginBottom: 6,
                                alignItems: 'center',
                                borderLeftWidth: 3,
                                borderLeftColor: cls.color || '#ECC875',
                            }}
                        >
                            {/* Class Time Column (Highlighted in Warm Gold) */}
                            <FlexComp style={{ flexDirection: 'column', width: 56, marginRight: 6 }}>
                                <TextComp
                                    text={cls.startTime}
                                    style={{
                                        color: '#ECC875',
                                        fontSize: 10,
                                        fontWeight: 'bold',
                                    }}
                                />
                                <TextComp
                                    text={cls.endTime}
                                    style={{
                                        color: '#ECC875',
                                        fontSize: 9,
                                        fontWeight: 'bold',
                                        marginTop: 1,
                                    }}
                                />
                            </FlexComp>

                            {/* Class Info Column */}
                            <FlexComp style={{ flexDirection: 'column', flex: 1 }}>
                                <FlexComp style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <TextComp
                                        text={cls.subjectName}
                                        style={{
                                            color: '#F4EFEA',
                                            fontSize: 11,
                                            fontWeight: 'bold',
                                            flex: 1,
                                        }}
                                    />
                                    {cls.shortName ? (
                                        <TextComp
                                            text={cls.shortName}
                                            style={{
                                                color: cls.color || '#ECC875',
                                                fontSize: 8,
                                                fontWeight: 'bold',
                                                backgroundColor: '#161412',
                                                paddingHorizontal: 4,
                                                paddingVertical: 1,
                                                borderRadius: 4,
                                            }}
                                        />
                                    ) : null}
                                </FlexComp>

                                {cls.room ? (
                                    <TextComp
                                        text={`📍 ${cls.room}`}
                                        style={{
                                            color: '#999086',
                                            fontSize: 9,
                                            marginTop: 2,
                                        }}
                                    />
                                ) : null}
                            </FlexComp>
                        </FlexComp>
                    ))}
                </FlexComp>
            )}
        </FlexComp>
    );
}
