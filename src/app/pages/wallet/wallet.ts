import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';
import { Transaction } from '../../model/transaction';
import { Header } from '../header/header';
import { Constants } from '../../config/constants';

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
  isLoading: boolean = true;

  private balanceSub?: Subscription;

  constructor(
    private http: HttpClient,
    private constants: Constants
  ) { }

  ngOnInit() {
    this.loadBalance();
    this.loadTransactions();

    // อัปเดตยอดเงินทุก 3 วินาที
    this.balanceSub = interval(3000).subscribe(() => this.loadBalance());
  }

  ngOnDestroy() {
    this.balanceSub?.unsubscribe();
  }

  loadBalance() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      this.isLoading = false;
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get<any>(`${this.constants.API_ENDPOINT}/wallet`, {
      headers,
      withCredentials: true
    })
      .subscribe({
        next: (res) => {
          // ตรวจสอบทั้ง balance และ wallet_balance
          this.balance = res.balance || res.wallet_balance || 0;
          this.isLoading = false;
          console.log('Balance loaded:', this.balance);
        },
        error: (err) => {
          console.error('Error loading balance:', err);
          this.isLoading = false;
          if (err.status === 401) {
            alert('กรุณาเข้าสู่ระบบใหม่');
          }
        }
      });
  }

  loadTransactions() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get<any>(`${this.constants.API_ENDPOINT}/transactions`, {
      headers,
      withCredentials: true
    })
      .subscribe({
        next: (res) => {
          console.log('Transactions response:', res);

          // ตรวจสอบโครงสร้าง response
          let transactionsData: any[] = [];

          if (Array.isArray(res)) {
            transactionsData = res;
          } else if (res.transactions && Array.isArray(res.transactions)) {
            transactionsData = res.transactions;
          }

          // แปลงข้อมูลให้ตรงกับ Transaction interface
          this.transactions = transactionsData.map(transaction => ({
            id: transaction.id,
            user_id: transaction.user_id,
            user_name: transaction.user_name || 'ไม่ระบุ',
            type: transaction.type || 'unknown',
            amount: transaction.amount ? transaction.amount.toString() : '0',
            description: transaction.description || 'ไม่มีคำอธิบาย',
            created_at: transaction.created_at || new Date().toISOString()
          }));

          console.log('Processed transactions:', this.transactions);
        },
        error: (err) => {
          console.error('Error loading transactions:', err);
          this.transactions = [];
          if (err.status === 401) {
            alert('กรุณาเข้าสู่ระบบใหม่');
          }
        }
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

    const token = localStorage.getItem('token');
    if (!token) {
      alert('กรุณาเข้าสู่ระบบก่อน');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.post(
      `${this.constants.API_ENDPOINT}/deposit`,
      { amount: this.topUpAmount },
      { headers, withCredentials: true }
    )
      .subscribe({
        next: (res: any) => {
          console.log('Deposit successful:', res);
          this.topUpAmount = null;
          this.loadBalance();
          this.loadTransactions();

          const newBalance = res.new_balance || res.balance || this.balance;
          alert(`💰 เติมเงินสำเร็จ! \nยอดเงินปัจจุบัน: ${newBalance} บาท`);

          // 🔥 เพิ่มบรรทัดนี้: บอกให้ header โหลดข้อมูลใหม่
          localStorage.setItem('lastBalanceUpdate', Date.now().toString());
        },
        error: (err) => {
          console.error('Deposit error:', err);
          if (err.status === 400) {
            alert('ข้อมูลไม่ถูกต้อง: ' + (err.error?.message || 'กรุณาตรวจสอบจำนวนเงิน'));
          } else if (err.status === 401) {
            alert('กรุณาเข้าสู่ระบบใหม่');
          } else if (err.status === 500) {
            alert('เกิดข้อผิดพลาดในระบบ: ' + (err.error?.message || 'กรุณาลองใหม่ในภายหลัง'));
          } else {
            alert('เติมเงินไม่สำเร็จ: ' + (err.error?.message || 'กรุณาลองใหม่'));
          }
        }
      });
  }

  // helper method สำหรับแสดงประเภทธุรกรรม
  getTransactionTypeDisplay(type: string): string {
    const typeMap: { [key: string]: string } = {
      'deposit': 'เติมเงิน',
      'purchase': 'ซื้อเกม',
      'refund': 'คืนเงิน',
      'withdraw': 'ถอนเงิน'
    };
    return typeMap[type] || type;
  }

  // helper method สำหรับแสดงสีตามประเภทธุรกรรม
  getTransactionColor(type: string): string {
    const colorMap: { [key: string]: string } = {
      'deposit': 'green',
      'purchase': 'red',
      'refund': 'blue',
      'withdraw': 'orange'
    };
    return colorMap[type] || 'gray';
  }
}