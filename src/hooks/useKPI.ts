/**
 * useKPI Hook
 * Custom hook for fetching and managing KPI data
 * @module hooks/useKPI
 */

import { useState, useEffect, useCallback } from 'react';
import { API, type CalculateKPIsResponse } from '../services/api';

interface KPIData {
  value: number | null;
  calculated_at: string;
  unit: string | null;
  error?: string;
}

interface UseKPIOptions {
  saveToDB?: boolean;
  autoFetch?: boolean;
}

/**
 * Custom hook for fetching KPI data
 * @param seafarerId Seafarer ID
 * @param kpiCode KPI code to fetch (optional - if not provided, fetches all)
 * @param options Hook options
 */
export function useKPI(
  seafarerId: number | null,
  kpiCode?: string,
  options: UseKPIOptions = {}
) {
  const {
    saveToDB = false,
    autoFetch = true,
  } = options;

  const [kpiData, setKpiData] = useState<KPIData | Record<string, KPIData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch KPI data from API
   */
  const fetchKPI = useCallback(async () => {
    if (!seafarerId) {
      setError('Seafarer ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: CalculateKPIsResponse = await API.calculateKPIs({
        seafarerId,
        kpiCodes: kpiCode ? [kpiCode] : undefined,
        saveToDB,
      });

      // If specific KPI code requested, return just that KPI
      if (kpiCode && data.kpis[kpiCode]) {
        setKpiData(data.kpis[kpiCode]);
      } else {
        // Otherwise return all KPIs
        setKpiData(data.kpis);
      }
    } catch (err: any) {
      console.error('KPI fetch error:', err);
      setError(err.message || 'Failed to fetch KPI data');
      setKpiData(null);
    } finally {
      setLoading(false);
    }
  }, [seafarerId, kpiCode, saveToDB]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch && seafarerId) {
      fetchKPI();
    }
  }, [seafarerId, kpiCode, autoFetch, fetchKPI]);

  return {
    kpiData,
    loading,
    error,
    refetch: fetchKPI,
  };
}

/**
 * Hook for fetching multiple KPIs for a crew member
 * This is a convenience wrapper that accepts an array of KPI codes
 */
export function useKPIs(
  seafarerId: number | null,
  kpiCodes?: string[],
  options: UseKPIOptions = {}
) {
  const {
    saveToDB = false,
    autoFetch = true,
  } = options;

  const [kpiData, setKpiData] = useState<Record<string, KPIData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKPIs = useCallback(async () => {
    if (!seafarerId) {
      setError('Seafarer ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: CalculateKPIsResponse = await API.calculateKPIs({
        seafarerId,
        kpiCodes: kpiCodes && kpiCodes.length > 0 ? kpiCodes : undefined,
        saveToDB,
      });
      setKpiData(data.kpis);
    } catch (err: any) {
      console.error('KPIs fetch error:', err);
      setError(err.message || 'Failed to fetch KPI data');
      setKpiData(null);
    } finally {
      setLoading(false);
    }
  }, [seafarerId, kpiCodes, saveToDB]);

  useEffect(() => {
    if (autoFetch && seafarerId) {
      fetchKPIs();
    }
  }, [seafarerId, kpiCodes, autoFetch, fetchKPIs]);

  return {
    kpiData,
    loading,
    error,
    refetch: fetchKPIs,
  };
}
