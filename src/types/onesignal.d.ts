export interface OneSignalPushSubscriptionChangeEvent {
  previous?: {
    optedIn?: boolean;
  };
  current?: {
    optedIn?: boolean;
  };
}

export interface OneSignalPushSubscription {
  optedIn?: boolean;
  optIn: () => Promise<void>;
  optOut: () => Promise<void>;
  addEventListener?: (
    event: 'change',
    listener: (change: OneSignalPushSubscriptionChangeEvent) => void
  ) => void;
  removeEventListener?: (
    event: 'change',
    listener: (change: OneSignalPushSubscriptionChangeEvent) => void
  ) => void;
}

export interface OneSignalInstance {
  init: (options: Record<string, unknown>) => Promise<void>;
  Notifications: {
    permission: boolean;
    requestPermission: () => Promise<void>;
  };
  User: {
    PushSubscription: OneSignalPushSubscription;
  };
}

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalInstance) => void | Promise<void>>;
  }
}
