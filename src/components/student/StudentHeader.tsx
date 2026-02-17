"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRightIcon,
  ChevronDownIcon,
  CircleUserRoundIcon,
  HouseIcon,
  MenuIcon,
  ShoppingCartIcon,
  ShirtIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type StudentSession = {
  fullName?: string | null;
  cvsuEmail?: string;
  studentNumber?: string | null;
};

export type StudentNavItemKey =
  | "home"
  | "products"
  | "my-orders"
  | "track-orders"
  | "profile";

type MenuItem = {
  key: StudentNavItemKey;
  href: string;
  label: string;
  icon: LucideIcon;
};

const menuItems: MenuItem[] = [
  { key: "home", href: "/home", label: "Home", icon: HouseIcon },
  { key: "products", href: "/products", label: "Products", icon: ShirtIcon },
  { key: "my-orders", href: "/my-orders", label: "My Orders", icon: ShoppingCartIcon },
  { key: "track-orders", href: "/track-orders", label: "Track Orders", icon: ArrowLeftRightIcon },
  { key: "profile", href: "/profile", label: "Profile", icon: UserRoundIcon },
];

const getDisplayNameFromSession = () => {
  if (typeof window === "undefined") return "STUDENT";

  const rawSession = localStorage.getItem("eba_student_session");
  if (!rawSession) return "STUDENT";

  try {
    const parsed = JSON.parse(rawSession) as StudentSession;
    if (parsed.fullName?.trim()) {
      return parsed.fullName.trim().toUpperCase();
    }
    if (parsed.studentNumber) {
      return String(parsed.studentNumber).toUpperCase();
    }
    if (parsed.cvsuEmail) {
      return String(parsed.cvsuEmail).split("@")[0].toUpperCase();
    }
  } catch {
    return "STUDENT";
  }

  return "STUDENT";
};

export const StudentHeader = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(() => getDisplayNameFromSession());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const refreshDisplayName = () => setDisplayName(getDisplayNameFromSession());

    window.addEventListener("focus", refreshDisplayName);
    window.addEventListener("student-session-updated", refreshDisplayName);

    return () => {
      window.removeEventListener("focus", refreshDisplayName);
      window.removeEventListener("student-session-updated", refreshDisplayName);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("eba_student_session");
    router.push("/");
  };

  return (
    <header className="flex items-center justify-between gap-3 bg-[#F1F4F6] px-4 py-3 sm:px-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex min-w-44 items-center justify-between gap-3 rounded-none border border-[#0B525B] bg-[#F1F4F6] px-3 py-2 text-[#0B525B] transition-colors hover:bg-[#E3EBF2]"
          >
            <span className="inline-flex items-center gap-2 truncate font-serif text-base font-semibold">
              <CircleUserRoundIcon className="size-4 shrink-0" />
              <span className="truncate">{displayName}</span>
            </span>
            <ChevronDownIcon className="size-5 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-44 rounded-none border border-[#0B525B] bg-[#F1F4F6] p-1 text-[#0B525B]"
        >
          <DropdownMenuItem
            asChild
            className="font-serif text-sm focus:bg-[#D9E8F4] focus:text-[#0B525B]"
          >
            <Link href="/profile">Update Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleLogout}
            className="font-serif text-sm focus:bg-[#D9E8F4] focus:text-[#0B525B]"
          >
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center p-1 text-[#0B525B]"
            aria-label="Open menu"
          >
            <MenuIcon className="size-8" />
          </button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-[68%] border-l border-[#0B525B]/35 bg-linear-to-b from-[#BCD8EE] to-[#7FB0DE] px-4 pt-6 text-[#0B525B]"
          showCloseButton={false}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Student Menu</SheetTitle>
          </SheetHeader>
          <nav className="mt-8 flex flex-col gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === pathname;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-md px-4 py-3 text-[30px] ${
                    isActive ? "bg-[#A8CEE9] font-medium" : "hover:bg-[#A8CEE9]/70"
                  }`}
                >
                  <Icon className="size-7" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
};
