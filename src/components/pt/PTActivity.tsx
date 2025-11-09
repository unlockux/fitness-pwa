import React, { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  PanInfo,
} from "motion/react";
import {
  AlertCircle,
  TrendingDown,
  Check,
  CheckCheck,
} from "lucide-react";
import { Button } from "../ui/button";
import { projectId } from "../../utils/supabase/info";

interface PTActivityProps {
  token: string;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  clientId?: string;
  clientName?: string;
}

export function PTActivity({ token }: PTActivityProps) {
  const [notifications, setNotifications] = useState<
    Notification[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/notifications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/notifications/${notificationId}/read`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, isRead: true }
              : n,
          ),
        );
      }
    } catch (error) {
      console.error(
        "Error marking notification as read:",
        error,
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/notifications/read-all`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true })),
        );
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const unreadCount = notifications.filter(
    (n) => !n.isRead,
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-6 py-8 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-primary-foreground mb-1">
              Activity
            </h1>
            <p className="text-sm text-primary-foreground/80">
              {unreadCount > 0
                ? `${unreadCount} unread`
                : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-primary-foreground hover:bg-white/10"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      <div className="px-6 py-6">
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-2xl p-8 border border-border text-center"
          >
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2">No Notifications</h3>
            <p className="text-sm text-muted-foreground">
              You're all caught up! Check back later for
              updates.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification, index) => (
              <SwipeableNotification
                key={notification.id}
                notification={notification}
                index={index}
                onMarkAsRead={markAsRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SwipeableNotificationProps {
  notification: Notification;
  index: number;
  onMarkAsRead: (id: string) => void;
}

function SwipeableNotification({
  notification,
  index,
  onMarkAsRead,
}: SwipeableNotificationProps) {
  const [isPendingRead, setIsPendingRead] = React.useState(false);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0], [0, 1]);
  const scale = useTransform(x, [-100, 0], [0.8, 1]);

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.x < -100) {
      // Trigger spring back animation
      setIsPendingRead(true);
    }
  };

  const handleAnimationComplete = () => {
    if (isPendingRead) {
      onMarkAsRead(notification.id);
      setIsPendingRead(false);
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case "streak_broken":
        return (
          <TrendingDown className="w-5 h-5 text-destructive" />
        );
      case "goal_behind":
        return <AlertCircle className="w-5 h-5 text-warning" />;
      default:
        return <AlertCircle className="w-5 h-5 text-accent" />;
    }
  };

  return (
    <div className="relative">
      {/* Background action indicator */}
      <motion.div
        style={{ opacity, scale }}
        className="absolute right-0 top-0 bottom-0 flex items-center justify-end pr-6 bg-success rounded-xl"
      >
        <Check className="w-5 h-5 text-white" />
      </motion.div>

      {/* Notification card */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={isPendingRead ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
        transition={isPendingRead ? { type: 'spring', stiffness: 300, damping: 25 } : { delay: index * 0.05 }}
        drag="x"
        dragConstraints={{ left: -150, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        onAnimationComplete={handleAnimationComplete}
        style={{ x }}
        className={`relative bg-card rounded-xl p-4 border cursor-grab active:cursor-grabbing ${
          notification.isRead
            ? "border-border opacity-60"
            : "border-warning/20 border-l-4"
        }`}
      >
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm">{notification.message}</p>
            {notification.clientName && (
              <p className="text-xs text-muted-foreground mt-1">
                {notification.clientName}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(
                notification.timestamp,
              ).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
          {!notification.isRead && (
            <button
              onClick={() => onMarkAsRead(notification.id)}
              className="flex-shrink-0 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
            >
              <Check className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}