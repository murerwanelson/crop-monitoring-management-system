import { supabase } from '@/lib/supabase'
import type { FullObservation, Field, ObservationFilters } from '@/types/database.types'

/**
 * Fetch all observations with related data
 */
export async function fetchObservations(filters?: ObservationFilters): Promise<FullObservation[]> {
    let query = supabase
        .from('observations')
        .select(`
      *,
      crop_information(*),
      crop_monitoring(*),
      soil_characteristics(*),
      irrigation_management(*),
      nutrient_management(*),
      crop_protection(*),
      control_methods(*),
      harvest(*),
      residual_management(*),
      images(*)
    `)
        .order('date_recorded', { ascending: false })

    // Apply filters
    if (filters?.cropType) {
        query = query.eq('crop_information.crop_type', filters.cropType)
    }
    if (filters?.variety) {
        query = query.eq('crop_information.variety', filters.variety)
    }
    if (filters?.fieldName) {
        query = query.eq('field_name', filters.fieldName)
    }
    if (filters?.section) {
        query = query.eq('section_name', filters.section)
    }
    if (filters?.block) {
        query = query.eq('block_id', filters.block)
    }
    if (filters?.startDate) {
        query = query.gte('date_recorded', filters.startDate)
    }
    if (filters?.endDate) {
        query = query.lte('date_recorded', filters.endDate)
    }
    if (filters?.stressLevel) {
        query = query.eq('crop_monitoring.stress', filters.stressLevel)
    }

    const { data, error } = await query

    if (error) {
        console.error('--- fetchObservations Failed ---')
        console.error('Error Details:', error)
        if (error.message?.includes('fetch')) {
            console.error('Potential Network Error detected in database service.')
        }
        throw error
    }

    return (data || []) as FullObservation[]
}

/**
 * Fetch a single observation by ID with all related data
 */
export async function fetchObservationById(id: string): Promise<FullObservation | null> {
    const { data, error } = await supabase
        .from('observations')
        .select(`
      *,
      crop_information(*),
      crop_monitoring(*),
      soil_characteristics(*),
      irrigation_management(*),
      nutrient_management(*),
      crop_protection(*),
      control_methods(*),
      harvest(*),
      residual_management(*),
      images(*)
    `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching observation:', error)
        throw error
    }

    return data as FullObservation
}

/**
 * Delete an observation (admin only)
 * Cascades to related tables via database constraints
 */
export async function deleteObservation(id: string): Promise<void> {
    // Explicitly delete related records first to handle cases where ON DELETE CASCADE might be missing
    const tables = [
        'crop_information',
        'crop_monitoring',
        'soil_characteristics',
        'irrigation_management',
        'nutrient_management',
        'crop_protection',
        'control_methods',
        'harvest',
        'residual_management',
        'images' // Assuming images metadata table is linked
    ]

    // We use Promise.all to delete parallel, but we need to handle them carefully.
    // Actually, simple sequential or parallel delete is fine.
    const deletePromises = tables.map(table =>
        supabase.from(table).delete().eq('observation_id', id)
    )

    await Promise.all(deletePromises)

    // Now delete the parent observation
    const { error, count } = await supabase
        .from('observations')
        .delete({ count: 'exact' })
        .eq('id', id)

    console.log('Delete operation result:', { id, error, count })

    if (error) {
        console.error('Error deleting observation:', error)
        throw error
    }
}

/**
 * Fetch unique fields with GPS coordinates and latest data
 */
