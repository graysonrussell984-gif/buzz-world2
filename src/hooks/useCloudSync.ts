import { useEffect, useState } from 'react';

export type SyncStatus = 'connected' | 'connecting' | 'disconnected';

export interface SyncEventPayload {
  type: string;
  room?: string;
  messages?: any[];
  memories?: any[];
  intelligence?: any;
  voiceConversations?: any[];
  tasks?: Record<string, string[]>;
  projects?: any[];
  gallery?: string[];
  clientsCount?: number;
  timestamp?: number;
  [key: string]: any;
}

type SyncListener = (event: SyncEventPayload) => void;

class CloudSyncManager {
  private eventSource: EventSource | null = null;
  private listeners: Set<SyncListener> = new Set();
  private status: SyncStatus = 'connecting';
  private statusListeners: Set<(status: SyncStatus) => void> = new Set();
  private connectedDevices = 1;
  private deviceListeners: Set<(count: number) => void> = new Set();
  private reconnectTimer: any = null;
  private reconnectDelay = 2000;
  private isConnecting = false;

  constructor() {
    this.connect();
  }

  public connect() {
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      return;
    }
    if (this.isConnecting) return;
    this.isConnecting = true;
    this.updateStatus('connecting');

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource('/api/sync/events');

      this.eventSource.onopen = () => {
        this.isConnecting = false;
        this.reconnectDelay = 2000;
        this.updateStatus('connected');
        console.log('[Cloud Sync] ⚡ Live cross-device sync connected to cloud hub.');
      };

      this.eventSource.onmessage = (event) => {
        try {
          if (!event.data || event.data.trim() === ': heartbeat') return;
          const data: SyncEventPayload = JSON.parse(event.data);

          if (data.type === 'CONNECTED' && typeof data.clientsCount === 'number') {
            this.connectedDevices = data.clientsCount;
            this.deviceListeners.forEach((fn) => fn(this.connectedDevices));
          }

          // Dispatch to internal subscribers
          this.listeners.forEach((listener) => {
            try {
              listener(data);
            } catch (err) {
              console.warn('[Cloud Sync] Listener error:', err);
            }
          });

          // Dispatch as standard browser event for non-hook listeners
          window.dispatchEvent(
            new CustomEvent('cloud_sync_event', { detail: data })
          );
        } catch (err) {
          console.warn('[Cloud Sync] Parse error:', err);
        }
      };

      this.eventSource.onerror = () => {
        this.isConnecting = false;
        this.updateStatus('disconnected');
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }

        // Auto-reconnect with backoff
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 15000);
          this.connect();
        }, this.reconnectDelay);
      };
    } catch (err) {
      this.isConnecting = false;
      this.updateStatus('disconnected');
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    }
  }

  private updateStatus(status: SyncStatus) {
    this.status = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  public getConnectedDevices(): number {
    return this.connectedDevices;
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public onDeviceChange(listener: (count: number) => void): () => void {
    this.deviceListeners.add(listener);
    listener(this.connectedDevices);
    return () => {
      this.deviceListeners.delete(listener);
    };
  }
}

// Singleton manager instance across the application
const syncManager = new CloudSyncManager();

export function useCloudSync(onEvent?: SyncListener) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncManager.getStatus());
  const [connectedDevices, setConnectedDevices] = useState<number>(syncManager.getConnectedDevices());

  useEffect(() => {
    const unsubStatus = syncManager.onStatusChange(setSyncStatus);
    const unsubDevices = syncManager.onDeviceChange(setConnectedDevices);

    let unsubEvents: (() => void) | undefined;
    if (onEvent) {
      unsubEvents = syncManager.subscribe(onEvent);
    }

    return () => {
      unsubStatus();
      unsubDevices();
      if (unsubEvents) unsubEvents();
    };
  }, [onEvent]);

  return {
    syncStatus,
    connectedDevices,
    reconnect: () => syncManager.connect(),
  };
}

export { syncManager };
