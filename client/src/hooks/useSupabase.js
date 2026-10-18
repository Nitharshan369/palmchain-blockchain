import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * useSupabaseQuery
 * Generic hook for fetching data from Supabase with loading/error states.
 *
 * @param {Function} queryFn - async function that returns { data, error } from supabase
 * @param {Array} deps - dependency array to re-trigger the query
 */
export function useSupabaseQuery(queryFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryFn();
      if (result.error) throw result.error;
      setData(result.data);
    } catch (e) {
      setError(e.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}

/**
 * useBatches
 * Fetches a list of batches with optional filters.
 * Used by the marketplace, producer dashboard, and verifier pages.
 */
export function useBatches(filters = {}) {
  return useSupabaseQuery(async () => {
    let query = supabase
      .from('batches')
      .select(`
        *,
        producer:profiles!batches_producer_id_fkey(
          id, full_name, organization_name, wallet_address
        ),
        farm:farms(id, farm_name, region, state)
      `)
      .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.producerId) query = query.eq('producer_id', filters.producerId);
    if (filters.batchNumber) query = query.ilike('batch_number', `%${filters.batchNumber}%`);
    if (filters.limit) query = query.limit(filters.limit);

    return query;
  }, [JSON.stringify(filters)]);
}

/**
 * useBatch
 * Fetches a single batch by batch_number (human-readable ID, e.g. PJG-2026-001).
 * Includes related trace logs, producer profile, and farm.
 */
export function useBatch(batchNumber) {
  return useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('batches')
      .select(`
        *,
        producer:profiles!batches_producer_id_fkey(
          id, full_name, organization_name, wallet_address, phone
        ),
        farm:farms(id, farm_name, region, state, latitude, longitude, organic_certified, palm_tree_count),
        batch_trace_logs(id, stage_name, stage_order, location_name, stage_timestamp, notes, metadata)
      `)
      .eq('batch_number', batchNumber)
      .maybeSingle();

    // Order trace logs client-side since Supabase nested ordering needs explicit RPC
    if (data?.batch_trace_logs) {
      data.batch_trace_logs.sort((a, b) => a.stage_order - b.stage_order);
    }

    return { data, error };
  }, [batchNumber]);
}

/**
 * useProducts
 * Fetches active marketplace products with related batch and producer info.
 */
export function useProducts(filters = {}) {
  return useSupabaseQuery(async () => {
    let query = supabase
      .from('products')
      .select(`
        *,
        batch:batches(
          id, batch_number, status, is_certified, harvest_date, form, total_quantity_kg
        ),
        producer:profiles!products_producer_id_fkey(
          id, full_name, organization_name
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (filters.producerId) query = query.eq('producer_id', filters.producerId);
    if (filters.limit) query = query.limit(filters.limit);

    return query;
  }, [JSON.stringify(filters)]);
}

/**
 * useFarms
 * Fetches farms for a specific producer.
 */
export function useFarms(producerId) {
  return useSupabaseQuery(async () => {
    if (!producerId) return { data: [], error: null };
    return supabase
      .from('farms')
      .select('*')
      .eq('producer_id', producerId)
      .order('created_at', { ascending: false });
  }, [producerId]);
}

/**
 * useProfile
 * Fetches a profile by wallet address.
 */
export function useProfile(walletAddress) {
  return useSupabaseQuery(async () => {
    if (!walletAddress) return { data: null, error: null };
    return supabase
      .from('profiles')
      .select('*')
      .ilike('wallet_address', walletAddress)
      .maybeSingle();
  }, [walletAddress]);
}
