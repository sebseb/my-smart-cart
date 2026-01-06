import { useEffect, useRef, useCallback } from 'react';
import { wsClient } from '@/lib/websocket';
import { toast } from 'sonner';

interface ItemNotification {
  listId: string;
  listName: string;
  itemName: string;
  timestamp: string;
}

interface GroupedNotifications {
  [listId: string]: {
    listName: string;
    items: string[];
  };
}

const NOTIFICATION_INTERVAL = 60000; // 1 minute in milliseconds

export function useItemNotifications() {
  const pendingNotifications = useRef<ItemNotification[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showGroupedNotifications = useCallback(() => {
    if (pendingNotifications.current.length === 0) return;

    // Group notifications by list
    const grouped: GroupedNotifications = {};
    pendingNotifications.current.forEach((notification) => {
      if (!grouped[notification.listId]) {
        grouped[notification.listId] = {
          listName: notification.listName,
          items: [],
        };
      }
      grouped[notification.listId].items.push(notification.itemName);
    });

    // Show toast for each list
    Object.entries(grouped).forEach(([listId, { listName, items }]) => {
      const uniqueItems = [...new Set(items)];
      const itemCount = uniqueItems.length;
      
      if (itemCount === 1) {
        toast.info(`New item added to "${listName}"`, {
          description: uniqueItems[0],
          duration: 5000,
        });
      } else if (itemCount <= 3) {
        toast.info(`${itemCount} items added to "${listName}"`, {
          description: uniqueItems.join(', '),
          duration: 5000,
        });
      } else {
        toast.info(`${itemCount} items added to "${listName}"`, {
          description: `${uniqueItems.slice(0, 2).join(', ')} and ${itemCount - 2} more`,
          duration: 5000,
        });
      }
    });

    // Clear pending notifications
    pendingNotifications.current = [];
  }, []);

  const scheduleNotification = useCallback(() => {
    // If no timer is running, start one
    if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        showGroupedNotifications();
        timerRef.current = null;
      }, NOTIFICATION_INTERVAL);
    }
  }, [showGroupedNotifications]);

  useEffect(() => {
    // Connect to WebSocket if not already connected
    wsClient.connect();

    // Subscribe to the main room for notifications
    wsClient.subscribe('main');

    // Listen for item_added events
    const unsubscribe = wsClient.on('item_added', (data: ItemNotification) => {
      pendingNotifications.current.push(data);
      scheduleNotification();
    });

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        // Show any pending notifications before unmounting
        showGroupedNotifications();
      }
    };
  }, [scheduleNotification, showGroupedNotifications]);

  // Function to broadcast when current user adds an item
  const notifyItemAdded = useCallback((listId: string, listName: string, itemName: string) => {
    wsClient.send('item_added', {
      room: 'main',
      listId,
      listName,
      itemName,
    });
  }, []);

  return { notifyItemAdded };
}
