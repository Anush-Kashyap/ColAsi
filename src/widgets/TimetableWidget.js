import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

/**
 * Tall Rectangular Home Screen Widget for ColAsi (More Height, Less Width)
 * Displays today's schedule, start/end times, room locations, and subject badges.
 */
export function TimetableWidget({ dayName = '', dateFormatted = '', classes = [], isHoliday = false, holidayTitle = '' }) {
    const displayDay = dayName.toUpperCase();

    return (
        <FlexWidget
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
            <FlexWidget
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
                <FlexWidget style={{ flexDirection: 'column' }}>
                    <TextWidget
                        text="📖 TODAY'S CLASSES"
                        style={{
                            color: '#ECC875',
                            fontSize: 11,
                            fontWeight: 'bold',
                        }}
                    />
                    <TextWidget
                        text={dateFormatted || 'NITC Schedule'}
                        style={{
                            color: '#999086',
                            fontSize: 9,
                            marginTop: 1,
                        }}
                    />
                </FlexWidget>

                <FlexWidget
                    style={{
                        backgroundColor: '#221F1C',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#ECC87540',
                    }}
                >
                    <TextWidget
                        text={displayDay || 'TODAY'}
                        style={{
                            color: '#F4EFEA',
                            fontSize: 10,
                            fontWeight: 'bold',
                        }}
                    />
                </FlexWidget>
            </FlexWidget>

            {/* Main Timetable Content */}
            {isHoliday ? (
                <FlexWidget
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
                    <TextWidget
                        text="🌴 HOLIDAY"
                        style={{
                            color: '#EF4444',
                            fontSize: 13,
                            fontWeight: 'bold',
                            marginBottom: 4,
                        }}
                    />
                    <TextWidget
                        text={holidayTitle || 'No classes scheduled today'}
                        style={{
                            color: '#F4EFEA',
                            fontSize: 10,
                            textAlign: 'center',
                        }}
                    />
                </FlexWidget>
            ) : classes.length === 0 ? (
                <FlexWidget
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
                    <TextWidget
                        text="☕ FREE DAY"
                        style={{
                            color: '#ECC875',
                            fontSize: 13,
                            fontWeight: 'bold',
                            marginBottom: 4,
                        }}
                    />
                    <TextWidget
                        text="No classes scheduled for today!"
                        style={{
                            color: '#999086',
                            fontSize: 10,
                            textAlign: 'center',
                        }}
                    />
                </FlexWidget>
            ) : (
                <FlexWidget style={{ flexDirection: 'column', gap: 6, flex: 1 }}>
                    {classes.slice(0, 6).map((cls, idx) => (
                        <FlexWidget
                            key={idx}
                            style={{
                                flexDirection: 'row',
                                backgroundColor: '#221F1C',
                                borderRadius: 12,
                                padding: 8,
                                alignItems: 'center',
                                borderLeftWidth: 3,
                                borderLeftColor: cls.color || '#ECC875',
                            }}
                        >
                            {/* Class Time Column (Highlighted in Warm Gold) */}
                            <FlexWidget style={{ flexDirection: 'column', width: 56, marginRight: 6 }}>
                                <TextWidget
                                    text={cls.startTime}
                                    style={{
                                        color: '#ECC875',
                                        fontSize: 10,
                                        fontWeight: 'bold',
                                    }}
                                />
                                <TextWidget
                                    text={cls.endTime}
                                    style={{
                                        color: '#ECC875',
                                        fontSize: 9,
                                        fontWeight: 'bold',
                                        marginTop: 1,
                                    }}
                                />
                            </FlexWidget>

                            {/* Class Info Column */}
                            <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
                                <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <TextWidget
                                        text={cls.subjectName}
                                        style={{
                                            color: '#F4EFEA',
                                            fontSize: 11,
                                            fontWeight: 'bold',
                                            flex: 1,
                                        }}
                                    />
                                    {cls.shortName ? (
                                        <TextWidget
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
                                </FlexWidget>

                                {cls.room ? (
                                    <TextWidget
                                        text={`📍 ${cls.room}`}
                                        style={{
                                            color: '#999086',
                                            fontSize: 9,
                                            marginTop: 2,
                                        }}
                                    />
                                ) : null}
                            </FlexWidget>
                        </FlexWidget>
                    ))}
                </FlexWidget>
            )}
        </FlexWidget>
    );
}