export async function fetchFields(): Promise<Field[]> {
    const { data, error } = await supabase
        .from('observations')
        .select(`
      field_name,
      section_name,
      block_id,
      latitude,
      longitude,
      crop_information(crop_type),
      crop_monitoring(stress),
      irrigation_management(soil_moisture_percentage),
      images(image_url)
    `)
        .order('date_recorded', { ascending: false })

    if (error) {
        console.error('Error fetching fields:', error)
        throw error
    }

    // Group by field and get latest data
    const fieldsMap = new Map<string, Field>()

    data?.forEach((obs: any) => {
        const key = `${obs.section_name}-${obs.block_id}-${obs.field_name}`

        if (!fieldsMap.has(key)) {
            fieldsMap.set(key, {
                field_name: obs.field_name,
                section_name: obs.section_name,
                block_id: obs.block_id,
                latitude: obs.latitude,
                longitude: obs.longitude,
                crop_type: obs.crop_information?.crop_type,
                latest_stress: obs.crop_monitoring?.stress,
                latest_moisture: obs.irrigation_management?.soil_moisture_percentage,
                latest_image: obs.images?.[0]?.image_url,
                observation_count: 1,
            })
        } else {
            const existing = fieldsMap.get(key)!
            existing.observation_count++
        }
    })

    return Array.from(fieldsMap.values())
}

/**
 * Fetch distinct crop types for filters
 */
export async function fetchCropTypes(): Promise<string[]> {
    const { data, error } = await supabase
        .from('crop_information')
        .select('crop_type')

    if (error) {
        console.error('Error fetching crop types:', error)
        throw error
    }

    const uniqueTypes = [...new Set(data?.map(item => item.crop_type) || [])]
    return uniqueTypes.filter(Boolean) as string[]
}

/**
 * Fetch distinct field names for filters
 */
export async function fetchFieldNames(): Promise<string[]> {
    const { data, error } = await supabase
        .from('observations')
        .select('field_name')

    if (error) {
        console.error('Error fetching field names:', error)
        throw error
    }

    const uniqueFields = [...new Set(data?.map(item => item.field_name) || [])]
    return uniqueFields.filter(Boolean) as string[]
}

/**
 * Update an observation and its related tables
 */
export async function updateObservation(observation: FullObservation): Promise<void> {
    const { id, ...updates } = observation

    // Update main observation details
    const { error: obsError } = await supabase
        .from('observations')
        .update({
            field_name: updates.field_name,
            section_name: updates.section_name,
            block_id: updates.block_id,
        })
        .eq('id', id)

    if (obsError) throw obsError

    // Use Promise.all for parallel updates of related tables
    const promises = []

    if (updates.crop_information) {
        promises.push(
            supabase
                .from('crop_information')
                .upsert({ ...updates.crop_information, observation_id: id })
        )
    }

    if (updates.crop_monitoring) {
        promises.push(
            supabase
                .from('crop_monitoring')
                .upsert({ ...updates.crop_monitoring, observation_id: id })
        )
    }

    if (updates.irrigation_management) {
        promises.push(
            supabase
                .from('irrigation_management')
                .upsert({ ...updates.irrigation_management, observation_id: id })
        )
    }

    if (updates.nutrient_management) {
        promises.push(
            supabase
                .from('nutrient_management')
                .upsert({ ...updates.nutrient_management, observation_id: id })
        )
    }

    if (updates.soil_characteristics) {
        promises.push(
            supabase
                .from('soil_characteristics')
                .upsert({ ...updates.soil_characteristics, observation_id: id })
        )
    }

    if (updates.crop_protection) {
        promises.push(
            supabase
                .from('crop_protection')
                .upsert({ ...updates.crop_protection, observation_id: id })
        )
    }

    if (updates.control_methods) {
        promises.push(
            supabase
                .from('control_methods')
                .upsert({ ...updates.control_methods, observation_id: id })
        )
    }

    if (updates.harvest) {
        promises.push(
            supabase
                .from('harvest')
                .upsert({ ...updates.harvest, observation_id: id })
        )
    }

    if (updates.residual_management) {
        promises.push(
            supabase
                .from('residual_management')
                .upsert({ ...updates.residual_management, observation_id: id })
        )
    }

    const results = await Promise.all(promises)
    const errors = results.filter(r => r.error).map(r => r.error)

    if (errors.length > 0) {
        console.error('Errors updating related tables:', errors)
        throw new Error('Failed to update some related data')
    }
}


/**
 * Fetch all blocks with their geospatial geometries
 */
export async function fetchBlocks() {
    const { data, error } = await supabase
        .from('blocks')
        .select('*')

    if (error) {
        console.error('Error fetching blocks:', error)
        throw error
    }

    return data
}
