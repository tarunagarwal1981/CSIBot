/**
 * useCrewSearch Hook
 * Custom hook for searching crew members
 * @module hooks/useCrewSearch
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { API } from '../services/api';
import type { CrewMaster } from '../types/database';

interface UseCrewSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
}

/**
 * Custom hook for crew search functionality
 * Includes debouncing and loading state management
 */
export function useCrewSearch(options: UseCrewSearchOptions = {}) {
  const {
    debounceMs = 300,
    minQueryLength = 2,
  } = options;

  const [results, setResults] = useState<CrewMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Search crew members
   */
  const search = useCallback(
    async (query: string) => {
      // Clear previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // If query is too short, clear results
      if (query.trim().length < minQueryLength) {
        setResults([]);
        setError(null);
        return;
      }

      // Debounce the search
      debounceTimerRef.current = setTimeout(async () => {
        setLoading(true);
        setError(null);

        try {
          const results = await API.searchCrew(query.trim(), 50);
          setResults(results);
        } catch (err: any) {
          console.error('Crew search error:', err);
          setError(err.message || 'Failed to search crew');
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, debounceMs);
    },
    [debounceMs, minQueryLength]
  );

  /**
   * Clear search results
   */
  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearResults,
  };
}

/**
 * Hook for fetching a single crew member by ID
 */
export function useCrew(seafarerId: number | null) {
  const [crew, setCrew] = useState<CrewMaster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!seafarerId) {
      setCrew(null);
      return;
    }

    const fetchCrew = async () => {
      setLoading(true);
      setError(null);

      try {
        const crewData = await API.getCrewById(seafarerId);
        setCrew(crewData);
      } catch (err: any) {
        console.error('Crew fetch error:', err);
        setError(err.message || 'Failed to fetch crew');
        setCrew(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCrew();
  }, [seafarerId]);

  return {
    crew,
    loading,
    error,
  };
}
