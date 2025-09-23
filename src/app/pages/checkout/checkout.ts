import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartItem } from '../../model/cart';
import { DiscountCode } from '../../model/discountcode';
import { MatButtonModule } from '@angular/material/button';
import { Header } from "../header/header";

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

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit(): void {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      this.router.navigate(['/']);
      return;
    }

    this.user = JSON.parse(storedUser);
    this.loadCart();
  }

  loadCart() {
    this.http.get<any[]>(`http://localhost:3000/cart/${this.user.id}`).subscribe({
      next: data => {
        this.cart = data.map(item => ({
          gameId: item.game_id,
          name: item.name,
          price: Number(item.price),
          quantity: item.quantity,
          image_url: item.image_url ? `http://localhost:3000${item.image_url}` : '/assets/placeholder.png'
        }));
        this.calculateTotal();
      },
      error: err => console.error(err)
    });
  }

  calculateTotal() {
    this.total = this.cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    // ป้องกัน undefined
    this.finalAmount = this.discount?.finalAmount ?? this.total;
  }

  applyDiscount() {
    if (!this.discountCodeInput.trim()) return alert("กรุณาใส่โค้ดส่วนลด");

    this.http.get<DiscountCode[]>(`http://localhost:3000/discount_codes/${this.discountCodeInput}?total=${this.total}&user_id=${this.user.id}`)
      .subscribe({
        next: res => {
          if (!res.length) {
            alert("โค้ดส่วนลดไม่ถูกต้อง/หมดอายุ");
            this.discount = null;
            this.finalAmount = this.total;
            return;
          }

          const discount = res[0];

          // ตรวจสอบยอดขั้นต่ำ
          if (this.total < Number(discount.min_total)) {
            alert(`ยอดรวมไม่ถึง ${discount.min_total} บาทสำหรับโค้ดนี้`);
            this.discount = null;
            this.finalAmount = this.total;
            return;
          }

          // ตรวจสอบว่าใช้แล้วสำหรับผู้ใช้คนนี้
          if (discount.single_use_per_user && (discount as any).used_by_user) {
            alert(`โค้ด ${discount.code} ถูกใช้ไปแล้ว`);
            this.discount = null;
            this.finalAmount = this.total;
            return;
          }

          this.discount = discount;
          this.finalAmount = discount.finalAmount ?? this.total;
          alert(`ใช้โค้ด ${discount.code} สำเร็จ! ยอดสุดท้าย: ${this.finalAmount} บาท`);
        },
        error: err => {
          console.error(err);
          alert("เกิดข้อผิดพลาดในการตรวจสอบโค้ดส่วนลด");
          this.discount = null;
          this.finalAmount = this.total;
        }
      });
  }

  placeOrder() {
    if (!this.cart.length) return alert("ตะกร้าว่าง");

    const game_ids = this.cart.map(i => i.gameId);
    const payload = {
      user_id: this.user.id,
      game_ids,
      discount_code_id: this.discount?.id || null
    };

    this.http.post(`http://localhost:3000/purchase`, payload).subscribe({
      next: (res: any) => {
        alert(`ซื้อสำเร็จ! ต้องจ่าย ${res.finalAmount} บาท`);
        this.cart = [];
        localStorage.removeItem('cart');
        this.router.navigate(['/library']);
      },
      error: err => {
        console.error("ซื้อไม่สำเร็จ:", err);
        if (err.error && err.error.error) {
          alert("ซื้อไม่สำเร็จ: ยอดเงินไม่เพียงพอ/โค้ดส่วนลดมีปัญหา");
        } else {
          alert("ซื้อไม่สำเร็จ: ตรวจสอบ console");
        }
      }
    });
  }
}
