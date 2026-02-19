import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AuthUser, AuthState, LoginCredentials } from '@/types/auth.types'
import { User } from '@supabase/supabase-js'

interface AuthContextType extends AuthState {
    signIn: (credentials: LoginCredentials) => Promise<void>
    signOut: () => Promise<void>
    resetPassword: (email: string) => Promise<void>
    updatePassword: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getUserRole(user: User): AuthUser['role'] {
    // CRITICAL: Check app_metadata FIRST. 
    // This is where admin-assigned roles from the Supabase Dashboard reside.
    // user_metadata contains signup-provided data which should be overwritten by admin assignment.
    const role = user.app_metadata?.role || user.user_metadata?.role

    if (role === 'admin' || role === 'supervisor' || role === 'collector') {
        return role as AuthUser['role']
    }

    // Default to collector if no role specified
    return 'collector'
}

function getUserStatus(user: User): AuthUser['status'] {
    const status = user.user_metadata?.status || user.app_metadata?.status
    if (status === 'approved' || status === 'pending' || status === 'rejected') {
        return status
    }
    return 'pending'
}

function mapSupabaseUser(user: User): AuthUser {
    return {
        id: user.id,
        email: user.email || '',
        role: getUserRole(user),
        status: getUserStatus(user),
        full_name: user.user_metadata?.full_name,
        user_metadata: user.user_metadata,
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
    })

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setAuthState({
                user: session?.user ? mapSupabaseUser(session.user) : null,
                isLoading: false,
                isAuthenticated: !!session?.user,
            })
        })

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                // If we have a session, assume valid for now, but really we should probably re-verify profile
                // For simplicity in onAuthStateChange, we'll map from session, 
                // but the critical check happens in signIn and initial load.
                // Improve: fetch profile here too if needed.
                setAuthState({
                    user: mapSupabaseUser(session.user),
                    isLoading: false,
                    isAuthenticated: true,
                })
            } else {
                setAuthState({
                    user: null,
                    isLoading: false,
                    isAuthenticated: false,
                })
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const signIn = async (credentials: LoginCredentials) => {
        const { data, error } = await supabase.auth.signInWithPassword(credentials)
        if (error) throw error

        if (data.user) {
            // CRITICAL FIX: Fetch true status from public.profiles
            // user_metadata is NOT updated when admin approves in profiles table.
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single()

            if (profileError) {
                // If no profile, we can't let them in (or we treat as pending)
                await supabase.auth.signOut()
                throw new Error('Profile not found. Please contact support.')
            }

            const status = profile.status
            const role = profile.role

            if (status !== 'approved') {
                await supabase.auth.signOut() // Kill the session
                const statusMsg = status === 'pending'
                    ? 'Your account is pending approval. Please contact the administrator.'
                    : 'Your account request was rejected.'
                throw new Error(statusMsg)
            }

            // Construct auth user from the REAL profile data
            const authUser: AuthUser = {
                id: data.user.id,
                email: data.user.email || '',
                role: role as AuthUser['role'], // Use role from DB
                status: status as AuthUser['status'], // Use status from DB
                full_name: `${profile.first_name} ${profile.last_name}`,
                user_metadata: data.user.user_metadata,
            }

            setAuthState({
                user: authUser,
                isLoading: false,
                isAuthenticated: true,
            })
        }
    }

    const signOut = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error

        setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
        })
    }

    const resetPassword = async (email: string) => {
        // The URL to redirect to after user clicks the link in email
        // Ideally this should be an env var, but for now we'll assume the same host
        const redirectTo = `${window.location.origin}/update-password`

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo,
        })
        if (error) throw error
    }

    const updatePassword = async (password: string) => {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
    }

    const value: AuthContextType = {
        ...authState,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
