import { Nuban, PaymentProvider } from "../src";

// Mock fetch
global.fetch = jest.fn();

describe("Nuban", () => {
  let nuban: Nuban;
  const mockApiKey = "live_api_secret";
  const mockPaymentProvider = PaymentProvider.PAYSTACK;

  beforeEach(() => {
    nuban = new Nuban(mockApiKey, mockPaymentProvider);
    jest.clearAllMocks();
  });

  describe("validateAccount", () => {
    it("should return false for invalid NUBAN format", async () => {
      const result = await nuban.validateAccount("01234567", "000013");
      expect(result.status).toBe(false);
    });

    it("should return true for valid account details", async () => {
      const mockResponse = {
        status: true,
        message: "Account details fetched",
        data: {
          account_number: "0123456789",
          account_name: "John Doe",
          bank_code: "057",
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await nuban.validateAccount("0123456789", "057");
      expect(result.status).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("should return false when API call fails", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("API Error"));

      const result = await nuban.validateAccount("0123456789", "057");
      expect(result.status).toBe(false);
    });

    it("should return false when response is not ok", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const result = await nuban.validateAccount("0123456789", "057");
      expect(result.status).toBe(false);
    });
  });
});
