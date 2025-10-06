export interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  avatar_url?: string;
  userBalance: number;
  wallet_balance: number;
}

export interface LoginResponse {
  user: User;
  balance: number; // Wallet balance
}
