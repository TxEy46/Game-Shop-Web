import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { User } from '../model/user';
import { GameDetail } from '../model/game';
import { Constants } from '../config/constants';
import { Purchase } from '../model/purchase';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient, private constants: Constants) { }

  // --- USER / AUTH ---
  async registerUser(user: { username: string; email: string; password: string; avatar_url?: string }): Promise<User> {
    const url = `${this.constants.API_ENDPOINT}/user/register`;
    const response = await lastValueFrom(this.http.post(url, user));
    return response as User;
  }

  async login(email: string, password: string): Promise<{ user: User; balance: number }> {
    const url = `${this.constants.API_ENDPOINT}/user/login`;
    const response = await lastValueFrom(this.http.post(url, { email, password })) as any;

    // เก็บ token ลง localStorage
    if (response.token) localStorage.setItem('token', response.token);
    if (response.user) localStorage.setItem('user', JSON.stringify(response.user));

    return { user: response.user, balance: response.balance };
  }

  // --- GAMES ---
  async getGames(): Promise<GameDetail[]> {
    try {
      const url = `${this.constants.API_ENDPOINT}/game`;
      const response = await lastValueFrom(this.http.get(url));
      return response as GameDetail[];
    } catch (err) {
      console.error('Error fetching games:', err);
      throw err;
    }
  }

  async purchaseGames(purchase: { user_id: number; game_ids: number[]; discount_code?: string }): Promise<Purchase> {
    const url = `${this.constants.API_ENDPOINT}/purchase`;
    const response = await lastValueFrom(this.http.post(url, purchase));
    return response as Purchase;
  }

  async uploadFile(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.constants.API_ENDPOINT}/upload`;
    const response = await lastValueFrom(this.http.post(url, formData));
    return response as { url: string };
  }

  // --- WALLET ---
  async getWalletBalance(user_id: number): Promise<number> {
    const url = `${this.constants.API_ENDPOINT}/wallet/${user_id}`;
    const response = await lastValueFrom(this.http.get<{ wallet_balance: number }>(url));
    return response.wallet_balance;
  }

  async depositWallet(user_id: number, amount: number): Promise<void> {
    const url = `${this.constants.API_ENDPOINT}/wallet/deposit`;
    await lastValueFrom(this.http.post(url, { user_id, amount }));
  }

  async getTransactions(user_id: number): Promise<{ type: string; amount: number; description: string; created_at: string }[]> {
    const url = `${this.constants.API_ENDPOINT}/wallet/transactions/${user_id}`;
    const response = await lastValueFrom(this.http.get(url));
    return response as { type: string; amount: number; description: string; created_at: string }[];
  }
}
