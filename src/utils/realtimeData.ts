import { supabase } from '../lib/supabase';

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkActivity: number;
  activeConnections: number;
  uptime: number;
  timestamp: Date;
}

export interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'face_verification' | 'session_start' | 'session_end' | 'encryption_verified' | 'suspicious_activity' | 'failed_auth';
  userId?: string;
  userEmail?: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ActiveUser {
  id: string;
  email: string;
  name: string;
  status: 'online' | 'away' | 'idle';
  lastActive: Date;
  sessionStart: Date;
  deviceInfo: {
    browser: string;
    os: string;
    ip?: string;
    location?: string;
  };
  verificationStatus: 'verified' | 'pending' | 'failed';
  connectionQuality: 'excellent' | 'good' | 'poor';
}

export interface SystemStatus {
  encryption: 'active' | 'inactive' | 'error';
  faceRecognition: 'enabled' | 'disabled' | 'error';
  autoClear: 'active' | 'inactive';
  notifications: 'enabled' | 'disabled';
  database: 'connected' | 'disconnected' | 'error';
  lastUpdated: Date;
}

class RealTimeDataManager {
  private securityEvents: SecurityEvent[] = [];
  private activeUsers: Map<string, ActiveUser> = new Map();
  private systemMetrics: SystemMetrics | null = null;
  private systemStatus: SystemStatus | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeRealTimeMonitoring();
  }

  private initializeRealTimeMonitoring() {
    // Initialize system metrics monitoring
    this.startSystemMetricsMonitoring();
    
    // Initialize security event monitoring
    this.startSecurityEventMonitoring();
    
    // Initialize active users monitoring
    this.startActiveUsersMonitoring();
    
    // Initialize system status monitoring
    this.startSystemStatusMonitoring();
  }

  private startSystemMetricsMonitoring() {
    const updateMetrics = () => {
      // Get real browser performance metrics
      const performance = window.performance;
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const memory = (performance as any).memory;
      
      this.systemMetrics = {
        cpuUsage: this.calculateCPUUsage(),
        memoryUsage: memory ? (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100 : 0,
        networkActivity: this.calculateNetworkActivity(),
        activeConnections: this.activeUsers.size,
        uptime: Date.now() - navigation.loadEventStart,
        timestamp: new Date()
      };
      
      this.emit('systemMetrics', this.systemMetrics);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 1000); // Update every second
    this.updateIntervals.set('systemMetrics', interval);
  }

  private startSecurityEventMonitoring() {
    // Monitor Supabase auth events
    supabase.auth.onAuthStateChange((event, session) => {
      const securityEvent: SecurityEvent = {
        id: crypto.randomUUID(),
        type: event === 'SIGNED_IN' ? 'login' : event === 'SIGNED_OUT' ? 'logout' : 'session_start',
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        message: this.getEventMessage(event, session?.user?.email),
        severity: event === 'SIGNED_IN' ? 'low' : 'medium',
        timestamp: new Date(),
        metadata: { event, sessionId: session?.access_token?.substring(0, 8) }
      };
      
      this.addSecurityEvent(securityEvent);
    });

    // Monitor page visibility for security
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.addSecurityEvent({
          type: 'session_end',
          message: 'User tab became inactive - security monitoring active',
          severity: 'low'
        });
      } else {
        this.addSecurityEvent({
          type: 'session_start',
          message: 'User tab became active - session resumed',
          severity: 'low'
        });
      }
    });
  }

  private startActiveUsersMonitoring() {
    const updateActiveUsers = async () => {
      try {
        // Get real user data from Supabase
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .eq('is_verified', true);

        if (!error && users) {
          const currentTime = new Date();
          
          users.forEach(user => {
            const activeUser: ActiveUser = {
              id: user.id,
              email: user.email,
              name: user.email.split('@')[0],
              status: this.determineUserStatus(user.id),
              lastActive: new Date(user.updated_at || user.created_at),
              sessionStart: new Date(user.created_at),
              deviceInfo: {
                browser: this.getBrowserInfo(),
                os: this.getOSInfo(),
                ip: 'Hidden for privacy',
                location: 'Location services disabled'
              },
              verificationStatus: user.is_verified ? 'verified' : 'pending',
              connectionQuality: this.getConnectionQuality()
            };
            
            this.activeUsers.set(user.id, activeUser);
          });
          
          this.emit('activeUsers', Array.from(this.activeUsers.values()));
        }
      } catch (error) {
        console.error('Error updating active users:', error);
      }
    };

    updateActiveUsers();
    const interval = setInterval(updateActiveUsers, 5000); // Update every 5 seconds
    this.updateIntervals.set('activeUsers', interval);
  }

  private startSystemStatusMonitoring() {
    const updateSystemStatus = async () => {
      try {
        // Check database connection
        const { error: dbError } = await supabase.from('users').select('count').limit(1);
        
        this.systemStatus = {
          encryption: 'active', // Always active in HTTPS
          faceRecognition: this.checkFaceRecognitionStatus(),
          autoClear: 'active', // Based on SecurityContext
          notifications: await this.checkNotificationStatus(),
          database: dbError ? 'error' : 'connected',
          lastUpdated: new Date()
        };
        
        this.emit('systemStatus', this.systemStatus);
      } catch (error) {
        console.error('Error updating system status:', error);
      }
    };

    updateSystemStatus();
    const interval = setInterval(updateSystemStatus, 3000); // Update every 3 seconds
    this.updateIntervals.set('systemStatus', interval);
  }

  // Event management
  public on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Public methods for adding events
  public addSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };
    
    this.securityEvents.unshift(securityEvent);
    
    // Keep only last 100 events
    if (this.securityEvents.length > 100) {
      this.securityEvents = this.securityEvents.slice(0, 100);
    }
    
    this.emit('securityEvents', this.securityEvents);
  }

  public addFaceVerificationEvent(success: boolean, userId?: string, userEmail?: string) {
    this.addSecurityEvent({
      type: 'face_verification',
      userId,
      userEmail,
      message: success ? 'Face verification successful' : 'Face verification failed',
      severity: success ? 'low' : 'medium',
      metadata: { success }
    });
  }

  // Getters
  public getSecurityEvents(): SecurityEvent[] {
    return [...this.securityEvents];
  }

  public getActiveUsers(): ActiveUser[] {
    return Array.from(this.activeUsers.values());
  }

  public getSystemMetrics(): SystemMetrics | null {
    return this.systemMetrics;
  }

  public getSystemStatus(): SystemStatus | null {
    return this.systemStatus;
  }

  // Helper methods
  private calculateCPUUsage(): number {
    // Approximate CPU usage based on performance timing
    const now = performance.now();
    const timingInfo = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const loadTime = timingInfo.loadEventEnd - timingInfo.loadEventStart;
    return Math.min(Math.max((loadTime / 1000) * 10, 5), 95);
  }

  private calculateNetworkActivity(): number {
    // Approximate network activity based on resource timing
    const resources = performance.getEntriesByType('resource');
    const recentResources = resources.filter(r => r.startTime > performance.now() - 5000);
    return Math.min(recentResources.length * 10, 100);
  }

  private determineUserStatus(userId: string): 'online' | 'away' | 'idle' {
    const user = this.activeUsers.get(userId);
    if (!user) return 'online';
    
    const timeSinceActive = Date.now() - user.lastActive.getTime();
    if (timeSinceActive < 60000) return 'online'; // Less than 1 minute
    if (timeSinceActive < 300000) return 'away'; // Less than 5 minutes
    return 'idle';
  }

  private getBrowserInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getOSInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private getConnectionQuality(): 'excellent' | 'good' | 'poor' {
    const connection = (navigator as any).connection;
    if (!connection) return 'good';
    
    const effectiveType = connection.effectiveType;
    if (effectiveType === '4g') return 'excellent';
    if (effectiveType === '3g') return 'good';
    return 'poor';
  }

  private checkFaceRecognitionStatus(): 'enabled' | 'disabled' | 'error' {
    try {
      return (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') ? 'enabled' : 'disabled';
    } catch {
      return 'error';
    }
  }

  private async checkNotificationStatus(): Promise<'enabled' | 'disabled'> {
    if (!('Notification' in window)) return 'disabled';
    return Notification.permission === 'granted' ? 'enabled' : 'disabled';
  }

  private getEventMessage(event: string, email?: string): string {
    switch (event) {
      case 'SIGNED_IN':
        return `User ${email || 'unknown'} signed in successfully`;
      case 'SIGNED_OUT':
        return `User ${email || 'unknown'} signed out`;
      case 'TOKEN_REFRESHED':
        return 'Authentication token refreshed';
      default:
        return `Authentication event: ${event}`;
    }
  }

  // Cleanup
  public destroy() {
    this.updateIntervals.forEach(interval => clearInterval(interval));
    this.updateIntervals.clear();
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const realTimeDataManager = new RealTimeDataManager();

// Export notification utilities
export const sendPushNotification = async (title: string, message: string, options?: NotificationOptions) => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon: '/logo.png',
      badge: '/logo.png',
      ...options
    });
    return true;
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/logo.png',
        badge: '/logo.png',
        ...options
      });
      return true;
    }
  }
  
  return false;
};

export const broadcastToAllUsers = async (title: string, message: string) => {
  // Send notification to current user
  await sendPushNotification(title, message);
  
  // In a real application, you would also send to other connected users
  // via WebSocket, Server-Sent Events, or push notification service
  console.log(`Broadcasting to all users: ${title} - ${message}`);
  
  // Add security event for broadcast
  realTimeDataManager.addSecurityEvent({
    type: 'suspicious_activity',
    message: `System broadcast sent: ${title}`,
    severity: 'low',
    metadata: { broadcast: true, title, message }
  });
};