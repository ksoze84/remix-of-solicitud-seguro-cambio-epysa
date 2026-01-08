import { exec } from '@/integrations/epy/EpysaApi';
import { useState, useEffect } from 'react';

export const useBanks = () => {
  const [banks, setBanks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      setLoading(true);
      const data = (await exec('frwrd/list_bank_executives')).data as { bank_name: string }[];
      // Get unique bank names
      const uniqueBanks = [...new Set(data.map(item => item.bank_name))];
      setBanks(uniqueBanks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading banks');
      console.error('Error fetching banks:', err);
    } finally {
      setLoading(false);
    }
  };

  return { banks, loading, error, refetch: fetchBanks };
};