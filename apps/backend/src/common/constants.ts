/** Shared module-level constants for the backend. */

/** Days an emailed invitation stays valid before it expires. */
export const INVITATION_TTL_DAYS = 7;

/**
 * Positive USDC amount as a decimal string with up to 7 decimals (Stellar
 * precision). Rejects zero and pure-zero fractions (e.g. "0", "0.00") and
 * anything with more than 13 integer or 7 fractional digits.
 */
export const AMOUNT_PATTERN = /^(?!0+(\.0+)?$)\d{1,13}(\.\d{1,7})?$/;
