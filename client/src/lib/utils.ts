import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string or Date object into a human-readable format
 */
export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return "N/A";
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) return "Invalid date";
  
  // Use built-in date formatter
  return dateObj.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a value as a currency string
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Get initials from a name
 */
export function getInitials(name: string | undefined | null): string {
  if (!name) return "?";
  
  return name
    .split(' ')
    .map(part => part[0]?.toUpperCase() || '')
    .join('')
    .substring(0, 2);
}
