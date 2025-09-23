import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';
import { Transaction } from '../../model/transaction';
import { Header } from '../header/header';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, HttpClientModule, Header],
  templateUrl: './wallet.html',
  styleUrls: ['./wallet.scss']
})
export class Wallet implements OnInit, OnDestroy {
  balance: number = 0;
  topUpAmount: number | null = null;
  predefinedAmounts: number[] = [100, 200, 500];
  transactions: Transaction[] = [];

  private userId: number = 0;
  private balanceSub?: Subscription;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) this.userId = JSON.parse(storedUser).id;

    this.loadBalance();
    this.loadTransactions();

    // อัปเดตยอดเงินทุก 3 วินาที
    this.balanceSub = interval(3000).subscribe(() => this.loadBalance());
  }

  ngOnDestroy() {
    this.balanceSub?.unsubscribe();
  }

  loadBalance() {
    if (!this.userId) return;
    this.http.get<{ wallet_balance: number }>(`http://localhost:3000/wallet/${this.userId}`)
      .subscribe({
        next: res => this.balance = res.wallet_balance,
        error: err => console.error(err)
      });
  }

  loadTransactions() {
    if (!this.userId) return;
    this.http.get<Transaction[]>(`http://localhost:3000/wallet/transactions/${this.userId}`)
      .subscribe({
        next: res => this.transactions = res,
        error: err => console.error(err)
      });
  }

  selectAmount(amount: number) {
    this.topUpAmount = amount;
  }
  
  topUp() {
    if (!this.topUpAmount || this.topUpAmount <= 0) {
      alert('กรุณาใส่จำนวนเงินที่ถูกต้อง');
      return;
    }

    // ป้องกันค่าติดลบ
    if (this.topUpAmount < 0) {
      alert('จำนวนเงินต้องมากกว่าศูนย์');
      this.topUpAmount = null;
      return;
    }

    this.http.post(`http://localhost:3000/wallet/deposit`, { user_id: this.userId, amount: this.topUpAmount })
      .subscribe({
        next: () => {
          this.topUpAmount = null;
          this.loadBalance();
          this.loadTransactions();
          alert('เติมเงินสำเร็จ');
        },
        error: err => {
          console.error(err);
          alert('เติมเงินไม่สำเร็จ');
        }
      });
  }
}
