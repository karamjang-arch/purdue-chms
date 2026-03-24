"use client";

import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import {
  DEMO_MEMBERS,
  DEMO_VISITATIONS,
  DEMO_TRAINING,
  DEMO_MINISTRY,
  DEMO_SACRAMENTS,
} from "./demo-data";

export function useDemo() {
  const searchParams = useSearchParams();
  return searchParams.get("demo") === "true";
}

export function useAuthOrDemo() {
  const { data: session, status } = useSession();
  const isDemo = useDemo();
  return {
    session,
    status,
    isDemo,
    isAuthed: isDemo || (status === "authenticated" && session?.role !== "unauthorized"),
    role: isDemo ? "admin" : session?.role || "unauthorized",
  };
}

export function useFetch<T>(url: string, demoData: T) {
  const isDemo = useDemo();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (isDemo) {
      setData(demoData);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fetch failed");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [url, isDemo, demoData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useDemoData() {
  return {
    members: DEMO_MEMBERS,
    visitations: DEMO_VISITATIONS,
    training: DEMO_TRAINING,
    ministry: DEMO_MINISTRY,
    sacraments: DEMO_SACRAMENTS,
  };
}
