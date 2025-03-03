# ng-bank-account-validator

A TypeScript/Javascript package for validating Nigerian NUBAN (Nigerian Uniform Bank Account Number) bank accounts using Paystack or Flutterwave APIs.

[![npm version](https://badge.fury.io/js/ng-bank-account-validator.svg)](https://www.npmjs.com/package/ng-bank-account-validator)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- Validate Nigerian bank account numbers (NUBAN)
- Resolve card BIN (Bank Identification Number) information
- Get a list of all banks with their bank codes
- Support for multiple payment providers (Paystack, Flutterwave)
- TypeScript support with full type definitions
- Implements CBN's NUBAN algorithm
- Includes a weighted list of popular Nigerian banks

## Installation

```bash
npm install ng-bank-account-validator
```

## Usage

### Initialize the Validator

```typescript
import { Nuban, PaymentProvider } from "ng-bank-account-validator";

// Initialize with Paystack
const nuban = new Nuban("sk_test_your_paystack_key", PaymentProvider.PAYSTACK);

// Or initialize with Flutterwave
const nuban = new Nuban(
  "FLWSECK_TEST_your_flutterwave_key",
  PaymentProvider.FLUTTERWAVE
);
```

### Validate Account Number

```typescript
const result = await nuban.validateAccount("0123456789", "057");
// Returns:
// {
//   status: true,
//   message: 'Account found',
//   data: {
//     account_number: '0123456789',
//     account_name: 'John Doe',
//     bank_code: '057'
//   }
// }
```

### Resolve Card BIN

```typescript
const cardInfo = await nuban.resolveCardBin("123456");
// Returns:
// {
//   status: true,
//   message: 'Card BIN resolved',
//   data: {
//     bin: '123456',
//     brand: 'VISA',
//     card_type: 'DEBIT',
//     bank: 'Access Bank'
//   }
// }
```

### Get Possible Banks for NUBAN

```typescript
// Get all possible banks for an account number
const possibleBanks = Nuban.getPossibleNubanBanks("0123456789");

// Use weighted banks (most popular banks)
const popularBanks = Nuban.getPossibleNubanBanks(
  "0123456789",
  Nuban.weightedBanks
);

// Create and use your own custom banks.
const popularBanks = Nuban.getPossibleNubanBanks(
  "0123456789",
  CustomArrayOfBanks
);
```

## API Reference

### `class Nuban`

#### Constructor

```typescript
constructor(apiKey: string, paymentProvider: PaymentProvider)
```

#### Methods

- `validateAccount(accountNumber: string, bankCode: string): Promise<AccountValidationResponse>`
- `resolveCardBin(firstSixDigits: string): Promise<CardBinResponse>`
- `static getPossibleNubanBanks(accountNumber: string, banks?: Bank[]): Bank[]`

#### Static Properties

- `banks: Bank[]` - List of all Nigerian banks
- `weightedBanks: Bank[]` - List of popular Nigerian banks

## Types

### `PaymentProvider`

```typescript
enum PaymentProvider {
  PAYSTACK = "PAYSTACK",
  FLUTTERWAVE = "FLUTTERWAVE",
}
```

### `Bank`

```typescript
interface Bank {
  id: number;
  slug: string;
  name: string;
  code: string;
  weight?: number;
}
```

### `AccountValidationResponse`

```typescript
interface AccountValidationResponse {
  status: boolean;
  message: string;
  data?: {
    account_number: string;
    account_name: string;
    bank_code?: string;
  };
}
```

### `CardType`

```typescript
enum CardType {
  DEBIT = "DEBIT",
  CREDIT = "CREDIT",
}
```

### `CardBrand`

```typescript
enum CardBrand {
  MASTERCARD = "MASTERCARD",
  VERVE = "VERVE",
  VISA = "VISA",
}
```

### `CardBrand`

```typescript
interface CardBinResponse {
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
```

## Error Handling

The package includes comprehensive error handling:

```typescript
try {
  const result = await nuban.validateAccount("invalid", "057");
} catch (error) {
  // Handles API errors, network issues, etc.
  console.error(error);
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Retzam

## Support

- For bugs and feature requests, please [create an issue](https://github.com/Younggregs/ng-bank-account-validator/issues)
- For contributions, please read our [contributing guide](CONTRIBUTING.md)
