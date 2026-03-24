import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface MiniCalendarProps {
    selectedDates: string[]; // ['YYYY-MM-DD']
    blockedDates: string[];
    onSelectDate: (date: string) => void;
    isRange?: boolean;
    startDate?: string;
    endDate?: string;
}

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const MiniCalendar: React.FC<MiniCalendarProps> = ({
    selectedDates,
    blockedDates,
    onSelectDate,
    isRange = false,
    startDate,
    endDate
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();

        // Días del mes anterior para rellenar
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        const fillDays = firstDay;

        const days = [];

        // Relleno mes anterior
        for (let i = fillDays - 1; i >= 0; i--) {
            days.push({
                day: prevMonthLastDay - i,
                month: month - 1,
                year: month === 0 ? year - 1 : year,
                current: false
            });
        }

        // Días mes actual
        for (let i = 1; i <= totalDays; i++) {
            days.push({
                day: i,
                month: month,
                year: year,
                current: true
            });
        }

        // Relleno mes siguiente (hasta completar 42 días - 6 semanas)
        const nextFill = 42 - days.length;
        for (let i = 1; i <= nextFill; i++) {
            days.push({
                day: i,
                month: month + 1,
                year: month === 11 ? year + 1 : year,
                current: false
            });
        }

        return days;
    }, [currentDate]);

    const changeMonth = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        newDate.setMonth(currentDate.getMonth() + (direction === 'prev' ? -1 : 1));
        setCurrentDate(newDate);
    };

    const isSelected = (dateStr: string) => {
        if (isRange) {
            if (!startDate) return false;
            if (!endDate) return dateStr === startDate;
            return dateStr >= startDate && dateStr <= endDate;
        }
        return selectedDates.includes(dateStr);
    };

    const isBlocked = (dateStr: string) => blockedDates.includes(dateStr);
    const isToday = (d: number, m: number, y: number) => {
        const today = new Date();
        return d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
    };

    return (
        <View style={styles.container}>
            {/* Header Mes */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => changeMonth('prev')} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={20} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</Text>
                <TouchableOpacity onPress={() => changeMonth('next')} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={20} color="#1A1A1A" />
                </TouchableOpacity>
            </View>

            {/* Weekdays */}
            <View style={styles.weekdays}>
                {WEEKDAYS.map(day => <Text key={day} style={styles.weekdayText}>{day}</Text>)}
            </View>

            {/* Grid */}
            <View style={styles.grid}>
                {daysInMonth.map((item, index) => {
                    const dateStr = `${item.year}-${String(item.month + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
                    const selected = isSelected(dateStr);
                    const blocked = isBlocked(dateStr);
                    const today = isToday(item.day, item.month, item.year);

                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.dayCell,
                                selected && styles.selectedCell,
                                selected && isRange && startDate && endDate && dateStr > startDate && dateStr < endDate && styles.rangeMiddleCell
                            ]}
                            onPress={() => item.current && onSelectDate(dateStr)}
                            disabled={!item.current}
                        >
                            <Text style={[
                                styles.dayText,
                                !item.current && styles.notCurrentText,
                                selected && styles.selectedText,
                                today && !selected && styles.todayText
                            ]}>
                                {item.day}
                            </Text>
                            {blocked && <View style={styles.blockedDot} />}
                            {today && !selected && <View style={styles.todayDot} />}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    navBtn: {
        padding: 8,
    },
    monthTitle: {
        color: '#1A1A1A',
        fontSize: 16,
        fontWeight: 'bold',
    },
    weekdays: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    weekdayText: {
        color: '#9A9A9A',
        fontSize: 12,
        fontWeight: 'bold',
        width: (width - 80) / 7,
        textAlign: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    dayCell: {
        width: (width - 80) / 7,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
        borderRadius: 20,
    },
    dayText: {
        color: '#1A1A1A',
        fontSize: 14,
    },
    notCurrentText: {
        color: '#C0C0C0',
    },
    selectedCell: {
        backgroundColor: '#E94560',
    },
    rangeMiddleCell: {
        backgroundColor: 'rgba(233, 69, 96, 0.4)',
        borderRadius: 0,
    },
    selectedText: {
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    todayText: {
        color: '#E94560',
        fontWeight: 'bold',
    },
    todayDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E94560',
        position: 'absolute',
        bottom: 4,
    },
    blockedDot: {
        width: 14,
        height: 2,
        backgroundColor: '#E94560',
        position: 'absolute',
        transform: [{ rotate: '45deg' }],
    },
});

export default MiniCalendar;
