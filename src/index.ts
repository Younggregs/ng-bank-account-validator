import {
  CARD_BIN_URL,
  NUBAN_LENGTH,
  NUBAN_SERIAL_CODE_LENGTH,
  VALIDATION_URL,
} from "./constants";
import { NIGERIAN_BANKS } from "./constants/banks";
import { WEIGHTED_NIGERIAN_BANKS } from "./constants/weighted-bank";
import {
  AccountValidationResponse,
  Bank,
  CardBinResponse,
  CardBrand,
  CardType,
  FlutterwaveCardResponse,
  PaymentProvider,
} from "./types";

/**
 * Nigerian NUBAN Account Validator
 * @class Nuban
 * @description Validates Nigerian bank account numbers using
 * NUBAN algorithm and bank APIs
 */
class Nuban {
  private readonly apiKey: string;
  private readonly paymentProvider: PaymentProvider;
  static banks: Bank[] = NIGERIAN_BANKS;
  static weightedBanks: Bank[] = WEIGHTED_NIGERIAN_BANKS;

  /**
   * Creates an instance of NUBAN validator
   * @param apiKey - The API key for the payment provider (Paystack or Flutterwave)
   * @param paymentProvider - The payment provider to use (PAYSTACK or FLUTTERWAVE)
   * @throws Will throw an error if apiKey is empty or payment provider is invalid
   *
   * @example
   * ```typescript
   * // Initialize with Paystack
   * const nuban = new Nuban('sk_test_...', PaymentProvider.PAYSTACK);
   *
   * // Initialize with Flutterwave
   * const nuban = new Nuban('FLWSECK_TEST-...', PaymentProvider.FLUTTERWAVE);
   * ```
   */
  constructor(apiKey: string, paymentProvider: PaymentProvider) {
    if (!apiKey || !paymentProvider) {
      throw new Error("API Key and Payment Provider are required");
    }

    this.apiKey = apiKey;
    this.paymentProvider = paymentProvider;
  }

