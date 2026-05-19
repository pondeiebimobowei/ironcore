export function validateRejectionReason(reason: string) {
  if (!reason.trim()) {
    return "Rejection reason is required.";
  }

  return null;
}
