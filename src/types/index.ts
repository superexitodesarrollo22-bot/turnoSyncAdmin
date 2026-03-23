export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type UserRole = 'admin' | 'staff' | 'owner';

export interface UserProfile {
    id: string;
    supabase_auth_uid: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    is_superuser: boolean;
    created_at: string;
}

export interface Business {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    address: string | null;
    phone: string | null;
    whatsapp: string | null;
    logo_url: string | null;
    timezone: string;
    slot_interval_minutes?: number; // Añadido
    push_notifications_enabled?: boolean; // Añadido
    active: boolean;
    created_at: string;
}

export interface Service {
    id: string;
    business_id: string;
    name: string;
    duration_minutes: number;
    price_cents: number;
    active: boolean;
}

export interface Schedule {
    id: string;
    business_id: string;
    weekday: number; // 0=Domingo, 1=Lunes ... 6=Sábado
    start_time: string;
    end_time: string;
}

export interface BlackoutDate {
    id: string;
    business_id: string;
    date: string;
    reason: string | null;
}

export interface Staff {
    id: string;
    business_id: string;
    name: string;
    specialty: string | null;
    photo_url: string | null;
    active: boolean;
}

export interface Appointment {
    id: string;
    business_id: string;
    client_user_id: string;
    service_id: string;
    staff_id: string | null;
    start_at: string;
    end_at: string;
    status: AppointmentStatus;
    price_cents: number;
    notes: string | null;
    created_at: string;
    // Relaciones (pueden venir del join o cargarse por separado)
    users?: UserProfile;
    services?: Service;
    staff?: Staff;
    // Alias que usa Supabase al hacer join con client_user_id
    client?: UserProfile;
}

export interface BusinessUser {
    id: string;
    business_id: string;
    user_id: string;
    role: UserRole;
    created_at: string;
}

export interface SubscriptionRequest {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    company_name: string;
    company_address: string;
    company_phone: string;
    company_description: string;
    estimated_services: string;
    status: 'pending' | 'approved' | 'rejected';
    notes?: string;
    reviewed_at?: string;
    created_at: string;
}