  /**
   * Validates a Nigerian NUBAN account number
   * @param accountNumber - The account number to validate (10 digits)
   * @param bankCode - The bank code (e.g., "000015" for Zenith Bank)
   * @returns Promise<AccountValidationResponse>
   *
   * @example
   * ```typescript
   * const nuban = new Nuban('your-api-key', 'PAYSTACK');
   *
   * // Validate account using Paystack
   * const result = await nuban.validateAccount('0123456789', '057');
   * // { status: true, message: 'Account found', data: { account_name: 'John Doe', ... } }
   *
   * // Invalid account number
   * const invalid = await nuban.validateAccount('12345', '057');
   * // { status: false, message: 'Invalid account number, digits should be exactly 10' }
   * ```
   */
  async validateAccount(
    accountNumber: string,
    bankCode: string
  ): Promise<AccountValidationResponse> {
    try {
      if (!this.validateNuban(accountNumber)) {
        return {
          status: false,
          message: "Invalid account number, digits should be exactly 10",
        };
      }

      if (!this.validateBankCode(bankCode)) {
        return {
          status: false,
          message: `Invalid bank code for payment provider - ${this.paymentProvider}`,
        };
      }

      const queryMethod = {
        [PaymentProvider.PAYSTACK]: this.paystackQuery,
        [PaymentProvider.FLUTTERWAVE]: this.flutterwaveQuery,
      }[this.paymentProvider];

      if (!queryMethod) {
        return {
          status: false,
          message: "Unsupported payment provider",
        };
      }

      return await queryMethod.call(this, accountNumber, bankCode);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        status: false,
        message: `Account validation failed - ${errorMessage}`,
      };
    }
  }

  /**
   * Resolves card BIN (Bank Identification Number) information
   * @param firstSixDigits - First 6 digits of the card number
   * @returns Promise<CardBinResponse> Card BIN information including brand, type, and issuing bank
   *
   * @throws Will throw an error if the card BIN resolution fails
   *
   * @example
   * ```typescript
   * const nuban = new Nuban('your-api-key', PaymentProvider.PAYSTACK);
   *
   * // Resolve card BIN
   * const cardInfo = await nuban.resolveCardBin('123456');
   * // {
   * //   status: true,
   * //   message: 'Card BIN resolved',
   * //   data: {
   * //     bin: '123456',
   * //     brand: 'VISA',
   * //     card_type: 'DEBIT',
   * //     bank: 'Access Bank'
   * //   }
   * // }
   * ```
   */
  async resolveCardBin(firstSixDigits: string): Promise<CardBinResponse> {
    try {
      // Validate input
      if (!firstSixDigits?.match(/^\d{6}$/)) {
        return {
          status: false,
          message: "Invalid card BIN - must be exactly 6 digits",
        };
      }

      const url = `${CARD_BIN_URL[this.paymentProvider]}${firstSixDigits}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const resolvedResponse = await response.json();

      return this.paymentProvider === PaymentProvider.FLUTTERWAVE
        ? this.formatFlutterwaveCardBinResponse(resolvedResponse)
        : ({
            ...resolvedResponse,
            data: {
              ...resolvedResponse.data,
              brand: resolvedResponse.data.brand.toUpperCase(),
            },
          } as CardBinResponse);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        status: false,
        message: `Card bin resolution failed - ${errorMessage}`,
      };
    }
  }

  /**
   * Gets all possible Nigerian banks that could have issued a NUBAN account number
   * based on CBN's NUBAN algorithm standard
   * @see {@link https://www.cbn.gov.ng/out/2020/psmd/revised%20standards%20on%20nigeria%20uniform%20bank%20account%20number%20(nuban)%20for%20banks%20and%20other%20financial%20institutions%20.pdf CBN NUBAN Standard}
   *
   * @param accountNumber - The 10-digit NUBAN account number to validate
   * @param banks - Optional array of banks to check against (defaults to all Nigerian banks)
   * @returns Array of banks that could have issued the account number
   *
   * @example
   * ```typescript
   * // Get all possible banks for an account number
   * const possibleBanks = Nuban.getPossibleNubanBanks('0123456789');
   * // [{ name: 'Access Bank', code: '000014' }, { name: 'Zenith Bank', code: '000015' }]
   * ```
   *
   * Because of the irregularities in the NUBAN structure, a
   * request to check a bank account can result in alot of banks
   * returned, as I have 558 banks registered. So to streamline
   * this for your use case you can pass custom banks to check.
   *
   * To this end I provided a default weightedBanks list that
   * contains the most popular banks in the country that can be
   * used to streammline your response to those banks.
   * You can also pass custom banks.
   *
   * The optional weight param in the banks type is for you to
   * filter the results by relevance to your specific need.
   * @example
   * ```typescript
   * // Check against the default weighted banks
   * const specificBanks = Nuban.getPossibleNubanBanks('0123456789', Nuban.weightedBanks);
   *
   * // Check against custom banks
   * const specificBanks = Nuban.getPossibleNubanBanks('0123456789', [
   *   { id: '1', slug: '000014', name: 'Access Bank', code: '000014', weight: 1 }
   * ]);
   * ```
   */
  static getPossibleNubanBanks(
    accountNumber: string,
    banks: Bank[] = Nuban.banks
  ): Bank[] {
    return banks.filter((bank) =>
      Nuban.isPossibleNubanBank(accountNumber, bank.code)
    );
  }

  /**
   * Makes an API request to Paystack to validate account details
   * @param accountNumber - The account number to validate
   * @param bankCode - The bank code to validate against
   * @returns Promise<AccountValidationResponse>
   * @throws Will throw an error if the API request fails
   * @private
   */
  private async paystackQuery(accountNumber: string, bankCode: string) {
    const url = `${
      VALIDATION_URL[this.paymentProvider]
    }?account_number=${accountNumber}&bank_code=${bankCode}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return this.validateApiResponse(data);
    } catch (error) {
      throw new Error(
        `Paystack API error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Makes an API request to Flutterwave to validate account details
   * @param accountNumber - The account number to validate
   * @param bankCode - The bank code to validate against
   * @throws Will throw an error if the API request fails
   * @private
   */
  private async flutterwaveQuery(accountNumber: string, bankCode: string) {
    const url = VALIDATION_URL[this.paymentProvider];

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_number: accountNumber,
          account_bank: bankCode,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return this.validateApiResponse(data);
    } catch (error) {
      throw new Error(
        `Flutterwave API error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Validates NUBAN format
   * @param accountNumber - The account number to validate
   * @returns boolean
   */
  private validateNuban(accountNumber: string): boolean {
    return Boolean(
      accountNumber?.length === NUBAN_LENGTH && /^\d+$/.test(accountNumber)
    );
  }

  /**
   * Validates bank code format based on payment provider
   * @param bankCode - The bank code to validate
   * @returns boolean indicating if the bank code format is valid
   * @private
   *
   * @example
   * ```typescript
   * // Paystack (exactly 3 digits)
   * // Requires the old bank code
   * validateBankCode('057', PaymentProvider.PAYSTACK); // true
   * validateBankCode('000015', PaymentProvider.PAYSTACK); // false
   *
   * // Flutterwave (accepts 3 or 6 digits)
   * // Accepts both the old and new bank codes.
   * validateBankCode('057', PaymentProvider.FLUTTERWAVE); // true
   * validateBankCode('000015', PaymentProvider.FLUTTERWAVE); // true
   * ```
   */
  private validateBankCode(bankCode: string): boolean {
    if (!bankCode?.length || !/^\d+$/.test(bankCode)) {
      return false;
    }

    switch (this.paymentProvider) {
      case PaymentProvider.PAYSTACK:
        return bankCode.length === 3;
      case PaymentProvider.FLUTTERWAVE:
        return bankCode.length === 3 || bankCode.length === 6;
      default:
        return false;
    }
  }

  /**
   * Formats Flutterwave's card BIN response to match the standard CardBinResponse interface
   * @param response - Raw response from Flutterwave's card BIN API
   * @returns CardBinResponse Formatted card BIN information
   *
   * @example
   * ```typescript
   * // Raw Flutterwave response
   * const rawResponse = {
   *   status: true,
   *   message: "success",
   *   data: {
   *     issuing_country: "NIGERIA NG",
   *     bin: "123456",
   *     card_type: "DEBIT",
   *     issuer_info: "VISA Access Bank"
   *   }
   * };
   *
   * const formatted = this.formatFlutterwaveCardBinResponse(rawResponse);
   * // {
   * //   status: true,
   * //   message: "success",
   * //   data: {
   * //     bin: "123456",
   * //     country_code: "NG",
   * //     country_name: "NIGERIA",
   * //     card_type: "DEBIT",
   * //     brand: "VISA",
   * //     bank: "Access Bank"
   * //   }
   * // }
   * ```
   */
  private formatFlutterwaveCardBinResponse(
    response: FlutterwaveCardResponse
  ): CardBinResponse {
    const [country_name, country_code] =
      response.data.issuing_country.split(" ");
    const [brand, ...bankParts] = response.data.issuer_info.split(" ");

    const formattedResponse: CardBinResponse = {
      ...response,
      data: {
        bin: response.data.bin,
        country_code,
        country_name,
        card_type: response.data.card_type,
        brand: brand as CardBrand,
        bank: bankParts.join(" "),
      },
    };

    return formattedResponse;
  }

  /**
   * Validates and type checks the API response
   * @param response - Raw API response
   * @returns AccountValidationResponse
   * @throws Will throw an error if the response format is invalid
   * @private
   */
  private validateApiResponse(response: unknown): AccountValidationResponse {
    if (
      typeof response === "object" &&
      response !== null &&
      "status" in response &&
      "message" in response
    ) {
      return response as AccountValidationResponse;
    }
    throw new Error("Invalid API response format");
  }

  /**
   * Generates a seed array for NUBAN validation based on CBN's algorithm
   * @param length - Length of the seed array to generate
   * @returns Array of alternating numbers (3,7) based on the specified length
   * @private
   *
   * @example
   * [3, 7, 3, 3, 7, 3, 3, 7, 3]
   */
  private static generateSeed(length: number): number[] {
    return Array.from({ length }, (_, i) => (i % 2 ? 7 : 3));
  }

  /**
   * Validates the NUBAN serial code format
   * @param nubanSerialCode - 9-digit NUBAN serial code
   * @throws {Error} If serial code is invalid or exceeds maximum length
   * @returns true if the serial code is valid
   * @private
   */
  private static validateNubanSerialCode(nubanSerialCode: string): boolean {
    if (!nubanSerialCode || nubanSerialCode.length > NUBAN_SERIAL_CODE_LENGTH) {
      throw new Error(
        `Nuban serial code should not be more than ${NUBAN_SERIAL_CODE_LENGTH} digits`
      );
    }
    return true;
  }

  /**
   * Generates the check digit for a NUBAN account number using CBN's algorithm
   * @see {@link https://www.cbn.gov.ng/out/2020/psmd/revised%20standards%20on%20nigeria%20uniform%20bank%20account%20number%20(nuban)%20for%20banks%20and%20other%20financial%20institutions%20.pdf CBN NUBAN Standard}
   * @param nubanSerialCode - First 9 digits of the account number
   * @param bankCode - 6-digit bank code
   * @returns The check digit (last digit) of the NUBAN
   * @private
   *
   * @example
   * ```typescript
   * const checkDigit = Nuban.generateCheckDigit('123456789', '000014');
   * // Returns a number between 0-9
   * ```
   */
  private static generateCheckDigit(
    nubanSerialCode: string,
    bankCode: string
  ): number {
    this.validateNubanSerialCode(nubanSerialCode);

    const paddedCode = nubanSerialCode.padStart(NUBAN_SERIAL_CODE_LENGTH, "0");
    const crypto = bankCode + paddedCode;
    const seed = this.generateSeed(crypto.length);

    // Step 1: Calculate
    // A*3+B*7+C*3+D*3+E*7+F*3+G*3+H*7+I*3+J*3+K*7+L*3+M*3+N*7+O*3.
    const cryptoSum = crypto
      .split("")
      .reduce((sum, digit, index) => sum + seed[index] * Number(digit), 0);

    // Step 2: Calculate Modulo 10 of your result i.e. the remainder after dividing by 10
    const modulo = cryptoSum % 10;

    // Step 3. Subtract your result from 10 to get the Check Digit.
    // Step 4. Subtract 1 to get Check Digit 9.
    return 10 - modulo - 1;
  }

  /**
   * Checks if a bank could have issued a specific NUBAN account number
   * @param accountNumber - Complete 10-digit NUBAN account number
   * @param bankCode - 6-digit bank code to validate against
   * @returns boolean indicating if the bank could have issued the account number
   * @private
   *
   * @example
   * ```typescript
   * const isValid = Nuban.isPossibleNubanBank('0123456789', '000014');
   * // Returns true if the check digit matches the bank's algorithm
   * ```
   */
  private static isPossibleNubanBank(
    accountNumber: string,
    bankCode: string
  ): boolean {
    const nubanSerialCode = accountNumber.substring(0, 9);
    const checkDigit = this.generateCheckDigit(nubanSerialCode, bankCode);

    return checkDigit === Number(accountNumber[9]);
  }
}

export {
  Nuban,
  PaymentProvider,
  Bank,
  AccountValidationResponse,
  CardType,
  CardBrand,
  CardBinResponse,
};
