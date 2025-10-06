// api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { User } from '../model/user';
import { GameDetail } from '../model/game';
import { Constants } from '../config/constants';
import { DiscountCode } from '../model/discountcode';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient, private constants: Constants) {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  // ================= Auth / User =================
  async registerUser(user: { username: string; email: string; password: string }) {
    const url = `${this.constants.API_ENDPOINT}/register`;
    return await lastValueFrom(this.http.post(url, user, { withCredentials: true }));
  }

  async login(identifier: string, password: string) {
    const url = `${this.constants.API_ENDPOINT}/login`;
    return await lastValueFrom(this.http.post(url, { identifier, password }, { withCredentials: true }));
  }

  async getProfile(): Promise<User> {
    const url = `${this.constants.API_ENDPOINT}/me`;
    return await lastValueFrom(this.http.get(url, { withCredentials: true })) as User;
  }

  // ================= Games =================
  async getGames(): Promise<GameDetail[]> {
    const url = `${this.constants.API_ENDPOINT}/game`;
    return await lastValueFrom(this.http.get<GameDetail[]>(url, this.getHeaders()));
  }

  async getGameById(id: number): Promise<GameDetail> {
    const url = `${this.constants.API_ENDPOINT}/game/${id}`;
    return await lastValueFrom(this.http.get<GameDetail>(url, this.getHeaders()));
  }

  async createGame(formData: FormData) {
    const url = `${this.constants.API_ENDPOINT}/game/admin`;
    return await lastValueFrom(this.http.post(url, formData, this.getHeaders()));
  }

  async updateGame(id: number, formData: FormData) {
    const url = `${this.constants.API_ENDPOINT}/game/admin/${id}`;
    return await lastValueFrom(this.http.put(url, formData, this.getHeaders()));
  }

  async deleteGame(id: number) {
    const url = `${this.constants.API_ENDPOINT}/game/admin/${id}`;
    return await lastValueFrom(this.http.delete(url, this.getHeaders()));
  }

  // ================= Admin =================
  async getAllUsers(): Promise<User[]> {
    const url = `${this.constants.API_ENDPOINT}/admin/users`;
    return await lastValueFrom(this.http.get<User[]>(url, this.getHeaders()));
  }

  async getTransactions(): Promise<any[]> {
    const url = `${this.constants.API_ENDPOINT}/admin/transactions`;
    return await lastValueFrom(this.http.get<any[]>(url, this.getHeaders()));
  }

  // ================= Categories =================
  async getCategories(): Promise<any[]> {
    const url = `${this.constants.API_ENDPOINT}/categories`;
    return await lastValueFrom(this.http.get<any[]>(url, this.getHeaders()));
  }

  // ================= Discount Codes =================
  async getDiscountCodes(): Promise<DiscountCode[]> {
    const url = `${this.constants.API_ENDPOINT}/admin/discount-codes`;
    return await lastValueFrom(this.http.get<DiscountCode[]>(url, this.getHeaders()));
  }

  async createDiscountCode(data: DiscountCode): Promise<any> {
    const url = `${this.constants.API_ENDPOINT}/admin/discount-codes`;
    return await lastValueFrom(this.http.post(url, data, this.getHeaders()));
  }

  async updateDiscountCode(id: number, data: DiscountCode): Promise<any> {
    const url = `${this.constants.API_ENDPOINT}/admin/discount-codes/${id}`;
    return await lastValueFrom(this.http.put(url, data, this.getHeaders()));
  }

  async deleteDiscountCode(id: number): Promise<any> {
    const url = `${this.constants.API_ENDPOINT}/admin/discount-codes/${id}`;
    return await lastValueFrom(this.http.delete(url, this.getHeaders()));
  }
}
