import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount)
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("vi-VN")
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString("vi-VN")
}
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
