/**
 * Priority Queue implementation
 * Used by the Master Control Program for task scheduling
 */
export class PriorityQueue<T> {
  private items: T[];
  private comparator: (a: T, b: T) => number;

  /**
   * Constructor
   * @param comparator Function to compare items (a, b) => number
   *                   If result < 0, a has higher priority than b
   *                   If result = 0, a and b have equal priority
   *                   If result > 0, b has higher priority than a
   */
  constructor(comparator: (a: T, b: T) => number) {
    this.items = [];
    this.comparator = comparator;
  }

  /**
   * Add an item to the queue with proper priority
   * @param item Item to add
   */
  enqueue(item: T): void {
    // Add item to the end
    this.items.push(item);
    
    // Sort based on comparator
    this.items.sort(this.comparator);
  }

  /**
   * Remove and return the highest priority item
   * @returns Highest priority item or undefined if queue is empty
   */
  dequeue(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    
    return this.items.shift();
  }

  /**
   * View the highest priority item without removing it
   * @returns Highest priority item or undefined if queue is empty
   */
  peek(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    
    return this.items[0];
  }

  /**
   * Check if the queue is empty
   * @returns True if queue is empty
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Get the number of items in the queue
   * @returns Number of items
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Clear all items from the queue
   */
  clear(): void {
    this.items = [];
  }
  
  /**
   * Get all items in the queue (without removing them)
   * Returns a copy of the internal array to prevent external modification
   * @returns Array of all items
   */
  getAll(): T[] {
    return [...this.items];
  }
  
  /**
   * Convert the queue to an array and clear it
   * @returns Array of all items in priority order
   */
  toArray(): T[] {
    const array = [...this.items];
    this.clear();
    return array;
  }
}