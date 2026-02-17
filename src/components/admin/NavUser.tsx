"use client";

import {
  IconDotsVertical,
  IconLogout,
  IconNotification,
} from "@tabler/icons-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from '@/hooks/use-admin-auth';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [accessKey] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("eba_access_key");
  });

  const notificationsQuery = useQuery({
    ...orpc.notifications.list.queryOptions({
      input: {
        accessKey: accessKey || "",
      },
    }),
    enabled: Boolean(accessKey),
  });

  const markReadMutation = useMutation(
    orpc.notifications.markRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.notifications.list.queryKey({
            input: {
              accessKey: accessKey || "",
            },
          }),
        });
      },
    }),
  );

  const markAllReadMutation = useMutation(
    orpc.notifications.markAllRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.notifications.list.queryKey({
            input: {
              accessKey: accessKey || "",
            },
          }),
        });
      },
    }),
  );

  const notifications = notificationsQuery.data?.notifications || [];
  const unreadCount = notificationsQuery.data?.unreadCount || 0;
  const canMarkAllRead = useMemo(
    () => unreadCount > 0 && Boolean(accessKey),
    [unreadCount, accessKey],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className='flex items-center hover:bg-muted hover:text-black text-white cursor-pointer gap-3 p-3'>
          <Avatar className="size-10">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="rounded-full text-black bg-[#25E42C]">
              AU
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium font-serif">{user.name}</span>
            <span className="truncate text-xs">
              {user.email}
            </span>
          </div>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
          <IconDotsVertical className="ml-auto size-4" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) bg-[#07484A] min-w-80 rounded-lg"
        side={isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={10}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center text-white gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="size-10">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-full text-black bg-[#25E42C]">AU</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium font-serif">{user.name}</span>
              <span className="truncate text-xs">
                {user.email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <div className="px-2 py-1">
            <div className="flex items-center justify-between text-white mb-2">
              <div className="flex items-center gap-2 text-sm">
                <IconNotification className="size-4" />
                <span>Notifications</span>
              </div>
              <button
                type="button"
                disabled={!canMarkAllRead || markAllReadMutation.isPending}
                onClick={() => {
                  if (!accessKey || !canMarkAllRead) return;
                  markAllReadMutation.mutate({ accessKey });
                }}
                className={cn(
                  "text-xs underline underline-offset-2",
                  (!canMarkAllRead || markAllReadMutation.isPending) &&
                    "opacity-40 cursor-not-allowed",
                )}
              >
                Mark all read
              </button>
            </div>

            <div className="space-y-1 max-h-56 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => {
                      if (notification.isRead || markReadMutation.isPending) return;
                      markReadMutation.mutate({ id: notification.id });
                    }}
                    className={cn(
                      "w-full text-left rounded-md px-2 py-2 transition-colors",
                      notification.isRead
                        ? "bg-[#0D5A5C]/40 text-white/70"
                        : "bg-[#0D5A5C] text-white hover:bg-[#126D70]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold">{notification.title}</p>
                      {!notification.isRead && (
                        <span className="mt-1 size-2 rounded-full bg-[#25E42C]" />
                      )}
                    </div>
                    <p className="text-[11px] leading-snug opacity-90 mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-[10px] opacity-60 mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </button>
                ))
              ) : (
                <div className="rounded-md px-2 py-3 bg-[#0D5A5C]/40 text-white/70 text-xs text-center">
                  No notifications
                </div>
              )}
            </div>
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className='text-white group hover:bg-[#25E42C]!'>
          <IconLogout className='text-white group-hover:text-black' />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
