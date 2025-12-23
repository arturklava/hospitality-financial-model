/**
 * Cloud Storage Engine (v4.0)
 * 
 * Provides async functions for storing and retrieving scenarios from Supabase.
 * 
 * v4.0: Hybrid Storage Migration - Cloud for authenticated users, Local for guests.
 */

import { supabase } from '../../lib/supabase';
import type { NamedScenario } from '@domain/types';

/**
 * Database row type for scenarios table.
 */
interface ScenarioRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  content: NamedScenario; // JSONB stores full NamedScenario
  created_at: string;
  updated_at: string;
}

/**
 * Scenario with metadata from database.
 */
export interface ScenarioWithMetadata extends NamedScenario {
  updatedAt: string; // ISO timestamp string from database
  createdAt: string; // ISO timestamp string from database
}

/**
 * Fetches all scenarios for a given user from Supabase.
 * 
 * @param userId - User ID (UUID string from Supabase auth)
 * @returns Promise that resolves to array of NamedScenario objects with metadata
 * @throws Error if Supabase query fails
 */
export async function fetchScenarios(userId: string): Promise<ScenarioWithMetadata[]> {
  try {
    const { data, error } = await supabase
      .from('scenarios')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch scenarios: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform database rows to NamedScenario format with metadata
    // The database stores NamedScenario in the 'content' JSONB field
    const scenarios: ScenarioWithMetadata[] = data.map((row: ScenarioRow) => {
      // Use the stored content (which is the full NamedScenario)
      const scenario = row.content;
      
      // Ensure the scenario has the required fields
      return {
        id: scenario.id || row.id, // Use scenario.id if available, otherwise use row.id
        name: scenario.name || row.name, // Use scenario.name if available, otherwise use row.name
        description: scenario.description || row.description || undefined,
        modelConfig: scenario.modelConfig,
        updatedAt: row.updated_at,
        createdAt: row.created_at,
      };
    });

    return scenarios;
  } catch (error) {
    console.error('[Cloud Storage] Error fetching scenarios:', error);
    throw error;
  }
}

/**
 * Saves a scenario to Supabase (insert or update).
 * 
 * Uses upsert to handle both create and update operations.
 * The scenario's content is stored as JSONB in the 'content' field.
 * 
 * @param scenario - NamedScenario to save
 * @param userId - User ID (UUID string from Supabase auth)
 * @returns Promise that resolves when save is complete
 * @throws Error if Supabase upsert fails
 */
export async function saveScenario(
  scenario: NamedScenario,
  userId: string
): Promise<void> {
  try {
    // Prepare the row for database
    // We store the full NamedScenario in the 'content' JSONB field
    const row = {
      id: scenario.id, // Use scenario.id as primary key (upsert key)
      user_id: userId,
      name: scenario.name,
      description: scenario.description || null,
      content: scenario, // Store full NamedScenario as JSONB
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('scenarios')
      .upsert(row, {
        onConflict: 'id', // Upsert based on id (primary key)
      });

    if (error) {
      throw new Error(`Failed to save scenario: ${error.message}`);
    }
  } catch (error) {
    console.error('[Cloud Storage] Error saving scenario:', error);
    throw error;
  }
}

/**
 * Deletes a scenario from Supabase.
 * 
 * @param id - Scenario ID (UUID string)
 * @returns Promise that resolves when delete is complete
 * @throws Error if Supabase delete fails
 */
export async function deleteScenario(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('scenarios')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete scenario: ${error.message}`);
    }
  } catch (error) {
    console.error('[Cloud Storage] Error deleting scenario:', error);
    throw error;
  }
}

