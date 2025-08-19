import { realTimeDataManager } from './realtimeData';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: string;
  userEmail?: string;
  subscriptionTime: number;
  lastUsed: number;
  active: boolean;
}

interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  delivered: boolean;
  clicked: boolean;
  dismissed: boolean;
  userId?: string;
  userEmail?: string;
  type: 'security' | 'system' | 'user' | 'broadcast';
}

class PushNotificationManager {
  private subscriptions: Map<string, PushSubscription> = new Map();
  private notificationHistory: NotificationHistory[] = [];
  private isSupported: boolean = false;
  private permission: NotificationPermission = 'default';
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private vapidPublicKey: string = 'BEl62iUYgUivxIkv69yViEuiBIa40HI2YJuLfemaqxuaJ9WJbSRjVu7tqzJyHXFBP7H6Yx3aKt8ys1PLiEkzRHE'; // Demo VAPID key

  constructor() {
    this.checkSupport();
    this.loadStoredData();
    this.initializeServiceWorker();
    this.setupEventListeners();
  }

  private checkSupport(): void {
    this.isSupported = (
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
    
    if (this.isSupported) {
      this.permission = Notification.permission;
    }
  }

  private async initializeServiceWorker(): Promise<void> {
    if (!this.isSupported) return;

    try {
      // Register service worker for push notifications
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully:', this.serviceWorkerRegistration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      const existingSubscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      if (existingSubscription) {
        this.handleExistingSubscription(existingSubscription);
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  private handleExistingSubscription(subscription: globalThis.PushSubscription): void {
    const subscriptionData: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
      },
      subscriptionTime: Date.now(),
      lastUsed: Date.now(),
      active: true
    };

    this.subscriptions.set(subscription.endpoint, subscriptionData);
    this.saveStoredData();
  }

  private setupEventListeners(): void {
    if (!this.isSupported) return;

    // Listen for permission changes
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' }).then(permissionStatus => {
        permissionStatus.addEventListener('change', () => {
          this.permission = Notification.permission;
          this.handlePermissionChange();
        });
      });
    }

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });
    }

    // Listen for visibility changes to update notification status
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.markNotificationsAsRead();
      }
    });
  }

  private handlePermissionChange(): void {
    realTimeDataManager.addSecurityEvent({
      type: 'suspicious_activity',
      severity: 'low',
      message: `Notification permission changed to: ${this.permission}`,
      metadata: { permission: this.permission }
    });
  }

  private handleServiceWorkerMessage(data: any): void {
    if (data.type === 'notification-click') {
      this.handleNotificationClick(data.notificationId, data.action);
    } else if (data.type === 'notification-close') {
      this.handleNotificationDismiss(data.notificationId);
    }
  }

  private handleNotificationClick(notificationId: string, action?: string): void {
    const notification = this.notificationHistory.find(n => n.id === notificationId);
    if (notification) {
      notification.clicked = true;
      this.saveStoredData();

      realTimeDataManager.addSecurityEvent({
        type: 'suspicious_activity',
        severity: 'low',
        message: `Notification clicked: ${notification.title}`,
        metadata: { notificationId, action }
      });
    }
  }

  private handleNotificationDismiss(notificationId: string): void {
    const notification = this.notificationHistory.find(n => n.id === notificationId);
    if (notification) {
      notification.dismissed = true;
      this.saveStoredData();
    }
  }

  private markNotificationsAsRead(): void {
    // Mark recent notifications as read when user returns to the app
    const recentNotifications = this.notificationHistory.filter(
      n => Date.now() - n.timestamp < 300000 && !n.clicked // Last 5 minutes
    );

    recentNotifications.forEach(notification => {
      notification.clicked = true;
    });

    if (recentNotifications.length > 0) {
      this.saveStoredData();
    }
  }

  private loadStoredData(): void {
    try {
      const storedSubscriptions = localStorage.getItem('push_subscriptions');
      if (storedSubscriptions) {
        const subscriptionsData = JSON.parse(storedSubscriptions);
        this.subscriptions = new Map(subscriptionsData);
      }

      const storedHistory = localStorage.getItem('notification_history');
      if (storedHistory) {
        this.notificationHistory = JSON.parse(storedHistory);
      }
    } catch (error) {
      console.error('Error loading stored notification data:', error);
    }
  }

  private saveStoredData(): void {
    try {
      localStorage.setItem('push_subscriptions', JSON.stringify(Array.from(this.subscriptions.entries())));
      localStorage.setItem('notification_history', JSON.stringify(this.notificationHistory));
    } catch (error) {
      console.error('Error saving notification data:', error);
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported in this browser');
    }

    if (this.permission === 'granted') {
      return this.permission;
    }

    try {
      this.permission = await Notification.requestPermission();
      
      realTimeDataManager.addSecurityEvent({
        type: 'suspicious_activity',
        severity: 'low',
        message: `Notification permission requested: ${this.permission}`,
        metadata: { permission: this.permission }
      });

      return this.permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  }

  public async subscribe(userId?: string, userEmail?: string): Promise<PushSubscription | null> {
    if (!this.isSupported || this.permission !== 'granted' || !this.serviceWorkerRegistration) {
      return null;
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.base64ToArrayBuffer(this.vapidPublicKey)
      });

      const subscriptionData: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
        },
        userId,
        userEmail,
        subscriptionTime: Date.now(),
        lastUsed: Date.now(),
        active: true
      };

      this.subscriptions.set(subscription.endpoint, subscriptionData);
      this.saveStoredData();

      realTimeDataManager.addSecurityEvent({
        type: 'suspicious_activity',
        severity: 'low',
        message: 'User subscribed to push notifications',
        userEmail,
        metadata: { userId, endpoint: subscription.endpoint }
      });

      return subscriptionData;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  }

  public async unsubscribe(): Promise<boolean> {
    if (!this.serviceWorkerRegistration) {
      return false;
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      if (subscription) {
        const success = await subscription.unsubscribe();
        if (success) {
          this.subscriptions.delete(subscription.endpoint);
          this.saveStoredData();

          realTimeDataManager.addSecurityEvent({
            type: 'suspicious_activity',
            severity: 'low',
            message: 'User unsubscribed from push notifications',
            metadata: { endpoint: subscription.endpoint }
          });
        }
        return success;
      }
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  public async sendNotification(payload: NotificationPayload, targetUsers?: string[]): Promise<boolean> {
    if (!this.isSupported || this.permission !== 'granted') {
      return false;
    }

    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    // Create notification history entry
    const historyEntry: NotificationHistory = {
      id: notificationId,
      title: payload.title,
      body: payload.body,
      timestamp,
      delivered: false,
      clicked: false,
      dismissed: false,
      type: payload.data?.type || 'system'
    };

    try {
      // Show local notification
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/favicon.ico',
        badge: payload.badge || '/favicon.ico',
        tag: payload.tag || notificationId,
        data: { ...payload.data, notificationId },
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false
      });

      // Handle notification events
      notification.onclick = () => {
        this.handleNotificationClick(notificationId);
        notification.close();
        window.focus();
      };

      notification.onclose = () => {
        this.handleNotificationDismiss(notificationId);
      };

      notification.onerror = (error) => {
        console.error('Notification error:', error);
      };

      historyEntry.delivered = true;
      this.notificationHistory.unshift(historyEntry);
      
      // Keep only last 100 notifications
      if (this.notificationHistory.length > 100) {
        this.notificationHistory = this.notificationHistory.slice(0, 100);
      }
      
      this.saveStoredData();

      // Log security event
      realTimeDataManager.addSecurityEvent({
        type: 'suspicious_activity',
        severity: 'low',
        message: `Notification sent: ${payload.title}`,
        metadata: { 
          notificationId, 
          type: payload.data?.type,
          targetUsers: targetUsers?.length || 'all'
        }
      });

      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  public async sendSecurityAlert(title: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<boolean> {
    const icons = {
      low: '🔵',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };

    return this.sendNotification({
      title: `${icons[severity]} Security Alert: ${title}`,
      body: message,
      icon: '/security-icon.png',
      tag: 'security-alert',
      requireInteraction: severity === 'critical' || severity === 'high',
      data: {
        type: 'security',
        severity,
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    });
  }

  public async sendSystemNotification(title: string, message: string): Promise<boolean> {
    return this.sendNotification({
      title: `🔧 System: ${title}`,
      body: message,
      icon: '/system-icon.png',
      tag: 'system-notification',
      data: {
        type: 'system',
        timestamp: Date.now()
      }
    });
  }

  public async sendUserNotification(title: string, message: string, userId?: string, userEmail?: string): Promise<boolean> {
    return this.sendNotification({
      title: `👤 ${title}`,
      body: message,
      icon: '/user-icon.png',
      tag: 'user-notification',
      data: {
        type: 'user',
        userId,
        userEmail,
        timestamp: Date.now()
      }
    }, userId ? [userId] : undefined);
  }

  public async broadcastToAllUsers(title: string, message: string): Promise<boolean> {
    return this.sendNotification({
      title: `📢 Broadcast: ${title}`,
      body: message,
      icon: '/broadcast-icon.png',
      tag: 'broadcast',
      requireInteraction: true,
      data: {
        type: 'broadcast',
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'acknowledge',
          title: 'Acknowledge'
        }
      ]
    });
  }

  public async testNotification(): Promise<boolean> {
    return this.sendNotification({
      title: '🧪 Test Notification',
      body: 'This is a test notification to verify the push notification system is working correctly.',
      icon: '/test-icon.png',
      tag: 'test-notification',
      data: {
        type: 'system',
        test: true,
        timestamp: Date.now()
      }
    });
  }

  // Getters
  public getPermission(): NotificationPermission {
    return this.permission;
  }

  public isNotificationSupported(): boolean {
    return this.isSupported;
  }

  public getSubscriptions(): PushSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  public getNotificationHistory(): NotificationHistory[] {
    return [...this.notificationHistory];
  }

  public getActiveSubscriptionsCount(): number {
    return Array.from(this.subscriptions.values()).filter(sub => sub.active).length;
  }

  public getNotificationStats(): {
    total: number;
    delivered: number;
    clicked: number;
    dismissed: number;
    clickRate: number;
  } {
    const total = this.notificationHistory.length;
    const delivered = this.notificationHistory.filter(n => n.delivered).length;
    const clicked = this.notificationHistory.filter(n => n.clicked).length;
    const dismissed = this.notificationHistory.filter(n => n.dismissed).length;
    const clickRate = delivered > 0 ? (clicked / delivered) * 100 : 0;

    return {
      total,
      delivered,
      clicked,
      dismissed,
      clickRate: Math.round(clickRate * 100) / 100
    };
  }

  public clearNotificationHistory(): void {
    this.notificationHistory = [];
    this.saveStoredData();
  }

  public removeOldNotifications(olderThanDays: number = 7): void {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    this.notificationHistory = this.notificationHistory.filter(
      notification => notification.timestamp > cutoffTime
    );
    this.saveStoredData();
  }
}

// Create and export singleton instance
export const pushNotificationManager = new PushNotificationManager();

// Export types
export type {
  NotificationPayload,
  NotificationAction,
  PushSubscription,
  NotificationHistory
};

// Convenience functions
export const requestNotificationPermission = () => pushNotificationManager.requestPermission();
export const subscribeToNotifications = (userId?: string, userEmail?: string) => 
  pushNotificationManager.subscribe(userId, userEmail);
export const unsubscribeFromNotifications = () => pushNotificationManager.unsubscribe();
export const sendPushNotification = (payload: NotificationPayload, targetUsers?: string[]) => 
  pushNotificationManager.sendNotification(payload, targetUsers);
export const sendSecurityAlert = (title: string, message: string, severity?: 'low' | 'medium' | 'high' | 'critical') => 
  pushNotificationManager.sendSecurityAlert(title, message, severity);
export const sendSystemNotification = (title: string, message: string) => 
  pushNotificationManager.sendSystemNotification(title, message);
export const sendUserNotification = (title: string, message: string, userId?: string, userEmail?: string) => 
  pushNotificationManager.sendUserNotification(title, message, userId, userEmail);
export const broadcastToAllUsers = (title: string, message: string) => 
  pushNotificationManager.broadcastToAllUsers(title, message);
export const testNotification = () => pushNotificationManager.testNotification();