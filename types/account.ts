export interface Account {
  id: string;
  name: string;
  balance: number | number;
  type: string;
  isDefault: boolean;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: {
    transactions: number;
  };
  [key: string]: unknown;
}
