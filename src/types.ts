export interface Bank {
  id: number;
  slug: string;
  name: string;
  code: string; // New 6 Digit Codes.
  oldCode?: string; // Old 3 Digit Codes.
  weight?: number;
}

export enum BankProperty {
  SLUG = "SLUG",
  CODE = "CODE",
  OLD_CODE = "OLD_CODE",
}

export enum PaymentProvider {
  PAYSTACK = "PAYSTACK",
  FLUTTERWAVE = "FLUTTERWAVE",
}

export interface AccountValidationResponse {
  status: boolean;
  message: string;
  data?: {
    account_number: string;
    account_name: string;
    bank_code?: string;
  };
}

export enum CardType {
  DEBIT = "DEBIT",
  CREDIT = "CREDIT",
}

export enum CardBrand {
  MASTERCARD = "MASTERCARD",
  VERVE = "VERVE",
  VISA = "VISA",
}

export interface CardBinResponse {
  status: boolean;
  message: string;
  data?: {
    bin: string;
    country_code: string;
    country_name: string;
    card_type: CardType;
    brand: CardBrand;
    bank: string;
    linked_bank_id?: number;
  };
}

export type FlutterwaveCardResponse = {
  status: boolean;
  message: string;
  data: {
    issuing_country: string;
    bin: string;
    card_type: CardType;
    issuer_info: string;
  };
};
