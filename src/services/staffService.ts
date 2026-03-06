import { supabase } from '../config/supabase';
import { Staff } from '../types';

/**
 * Obtiene todos los miembros del staff activos para un negocio.
 * Útil para selectores de asignación de turnos.
 */
export async function getActiveStaff(businessId: string): Promise<Staff[]> {
    try {
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .eq('business_id', businessId)
            .eq('active', true)
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error in getActiveStaff:', error);
        return [];
    }
}
