import { Inngest } from "inngest";

// From docs
export const inngest = new Inngest({
  id: "finance-platform", // Unique app ID
  name: "Finance Platform",
  retryFunction: async (attempt: number) => ({
    delay: Math.pow(2, attempt) * 1000, // Exponential backoff
    maxAttempts: 2,
  }),
});
