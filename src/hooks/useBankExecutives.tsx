import { exec } from '@/integrations/epy/EpysaApi';
import { useState, useEffect } from 'react';

export interface BankExecutive {
  id: string;
  name: string;
  bank_name: string;
  contact_number: string;
}

// Cache for all executives to avoid multiple API calls
let allExecutivesCache: BankExecutive[] | null = null;
let isFetchingAll = false;
let cachePromise: Promise<BankExecutive[]> | null = null;

const fetchAllExecutives = async (): Promise<BankExecutive[]> => {
  if (allExecutivesCache) {
    return allExecutivesCache;
  }
  
  if (isFetchingAll && cachePromise) { //NOSONAR
    return cachePromise;
  }

  isFetchingAll = true;
  cachePromise = exec('frwrd/list_bank_executives').then(response => {
    const data = response.data as BankExecutive[];
    allExecutivesCache = data || [];
    isFetchingAll = false;
    return allExecutivesCache;
  }).catch(err => {
    isFetchingAll = false;
    cachePromise = null;
    throw err;
  });

  return cachePromise;
};

export const useBankExecutives = (bankName?: string) => {
  const [executives, setExecutives] = useState<BankExecutive[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bankName) {
      setExecutives([]);
      return;
    }

    const loadExecutives = async () => {
      try {
        setLoading(true);
        setError(null);

        const allExecutives = await fetchAllExecutives();
        const filteredExecutives = allExecutives.filter(exec => exec.bank_name === bankName);
        
        setExecutives(filteredExecutives);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading executives');
        console.error('Error fetching bank executives:', err);
        setExecutives([]);
      } finally {
        setLoading(false);
      }
    };

    loadExecutives();
  }, [bankName]);

  const refetch = async () => {
    if (!bankName) return;
    
    // Clear cache to force fresh data
    allExecutivesCache = null;
    cachePromise = null;
    
    try {
      setLoading(true);
      setError(null);
      
      const allExecutives = await fetchAllExecutives();
      const filteredExecutives = allExecutives.filter(exec => exec.bank_name === bankName);
      
      setExecutives(filteredExecutives);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading executives');
      console.error('Error fetching bank executives:', err);
      setExecutives([]);
    } finally {
      setLoading(false);
    }
  };

  return { executives, loading, error, refetch };
};