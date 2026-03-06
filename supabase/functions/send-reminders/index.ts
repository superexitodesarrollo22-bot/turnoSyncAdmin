import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (_req: Request) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Ventana de tiempo: turnos que empiezan entre 24h y 25h desde ahora
        const now = new Date()
        const from = new Date(now.getTime() + 24 * 60 * 60 * 1000)       // +24h
        const to = new Date(now.getTime() + 25 * 60 * 60 * 1000)       // +25h

        // 1. Buscar turnos en esa ventana que no estén cancelados
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
        id,
        start_at,
        end_at,
        business_id,
        client_user_id,
        status,
        services ( name, duration_minutes ),
        users!client_user_id ( id, full_name ),
        businesses ( name, timezone )
      `)
            .gte('start_at', from.toISOString())
            .lte('start_at', to.toISOString())
            .in('status', ['pending', 'confirmed'])

        if (error) throw error
        if (!appointments?.length) {
            return new Response(
                JSON.stringify({ message: 'No hay turnos en la ventana', checked_at: now.toISOString() }),
                { status: 200 }
            )
        }

        const allMessages: object[] = []

        for (const appt of appointments) {
            const timezone = (appt.businesses as { timezone: string })?.timezone ?? 'America/Guayaquil'
            const clientName = (appt.users as { full_name: string })?.full_name ?? 'Cliente'
            const serviceName = (appt.services as { name: string })?.name ?? 'Servicio'
            const clientUserId = appt.client_user_id
            const businessId = appt.business_id

            // Formatear hora en la timezone del negocio
            const startDate = new Date(appt.start_at)
            const hora = startDate.toLocaleTimeString('es', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: timezone,
            })
            const fecha = startDate.toLocaleDateString('es', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                timeZone: timezone,
            })

            // ── NOTIFICACIÓN AL CLIENTE (TurnoSync) ────────────────────────────
            const { data: clientDevices } = await supabase
                .from('user_devices')
                .select('expo_push_token')
                .eq('user_id', clientUserId)

            for (const device of clientDevices ?? []) {
                allMessages.push({
                    to: device.expo_push_token,
                    sound: 'default',
                    title: '⏰ Recordatorio de tu turno',
                    body: `Mañana tienes ${serviceName} a las ${hora}. ¡Te esperamos!`,
                    data: {
                        type: 'reminder_client',
                        appointmentId: appt.id,
                        screen: 'MisTurnos',           // pantalla destino en TurnoSync
                    },
                    priority: 'high',
                    channelId: 'turnos',
                })
            }

            // ── NOTIFICACIÓN AL ADMIN (TurnoSyncAdmin) ─────────────────────────
            const { data: adminUsers } = await supabase
                .from('business_users')
                .select('user_id')
                .eq('business_id', businessId)
                .in('role', ['admin', 'owner'])

            const adminUserIds = (adminUsers ?? []).map((u: { user_id: string }) => u.user_id)

            if (adminUserIds.length) {
                const { data: adminDevices } = await supabase
                    .from('user_devices')
                    .select('expo_push_token')
                    .in('user_id', adminUserIds)

                for (const device of adminDevices ?? []) {
                    allMessages.push({
                        to: device.expo_push_token,
                        sound: 'default',
                        title: '📋 Turno mañana',
                        body: `${clientName} tiene ${serviceName} mañana a las ${hora}`,
                        data: {
                            type: 'reminder_admin',
                            appointmentId: appt.id,
                            screen: 'Turnos',            // pantalla destino en TurnoSyncAdmin
                        },
                        priority: 'high',
                        channelId: 'turnos',
                    })
                }
            }
        }

        // 2. Enviar todos los mensajes en chunks de 100
        const chunks = chunkArray(allMessages, 100)
        let totalSent = 0
        for (const chunk of chunks) {
            const res = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(chunk),
            })
            const resJson = await res.json()
            console.log('Expo Push Response:', JSON.stringify(resJson))
            totalSent += chunk.length
        }

        return new Response(
            JSON.stringify({
                success: true,
                appointments_processed: appointments.length,
                notifications_sent: totalSent,
                window: { from: from.toISOString(), to: to.toISOString() },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error en send-reminders:', error)
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
