import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { User } from '../../model/user';
import { GameDetail } from '../../model/game';
import { CartItem } from '../../model/cart';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, MatToolbarModule, MatButtonModule, MatMenuModule, HttpClientModule, RouterModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class Header implements OnInit, OnDestroy {
  user: User | null = null;
  query: string = '';
  results: GameDetail[] = [];
  cart: CartItem[] = [];
  showSearch: boolean = false;
  walletIntervalSub!: Subscription; // <-- เพิ่ม property

  constructor(private router: Router, private http: HttpClient) { }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      this.user = JSON.parse(storedUser);
      this.loadBalance();
      this.loadCart();

      // Polling wallet every 5 seconds
      this.walletIntervalSub = interval(1000).subscribe(() => this.loadBalance());
    }

    // ตรวจสอบ route ปัจจุบันเพื่อแสดง search bar
    this.checkRoute(this.router.url);
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.checkRoute(event.urlAfterRedirects);
      }
    });
  }

  ngOnDestroy() {
    if (this.walletIntervalSub) {
      this.walletIntervalSub.unsubscribe(); // ป้องกัน memory leak
    }
  }

  private checkRoute(url: string) {
    this.showSearch = url.startsWith('/shop');
  }

  loadBalance() {
    if (!this.user) return;
    this.http.get<{ wallet_balance: number }>(`http://localhost:3000/wallet/${this.user.id}`)
      .subscribe({
        next: res => { if (this.user) this.user.userBalance = res.wallet_balance; },
        error: err => console.error(err)
      });
  }
  // เมนู
  goToProfile() { this.router.navigate(['/profile']); }
  goToWallet() { this.router.navigate(['/wallet']); }
  goToLibrary() { this.router.navigate(['/library']); }
  logout() {
    localStorage.clear();
    this.router.navigate(['/']);
  }

  // Search
  onSearch() {
    const queryLower = this.query.trim().toLowerCase();
    if (!queryLower) {
      this.results = [];
      return;
    }

    this.http.get<GameDetail[]>('http://localhost:3000/game').subscribe({
      next: games => {
        this.results = games
          .filter(game => game.name.toLowerCase().includes(queryLower))
          .map(game => ({
            ...game,
            image_url: game.image_url ? `http://localhost:3000${game.image_url}` : '/assets/placeholder.png'
          }));
      },
      error: err => console.error(err)
    });
  }

  goToGameDetail(gameId: number) {
    this.router.navigate(['/game', gameId]);
    this.results = [];
    this.query = '';
  }

  // Cart
  loadCart() {
    if (!this.user) return;
    this.http.get<any[]>(`http://localhost:3000/cart/${this.user.id}`).subscribe({
      next: data => {
        this.cart = data.map(item => ({
          gameId: item.game_id,
          name: item.name,
          price: Number(item.price),
          quantity: item.quantity,
          image_url: `http://localhost:3000${item.image_url}`
        }));
      },
      error: err => console.error(err)
    });
  }

  addToCart(game: GameDetail) {
    if (!this.user) return alert("ต้อง login ก่อน");
    this.http.post(`http://localhost:3000/cart/add`, { user_id: this.user.id, game_id: game.id, quantity: 1 })
      .subscribe({ next: () => this.loadCart() });
  }

  removeFromCart(gameId: number) {
    if (!this.user) return;
    this.http.post(`http://localhost:3000/cart/remove`, {
      user_id: this.user.id,
      game_id: gameId
    }).subscribe({
      next: () => this.loadCart(),
      error: err => console.error("Error removing from cart:", err)
    });
  }

  clearCart() {
    if (!this.user) return;
    this.http.post(`http://localhost:3000/cart/clear`, { user_id: this.user.id })
      .subscribe({ next: () => this.loadCart() });
  }

  getCartCount() {
    return this.cart.reduce((acc, item) => acc + item.quantity, 0);
  }

  getCartTotal() {
    return this.cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }

  goToCheckout() {
    this.router.navigate(['/checkout']);
  }

  goToHome() {
    this.router.navigate(['/shop']); // หรือ '/' ขึ้นกับ route หน้าหลักของคุณ
  }

}
