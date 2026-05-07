import type { BookingStatus } from '@tyrerepair/realtime';

export function getCustomerStatusLabel(status: BookingStatus): string {
  switch (status) {
    case 'pending_payment':
      return 'Payment pending';
    case 'confirmed':
      return 'Booking confirmed';
    case 'dispatching':
      return 'Preparing dispatch';
    case 'dispatched':
      return 'On the way';
    case 'on_site':
      return 'Technician on site';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'refunded':
      return 'Refunded';
    case 'failed':
      return 'Payment failed';
  }
}

export function getCustomerStatusDescription(status: BookingStatus): string {
  switch (status) {
    case 'pending_payment':
      return 'Waiting for your payment to be confirmed.';
    case 'confirmed':
      return 'We have your emergency booking and are preparing your tyre.';
    case 'dispatching':
      return 'Our mobile technician is being dispatched to your location.';
    case 'dispatched':
      return 'A technician is on the way to you now.';
    case 'on_site':
      return 'A technician is on site working on your vehicle.';
    case 'completed':
      return 'Your emergency callout has been completed.';
    case 'cancelled':
      return 'This booking was cancelled before completion.';
    case 'refunded':
      return 'This booking was refunded. Contact us if you need help.';
    case 'failed':
      return 'Payment did not complete. Please try again or call us.';
  }
}
