import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_PROFILE = {
  risk_tolerance:  '穩健',
  industries:      [],
  knowledge_level: '新手',
};

export function useUserProfile(user) {
  const [profile, setProfile]     = useState(DEFAULT_PROFILE);
  const [loading, setLoading]     = useState(false);
  const [saving,  setSaving]      = useState(false);

  // Load profile from Supabase when user changes
  useEffect(() => {
    if (!user || !supabase) { setProfile(DEFAULT_PROFILE); return; }
    setLoading(true);
    supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setProfile({
            risk_tolerance:  data.risk_tolerance  || DEFAULT_PROFILE.risk_tolerance,
            industries:      data.industries      || [],
            knowledge_level: data.knowledge_level || DEFAULT_PROFILE.knowledge_level,
          });
        }
        setLoading(false);
      });
  }, [user?.id]);

  const saveProfile = useCallback(async (updates) => {
    if (!user || !supabase) return;
    setSaving(true);
    const next = { ...profile, ...updates };
    await supabase.from('user_profiles').upsert({
      user_id:         user.id,
      ...next,
      updated_at:      new Date().toISOString(),
    });
    setProfile(next);
    setSaving(false);
    return next;
  }, [user, profile]);

  return { profile, loading, saving, saveProfile };
}
