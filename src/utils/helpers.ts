import { Platform } from 'react-native';

// Formatear precio (centavos → string con símbolo)
export function formatCurrency(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}

// Alias para mantener consistencia con el prompt
export const formatPrice = formatCurrency;

// Formatear duración en minutos a texto legible
export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// Obtener fecha en formato ISO (YYYY-MM-DD)
export function getISODate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Formatear fecha larga en español
export function getLongDate(date: Date = new Date()): string {
    return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
}

// Alias para formatDate según el prompt
export function formatDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('es', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

// Formatear hora en 12h
export function formatTime12h(dateInput: Date | string): string {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// Obtener nombre corto del día
export function getShortDayName(dayIndex: number): string {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Juv', 'Vie', 'Sáb'];
    return days[dayIndex];
}

// Calcular inicio de semana (lunes)
export function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Obtener saludo según hora del día
export function getGreeting(name: string): string {
    const hour = new Date().getHours();
    if (hour < 12) return `Buenos días, ${name}`;
    if (hour < 19) return `Buenas tardes, ${name}`;
    return `Buenas noches, ${name}`;
}

// Obtener iniciales del nombre
export function getInitials(fullName: string): string {
    if (!fullName) return 'A';
    return fullName
        .split(' ')
        .filter(n => n.length > 0)
        .slice(0, 2)
        .map(n => n[0])
        .join('')
        .toUpperCase();
}
