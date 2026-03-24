"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.role && session.role !== "unauthorized") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy-800 mb-1">퍼듀교회 교적부</h1>
          <p className="text-navy-500 text-sm">Purdue Korean Church · ChMS</p>
        </div>

        {status === "loading" && (
          <p className="text-navy-400 text-sm">로딩 중...</p>
        )}

        {status === "unauthenticated" && (
          <button
            onClick={() => signIn("google")}
            className="w-full bg-navy-800 text-white py-3 px-4 rounded-lg font-medium hover:bg-navy-700 transition-colors"
          >
            Google 계정으로 로그인
          </button>
        )}

        {status === "authenticated" && session?.role === "unauthorized" && (
          <div className="text-red-600 text-sm">
            <p className="font-semibold mb-1">접근 권한이 없습니다</p>
            <p>관리자에게 문의하세요.</p>
            <p className="mt-2 text-xs text-gray-500">{session.user?.email}</p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100">
          <Link
            href="/dashboard?demo=true"
            className="text-navy-500 text-xs hover:text-navy-700 underline"
          >
            데모 모드로 둘러보기
          </Link>
        </div>
      </div>
    </div>
  );
}
