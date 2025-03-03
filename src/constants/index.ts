import { PaymentProvider } from "@/src/types";

const PAYSTACK_VALIDATION_URL = "https://api.paystack.co/bank/resolve";
const FLUTTERWAVE_VALIDATION_URL =
  "https://api.flutterwave.com/v3/accounts/resolve";

const VALIDATION_URL: Record<PaymentProvider, string> = {
  PAYSTACK: PAYSTACK_VALIDATION_URL,
  FLUTTERWAVE: FLUTTERWAVE_VALIDATION_URL,
} as const;

const PAYSTACK_CARD_BIN_URL = "https://api.paystack.co/decision/bin/";
const FLUTTERWAVE_CARD_BIN_URL = "https://api.flutterwave.com/v3/card-bins/";
const CARD_BIN_URL: Record<PaymentProvider, string> = {
  PAYSTACK: PAYSTACK_CARD_BIN_URL,
  FLUTTERWAVE: FLUTTERWAVE_CARD_BIN_URL,
} as const;

const NUBAN_LENGTH = 10;
const NUBAN_SERIAL_CODE_LENGTH = 9;

export { VALIDATION_URL, CARD_BIN_URL, NUBAN_LENGTH, NUBAN_SERIAL_CODE_LENGTH };
