/**
 * Simple Reactive State Store using Proxy API
 */

const initialState = {
  auth: {
    isAuthenticated: false,
    token: null,
  },
  hobbies: {
    items: [],
    loading: false,
    error: null,
  },
  images: {
    items: [],
    loading: false,
    error: null,
  },
  ui: {
    activeToast: null,
    confirmDialog: null,
    mobileMenuOpen: false,
  },
};

class Store {
  constructor() {
    this._state = { ...initialState };
    this._subscribers = new Map();
    this._globalSubscribers = new Set();
  }

  /**
   * Get the current state (or a slice of it)
   */
  getState(key) {
    if (key) {
      return this._state[key];
    }
    return { ...this._state };
  }

  /**
   * Update the state
   */
  setState(updates) {
    const changedKeys = [];

    for (const [key, value] of Object.entries(updates)) {
      if (this._state[key] !== value) {
        this._state[key] = value;
        changedKeys.push(key);
      }
    }

    // Notify subscribers
    for (const key of changedKeys) {
      this._notifySubscribers(key);
    }

    if (changedKeys.length > 0) {
      this._notifyGlobalSubscribers();
    }
  }

  /**
   * Update a nested state slice
   */
  updateSlice(key, updates) {
    const current = this._state[key] || {};
    this._state[key] = { ...current, ...updates };
    this._notifySubscribers(key);
    this._notifyGlobalSubscribers();
  }

  /**
   * Subscribe to changes on a specific state key
   */
  subscribe(key, callback) {
    if (!this._subscribers.has(key)) {
      this._subscribers.set(key, new Set());
    }
    this._subscribers.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      this._subscribers.get(key).delete(callback);
    };
  }

  /**
   * Subscribe to all state changes
   */
  subscribeAll(callback) {
    this._globalSubscribers.add(callback);
    return () => {
      this._globalSubscribers.delete(callback);
    };
  }

  /**
   * Notify subscribers of a specific key
   */
  _notifySubscribers(key) {
    const subscribers = this._subscribers.get(key);
    if (subscribers) {
      const value = this._state[key];
      subscribers.forEach(callback => {
        try {
          callback(value, key);
        } catch (error) {
          console.error(`Error in subscriber for "${key}":`, error);
        }
      });
    }
  }

  /**
   * Notify global subscribers
   */
  _notifyGlobalSubscribers() {
    this._globalSubscribers.forEach(callback => {
      try {
        callback(this._state);
      } catch (error) {
        console.error('Error in global subscriber:', error);
      }
    });
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this._state = { ...initialState };
    this._notifyGlobalSubscribers();
  }
}

// Export singleton instance
export const store = new Store();
