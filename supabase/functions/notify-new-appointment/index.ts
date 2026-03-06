import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface WebhookPayload {
    type: 'INSERT' | 'UPDATE' | 'DELETE'
    table: string
    record: {
        id: string
        business_id: string
        client_user_id: string
        service_id: string
        start_at: string
        status: string
    }
    old_record?: {
        status: string
    }
}

serve(async (req: Request) => {
    try {
        const payload: WebhookPayload = await req.json()

        // Solo procesar INSERTs en appointments
        if (payload.type !== 'INSERT' || payload.table !== 'appointments') {
            return new Response('OK', { status: 200 })
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const appt = payload.record

        // 1. Obtener datos del negocio, servicio y cliente en paralelo
        const [businessUsersRes, serviceRes, clientRes] = await Promise.all([
            supabase
                .from('business_users')
                .select('user_id')
                .eq('business_id', appt.business_id)
                .in('role', ['admin', 'owner']),
            supabase
                .from('services')
                .select('name')
                .eq('id', appt.service_id)
                .single(),
            supabase
                .from('users')
                .select('full_name')
                .eq('id', appt.client_user_id)
                .single(),
        ])

        const adminUserIds = (businessUsersRes.data ?? []).map((bu: { user_id: string }) => bu.user_id)
        const serviceName = serviceRes.data?.name ?? 'Servicio'
        const clientName = clientRes.data?.full_name ?? 'Cliente'

        if (!adminUserIds.length) {
            return new Response('No admin found', { status: 200 })
        }

        // 2. Obtener tokens push de los admins
        const { data: devices } = await supabase
            .from('user_devices')
            .select('expo_push_token')
            .in('user_id', adminUserIds)

        if (!devices?.length) {
            return new Response('No tokens', { status: 200 })
        }

        // 3. Formatear fecha y hora
        const startDate = new Date(appt.start_at)
        const hora = startDate.toLocaleTimeString('es', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        })
        const fecha = startDate.toLocaleDateString('es', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        })

        // 4. Construir mensajes para Expo Push API
        const messages = devices.map((device: { expo_push_token: string }) => ({
            to: device.expo_push_token,
            sound: 'default',
            title: '📅 Nuevo turno agendado',
            body: `${clientName} reservó ${serviceName} para el ${fecha} a las ${hora}`,
            data: {
                type: 'new_appointment',
                appointmentId: appt.id,
                screen: 'Turnos',
            },
            priority: 'high',
            channelId: 'turnos',
        }))

        // 5. Enviar a Expo Push API (en chunks de 100 máximo)
        const chunks = chunkArray(messages, 100)
        for (const chunk of chunks) {
            await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                },
                body: JSON.stringify(chunk),
            })
        }

        return new Response(JSON.stringify({ sent: messages.length }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('Error en notify-new-appointment:', error)
        return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
    }
})

function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size))
    }
    return chunks
}
