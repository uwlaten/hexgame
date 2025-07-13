/**
 * @fileoverview Defines a simple EventEmitter class for handling custom events.
 * This allows for creating a decoupled event-driven architecture.
 */

/**
 * A simple implementation of the EventEmitter (or pub/sub) pattern.
 * It allows objects to subscribe to named events and broadcast those events
 * to all subscribers.
 */
export default class EventEmitter {
  /**
   * Creates an instance of EventEmitter.
   */
  constructor() {
    /**
     * A map to store event listeners.
     * The keys are event names (strings), and the values are arrays of listener functions.
     * @private
     * @type {Object.<string, Function[]>}
     */
    this.listeners = {};
  }

  /**
   * Registers a listener function for a given event.
   * @param {string} eventName The name of the event to listen for.
   * @param {Function} listener The function to be called when the event is emitted.
   */
  on(eventName, listener) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(listener);
  }

  /**
   * Emits an event, calling all registered listeners for that event.
   * @param {string} eventName The name of the event to emit.
   * @param  {...any} args Arguments to pass to the listener functions.
   */
  emit(eventName, ...args) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach(listener => {
        listener(...args);
      });
    }
  }
}