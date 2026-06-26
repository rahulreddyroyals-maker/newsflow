// src/utils/wallet.js
export const POINTS_PER_RUPEE = 10 // 10 NF points = ₹1
export const MIN_WITHDRAWAL_POINTS = 5000 // = ₹500, the minimum withdrawal amount
export const MIN_WITHDRAWAL_RUPEES = MIN_WITHDRAWAL_POINTS / POINTS_PER_RUPEE

export function pointsToRupees(points) {
  return Math.floor((points || 0) / POINTS_PER_RUPEE)
}
