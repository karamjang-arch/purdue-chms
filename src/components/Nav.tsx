"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드", roles: ["admin"] },
  { href: "/members", label: "성도 목록", roles: ["admin"] },
  { href: "/members/new", label: "새가족 등록", roles: ["admin", "newcomer_team"] },
  { href: "/activities/new", label: "활동 기록", roles: ["admin"] },
  { href: "/ministry", label: "봉사명부", roles: ["admin"] },
  { href: "/newcomers", label: "새가족 명단", roles: ["admin", "newcomer_team"] },
  { href: "/alumni", label: "알럼나이", roles: ["admin"] },
];

export default function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!session || session.role === "unauthorized") return null;

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(session.role)
  );

  return (
    <nav className="bg-navy-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/dashboard" className="font-bold text-lg">
            퍼듀교회 교적부
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded text-sm transition-colors ${
                  pathname === item.href
                    ? "bg-white/20 font-semibold"
                    : "hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="ml-4 px-3 py-2 rounded text-sm hover:bg-white/10"
            >
              로그아웃
            </button>
          </div>

          {/* Mobile burger */}
          <button
            className="md:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-3 space-y-1">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded text-sm ${
                  pathname === item.href
                    ? "bg-white/20 font-semibold"
                    : "hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="block w-full text-left px-3 py-2 rounded text-sm hover:bg-white/10"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
