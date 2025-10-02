import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/customSupabaseClient';

const fetchCountries = async () => {
  const { data, error } = await supabase
    .from('countries')
    .select('code_iso2, name')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((country) => ({
    code: country.code_iso2,
    name: country.name,
  }));
};

const useCountries = () => {
  return useQuery({
    queryKey: ['countries'],
    queryFn: fetchCountries,
    staleTime: 1000 * 60 * 60,
    cacheTime: 1000 * 60 * 60 * 6,
  });
};

export default useCountries;
