"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useWayfareAccount() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const loadProfile = useCallback(async (nextUser) => {
    if (!nextUser) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from("profiles").select("*").eq("id", nextUser.id).maybeSingle();
    if (error) setMessage({ type: "error", text: "Your account is signed in, but the cloud profile could not be loaded yet." });
    setProfile(data || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const nextUser = data.session?.user || null;
      setUser(nextUser);
      loadProfile(nextUser);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null;
      setUser(nextUser);
      loadProfile(nextUser);
    });
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  async function signIn(email, password) {
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return setMessage({ type: "error", text: error.message });
    setMessage({ type: "success", text: "Signed in. Your Wayfare profile is now synced." });
  }

  async function signUp(email, password, displayName) {
    setMessage(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: displayName.trim() } },
    });
    if (error) return setMessage({ type: "error", text: error.message });
    setMessage({
      type: "success",
      text: data.session ? "Account created and profile syncing is on." : "Account created. Check your email to confirm, then sign in.",
    });
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) return setMessage({ type: "error", text: error.message });
    setMessage({ type: "success", text: "Signed out. Guest mode is still available on this device." });
  }

  async function saveProfile(values) {
    if (!user) return { error: null, skipped: true };
    const record = {
      id: user.id,
      display_name: values.name.trim(),
      avatar: values.avatar || null,
      home_city: values.home.trim() || null,
      bio: values.bio.trim() || null,
      preferred_currency: values.currency,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("profiles").upsert(record).select().single();
    if (!error) setProfile(data);
    return { data, error, skipped: false };
  }

  return { user, profile, loading, message, setMessage, signIn, signUp, signOut, saveProfile };
}

