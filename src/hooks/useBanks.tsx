import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      const { data, error } = await supabase
        .from('bank_executives')
        .select('bank_name')
        .order('bank_name');

      if (error) throw error;

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