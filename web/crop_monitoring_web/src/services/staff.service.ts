import { supabase } from '@/lib/supabase'
import { emailService } from './email.service'
import type { Profile } from '@/types/database.types'

/**
 * Fetch all staff profiles
 */
export async function fetchStaff(): Promise<Profile[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name', { ascending: true })

    if (error) {
        console.error('Error fetching staff:', error)
        throw error
    }

    return data as Profile[]
}

/**
 * Fetch staff by role
 */
export async function fetchStaffByRole(role: string): Promise<Profile[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', role)
        .order('first_name', { ascending: true })

    if (error) {
        console.error('Error fetching staff by role:', error)
        throw error
    }

    return data as Profile[]
}

/**
 * Handle new user sign-up request
 */
export async function requestSignUp(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: 'admin' | 'supervisor';
}) {
    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
            data: {
                first_name: data.first_name,
                last_name: data.last_name,
                full_name: `${data.first_name} ${data.last_name}`,
                role: data.role,
                status: 'pending', // Default to pending
            },
        },
    })

    if (authError) throw authError

    // 2. Real notification trigger
    await emailService.sendSignUpNotification({
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        role: data.role,
    })

    return authData
}

/**
 * Fetch all pending account requests
 */
export async function fetchPendingUsers(): Promise<Profile[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data as Profile[]
}

/**
 * Approve or Reject a user account
 */
export async function updateUserStatus(
    userId: string,
    email: string,
    role: string,
    status: 'approved' | 'rejected'
) {
    // 1. Update the profile record in public schema
    const { error: profileError } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', userId)

    if (profileError) throw profileError

    // 2. Update user metadata in Auth schema so login logic sees it immediately
    // Note: This usually requires a service role key or an edge function
    // For this demo, we assume profile status is the source of truth used in AuthContext

    // 3. Send notification email to the user
    if (status === 'approved') {
        await emailService.sendApprovalNotification(email, role)
    } else {
        await emailService.sendRejectionNotification(email)
    }

    return { success: true }
}
