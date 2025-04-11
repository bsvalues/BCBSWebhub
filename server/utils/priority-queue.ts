/**
 * Priority Queue
 * 
 * A queue implementation that prioritizes items based on their priority value.
 * Higher priority items are dequeued before lower priority items.
 */
export class PriorityQueue<T> {
  private items: Map<T, number> = new Map();
  private priorityGroups: Map<number, T[]> = new Map();
  private priorities: number[] = [];
  
  /**
   * Get the number of items in the queue
   */
  public get size(): number {
    return this.items.size;
  }
  
  /**
   * Check if the queue is empty
   */
  public isEmpty(): boolean {
    return this.size === 0;
  }
  
  /**
   * Add an item to the queue with a priority
   * 
   * @param item The item to add
   * @param priority The priority of the item (higher values = higher priority)
   */
  public enqueue(item: T, priority: number): void {
    // Store the item with its priority
    this.items.set(item, priority);
    
    // Add to priority group
    if (!this.priorityGroups.has(priority)) {
      this.priorityGroups.set(priority, []);
      this.priorities.push(priority);
      this.priorities.sort((a, b) => b - a); // Sort in descending order
    }
    
    const group = this.priorityGroups.get(priority)!;
    group.push(item);
  }
  
  /**
   * Remove and return the highest priority item
   * 
   * @returns The highest priority item or undefined if the queue is empty
   */
  public dequeue(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    
    // Get the highest priority
    const highestPriority = this.priorities[0];
    
    // Get the group for this priority
    const group = this.priorityGroups.get(highestPriority)!;
    
    // Remove the first item from the group
    const item = group.shift();
    
    // If the group is now empty, remove it and update priorities
    if (group.length === 0) {
      this.priorityGroups.delete(highestPriority);
      this.priorities.shift();
    }
    
    // Remove from items map
    if (item !== undefined) {
      this.items.delete(item);
    }
    
    return item;
  }
  
  /**
   * Look at the highest priority item without removing it
   * 
   * @returns The highest priority item or undefined if the queue is empty
   */
  public peek(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    
    // Get the highest priority
    const highestPriority = this.priorities[0];
    
    // Get the group for this priority
    const group = this.priorityGroups.get(highestPriority)!;
    
    // Return the first item without removing it
    return group[0];
  }
  
  /**
   * Remove a specific item from the queue
   * 
   * @param item The item to remove
   * @returns True if the item was found and removed, false otherwise
   */
  public remove(item: T): boolean {
    if (!this.items.has(item)) {
      return false;
    }
    
    // Get the priority of the item
    const priority = this.items.get(item)!;
    
    // Get the group for this priority
    const group = this.priorityGroups.get(priority)!;
    
    // Find the index of the item in the group
    const index = group.indexOf(item);
    
    if (index === -1) {
      return false;
    }
    
    // Remove the item from the group
    group.splice(index, 1);
    
    // If the group is now empty, remove it and update priorities
    if (group.length === 0) {
      this.priorityGroups.delete(priority);
      const priorityIndex = this.priorities.indexOf(priority);
      if (priorityIndex !== -1) {
        this.priorities.splice(priorityIndex, 1);
      }
    }
    
    // Remove from items map
    this.items.delete(item);
    
    return true;
  }
  
  /**
   * Change the priority of an item
   * 
   * @param item The item to change
   * @param newPriority The new priority
   * @returns True if the item was found and its priority was changed, false otherwise
   */
  public changePriority(item: T, newPriority: number): boolean {
    if (!this.items.has(item)) {
      return false;
    }
    
    // Get the current priority of the item
    const oldPriority = this.items.get(item)!;
    
    // If the priority hasn't changed, do nothing
    if (oldPriority === newPriority) {
      return true;
    }
    
    // Remove from old priority group
    const oldGroup = this.priorityGroups.get(oldPriority)!;
    const index = oldGroup.indexOf(item);
    
    if (index === -1) {
      return false;
    }
    
    oldGroup.splice(index, 1);
    
    // If the old group is now empty, remove it and update priorities
    if (oldGroup.length === 0) {
      this.priorityGroups.delete(oldPriority);
      const priorityIndex = this.priorities.indexOf(oldPriority);
      if (priorityIndex !== -1) {
        this.priorities.splice(priorityIndex, 1);
      }
    }
    
    // Add to new priority group
    if (!this.priorityGroups.has(newPriority)) {
      this.priorityGroups.set(newPriority, []);
      this.priorities.push(newPriority);
      this.priorities.sort((a, b) => b - a); // Sort in descending order
    }
    
    const newGroup = this.priorityGroups.get(newPriority)!;
    newGroup.push(item);
    
    // Update priority in items map
    this.items.set(item, newPriority);
    
    return true;
  }
  
  /**
   * Get the priority of an item
   * 
   * @param item The item to check
   * @returns The priority of the item or undefined if the item is not in the queue
   */
  public getPriority(item: T): number | undefined {
    return this.items.get(item);
  }
  
  /**
   * Check if an item is in the queue
   * 
   * @param item The item to check
   * @returns True if the item is in the queue, false otherwise
   */
  public contains(item: T): boolean {
    return this.items.has(item);
  }
  
  /**
   * Clear the queue
   */
  public clear(): void {
    this.items.clear();
    this.priorityGroups.clear();
    this.priorities = [];
  }
  
  /**
   * Get all items in the queue
   * 
   * @returns An array of all items in the queue
   */
  public toArray(): T[] {
    const result: T[] = [];
    
    // Iterate through priorities in order
    for (const priority of this.priorities) {
      const group = this.priorityGroups.get(priority)!;
      result.push(...group);
    }
    
    return result;
  }
}