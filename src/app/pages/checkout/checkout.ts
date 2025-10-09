import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartItem } from '../../model/cart';
import { DiscountCode } from '../../model/discountcode';
import { MatButtonModule } from '@angular/material/button';
import { Header } from "../header/header";
import { Constants } from '../../config/constants';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
    MatButtonModule,
    DecimalPipe,
    Header
  ],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.scss']
})
export class Checkout implements OnInit {
  user: any = null;
  cart: CartItem[] = [];
  discountCodeInput: string = '';
  discount: DiscountCode | null = null;
  total: number = 0;
  finalAmount: number = 0;
  isLoading: boolean = false;

  // ตัวแปรสำหรับจัดการ error
  discountError: string = '';
  discountErrorType: 'used' | 'invalid' | 'expired' | 'min_total' | 'general' | 'usage_limit' | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private constants: Constants
  ) { }

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = JSON.parse(storedUser);
    this.loadCart();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  loadCart() {
    const headers = this.getHeaders();

    this.http.get<any>(`${this.constants.API_ENDPOINT}/cart`, {
      headers,
      withCredentials: true
    }).subscribe({
      next: (data) => {
        console.log('Cart data:', data);

        // ตรวจสอบโครงสร้าง response
        const cartItems = Array.isArray(data) ? data : (data.items || data.cart || []);

        this.cart = cartItems.map((item: any) => ({
          gameId: item.game_id || item.id,
          name: item.name || item.title,
          price: Number(item.price) || 0,
          quantity: item.quantity || 1,
          image_url: this.getFullImageUrl(item.image_url)
        }));

        this.calculateTotal();
      },
      error: err => {
        console.error('Error loading cart:', err);
        if (err.status === 401) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  calculateTotal() {
    this.total = this.cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    this.finalAmount = this.discount?.finalAmount ?? this.total;
  }

  applyDiscount() {
    if (!this.discountCodeInput.trim()) {
      this.showDiscountError('กรุณาใส่โค้ดส่วนลด', 'general');
      return;
    }

    // รีเซ็ต error ก่อนเรียก API
    this.clearDiscountError();

    this.isLoading = true;
    const headers = this.getHeaders();

    // ใช้ endpoint /discounts/apply ของ Go backend
    this.http.post<any>(`${this.constants.API_ENDPOINT}/discounts/apply`,
      {
        code: this.discountCodeInput,
        total_amount: this.total,
        user_id: this.user.id
      },
      {
        headers,
        withCredentials: true
      }
    ).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Discount response:', response);

        if (response.valid) {
          // สร้าง DiscountCode object ตาม interface
          this.discount = {
            id: response.discount_id,
            code: response.code,
            type: response.type || 'percent',
            value: response.value || response.discount_value || 0,
            min_total: response.min_total || 0,
            active: response.active || true,
            usage_limit: response.usage_limit,
            single_use_per_user: response.single_use_per_user || false,
            start_date: response.start_date,
            end_date: response.end_date,
            finalAmount: response.final_amount,
            used_by_user: response.used_by_user || false
          };
          this.finalAmount = response.final_amount;
          this.clearDiscountError();
        } else {
          this.handleDiscountError(response.message || "โค้ดส่วนลดไม่ถูกต้อง");
        }
      },
      error: err => {
        this.isLoading = false;
        console.error('Discount error:', err);
        this.discount = null;
        this.finalAmount = this.total;

        this.handleDiscountErrorFromHttp(err);
      }
    });
  }

  // จัดการ error จาก HTTP response
  private handleDiscountErrorFromHttp(err: any) {
    if (err.status === 400) {
      const errorMessage = err.error?.error || err.error?.message;
      this.handleDiscountError(errorMessage);
    } else if (err.status === 401) {
      this.showDiscountError('กรุณาเข้าสู่ระบบใหม่', 'general');
    } else {
      this.showDiscountError('เกิดข้อผิดพลาดในการตรวจสอบโค้ดส่วนลด', 'general');
    }
  }

  // จัดการ error message จาก backend
  private handleDiscountError(message: string) {
    this.discount = null;
    this.finalAmount = this.total;

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('already used') || lowerMessage.includes('used')) {
      this.showDiscountError('คุณใช้โค้ดส่วนลดนี้ไปแล้ว', 'used');
    } else if (lowerMessage.includes('not found') || lowerMessage.includes('invalid')) {
      this.showDiscountError('โค้ดส่วนลดไม่ถูกต้อง', 'invalid');
    } else if (lowerMessage.includes('expired')) {
      this.showDiscountError('โค้ดส่วนลดหมดอายุแล้ว', 'expired');
    } else if (lowerMessage.includes('not yet valid')) {
      this.showDiscountError('โค้ดส่วนลดยังไม่สามารถใช้ได้ในขณะนี้', 'general');
    } else if (lowerMessage.includes('minimum purchase') || lowerMessage.includes('min_total')) {
      const minAmount = this.extractMinAmount(message);
      this.showDiscountError(`ต้องมียอดซื้อขั้นต่ำ ${minAmount} บาท จึงจะใช้โค้ดนี้ได้`, 'min_total');
    } else if (lowerMessage.includes('usage limit reached')) {
      this.showDiscountError('โค้ดส่วนลดนี้ถูกใช้ครบจำนวนแล้ว', 'usage_limit');
    } else {
      this.showDiscountError(message || 'โค้ดส่วนลดไม่สามารถใช้ได้', 'general');
    }
  }

  // ดึงจำนวนเงินขั้นต่ำจาก error message
  private extractMinAmount(message: string): string {
    const match = message.match(/\$?(\d+\.?\d*)/);
    return match ? match[1] : '0';
  }

  // แสดง error - แก้ไข type ให้รองรับ usage_limit
  private showDiscountError(message: string, type: 'used' | 'invalid' | 'expired' | 'min_total' | 'general' | 'usage_limit') {
    this.discountError = message;
    this.discountErrorType = type;
  }

  // ล้าง error
  clearDiscountError() {
    this.discountError = '';
    this.discountErrorType = null;
  }

  // ตรวจสอบว่ามี error หรือไม่
  hasDiscountError(): boolean {
    return this.discountError !== '';
  }

  // รับคลาส CSS ตามประเภท error - เพิ่ม case usage_limit
  getDiscountErrorClass(): string {
    if (!this.discountErrorType) return '';

    switch (this.discountErrorType) {
      case 'used': return 'error-used';
      case 'invalid': return 'error-invalid';
      case 'expired': return 'error-expired';
      case 'min_total': return 'error-min-total';
      case 'usage_limit': return 'error-usage-limit';
      default: return 'error-general';
    }
  }

  placeOrder() {
    if (!this.cart.length) {
      alert("ตะกร้าว่าง");
      return;
    }

    if (this.finalAmount > (this.user.wallet_balance || 0)) {
      alert("ยอดเงินในกระเป๋าเงินไม่เพียงพอ");
      this.router.navigate(['/wallet']);
      return;
    }

    this.isLoading = true;
    const headers = this.getHeaders();

    const gameIds = this.cart.map(item => item.gameId);
    const payload = {
      game_ids: gameIds,
      discount_code: this.discount?.code || null
    };

    // ใช้ endpoint /checkout ของ Go backend
    this.http.post<any>(`${this.constants.API_ENDPOINT}/checkout`,
      payload,
      {
        headers,
        withCredentials: true
      }
    ).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Checkout success:', response);

        alert(`✅ ซื้อสำเร็จ! ยอดที่ชำระ: ${response.final_amount || this.finalAmount} บาท`);

        // ล้างตะกร้า
        this.cart = [];
        this.discount = null;
        this.discountCodeInput = '';
        this.clearDiscountError();

        // อัปเดตข้อมูลผู้ใช้
        this.updateUserBalance(response.new_balance);

        // ไปหน้า library
        this.router.navigate(['/library']);
      },
      error: err => {
        this.isLoading = false;
        console.error("Checkout error:", err);

        if (err.status === 400) {
          const errorMessage = err.error?.error || err.error?.message;
          if (errorMessage?.includes('already used')) {
            this.showDiscountError('คุณใช้โค้ดส่วนลดนี้ไปแล้ว', 'used');
          } else if (errorMessage?.includes('usage limit reached')) {
            this.showDiscountError('โค้ดส่วนลดนี้ถูกใช้ครบจำนวนแล้ว', 'usage_limit');
          } else {
            alert(errorMessage || "ข้อมูลไม่ถูกต้อง");
          }
        } else if (err.status === 401) {
          alert("กรุณาเข้าสู่ระบบใหม่");
        } else if (err.status === 402) {
          alert("ยอดเงินไม่เพียงพอ");
          this.router.navigate(['/wallet']);
        } else if (err.status === 409) {
          alert("มีเกมบางเกมในตะกร้าที่คุณเป็นเจ้าของอยู่แล้ว");
        } else {
          alert("การชำระเงินไม่สำเร็จ กรุณาลองใหม่");
        }
      }
    });
  }

  private updateUserBalance(newBalance: number) {
    // อัปเดตข้อมูลผู้ใช้ใน localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      user.wallet_balance = newBalance;
      localStorage.setItem('user', JSON.stringify(user));
      this.user = user;
    }

    // บอกให้ header อัปเดตข้อมูล
    localStorage.setItem('lastBalanceUpdate', Date.now().toString());
  }

  private getFullImageUrl(path: string | null | undefined): string {
    if (!path) return '/assets/placeholder.png';

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    } else {
      return `${this.constants.API_ENDPOINT}${path.startsWith('/') ? path : '/' + path}`;
    }
  }

  // Helper methods สำหรับ template
  getDiscountAmount(): number {
    return this.total - this.finalAmount;
  }

  hasDiscount(): boolean {
    return this.discount !== null;
  }

  removeDiscount() {
    this.discount = null;
    this.discountCodeInput = '';
    this.finalAmount = this.total;
    this.clearDiscountError();
  }

  // คำนวณส่วนลดตามประเภท
  calculateDiscountAmount(): number {
    if (!this.discount) return 0;

    if (this.discount.type === 'percent') {
      return (this.total * this.discount.value) / 100;
    } else if (this.discount.type === 'fixed') {
      return this.discount.value;
    }

    return 0;
  }

  // แสดงข้อความส่วนลด
  getDiscountText(): string {
    if (!this.discount) return '';

    if (this.discount.type === 'percent') {
      return `ลด ${this.discount.value}%`;
    } else if (this.discount.type === 'fixed') {
      return `ลด ${this.discount.value} บาท`;
    }

    return 'ส่วนลด';
  }
}