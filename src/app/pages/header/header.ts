import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
import { Constants } from '../../config/constants';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatToolbarModule, MatButtonModule,
    MatMenuModule, HttpClientModule, RouterModule
  ],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class Header implements OnInit, OnDestroy {
  user: User | null = null;
  query: string = '';
  results: GameDetail[] = [];
  cart: CartItem[] = [];
  showSearch: boolean = false;
  walletIntervalSub!: Subscription;

  constructor(private router: Router, private http: HttpClient, private constants: Constants) { }

  get API_BASE(): string {
    return this.constants.API_ENDPOINT;
  }

  ngOnInit() {
    const token = localStorage.getItem('token');
    if (token) {
      const headers = { Authorization: `Bearer ${token}` };

      this.http.get<any>(`${this.constants.API_ENDPOINT}/me`, { headers, withCredentials: true })
        .subscribe({
          next: (res) => {
            this.user = {
              ...res,
              userBalance: res.wallet_balance ?? 0,
            };
            this.loadCart();
          },
          error: (err) => console.error('Failed to load user profile:', err)
        });
    }

    // ✅ ตรวจสอบ route ตอนเริ่ม และ subscribe events เพื่อ update showSearch
    this.checkRoute(this.router.url);
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.checkRoute(event.urlAfterRedirects);
      }
    });
  }

  ngOnDestroy() {
    this.walletIntervalSub?.unsubscribe();
  }

  private checkRoute(url: string) {
    this.showSearch = url.startsWith('/shop');
  }

  /** โหลด user จาก API */
  loadUser() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<any>(`${this.API_BASE}/me`, { headers }).subscribe({
      next: res => {
        this.user = { ...res, userBalance: res.wallet_balance ?? 0 };
        this.loadCart();
      },
      error: err => console.error('❌ Failed to load user:', err)
    });
  }

  loadBalance() {
    if (!this.user) return;
    this.http.get<{ wallet_balance: number }>(`${this.API_BASE}/wallet/${this.user.id}`)
      .subscribe({
        next: res => { if (this.user) this.user.userBalance = res.wallet_balance ?? 0; },
        error: err => console.error(err)
      });
  }

  loadCart() {
    if (!this.user) return;
    this.http.get<any[]>(`${this.API_BASE}/cart/${this.user.id}`).subscribe({
      next: data => {
        this.cart = data.map(item => ({
          gameId: item.game_id,
          name: item.name,
          price: Number(item.price),
          quantity: item.quantity,
          image_url: this.getFullImageUrl(item.image_url)
        }));
      },
      error: err => console.error(err)
    });
  }

  // Navigation
  goToHome() { this.router.navigate(['/shop']); }
  goToProfile() { this.router.navigate(['/profile']); }
  goToWallet() { this.router.navigate(['/wallet']); }
  goToLibrary() { this.router.navigate(['/library']); }
  logout() { localStorage.clear(); this.router.navigate(['/']); }

  // Search
  onSearch() {
    const queryLower = this.query.trim().toLowerCase();
    if (!queryLower) { this.results = []; return; }

    this.http.get<GameDetail[]>(`${this.API_BASE}/game`).subscribe({
      next: games => {
        this.results = games
          .filter(game => game.name.toLowerCase().includes(queryLower))
          .map(game => ({ ...game, image_url: this.getFullImageUrl(game.image_url) }));
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
  addToCart(game: GameDetail) {
    if (!this.user) return alert("ต้อง login ก่อน");
    this.http.post(`${this.API_BASE}/cart/add`, { user_id: this.user.id, game_id: game.id, quantity: 1 })
      .subscribe({ next: () => this.loadCart() });
  }

  removeFromCart(gameId: number) {
    if (!this.user) return;
    this.http.post(`${this.API_BASE}/cart/remove`, { user_id: this.user.id, game_id: gameId })
      .subscribe({ next: () => this.loadCart() });
  }

  clearCart() {
    if (!this.user) return;
    this.http.post(`${this.API_BASE}/cart/clear`, { user_id: this.user.id })
      .subscribe({ next: () => this.loadCart() });
  }

  getCartCount() { return this.cart.reduce((acc, item) => acc + item.quantity, 0); }
  getCartTotal() { return this.cart.reduce((acc, item) => acc + item.price * item.quantity, 0); }
  goToCheckout() { this.router.navigate(['/checkout']); }

  /** ดึง URL avatar หรือ placeholder */
  getAvatarUrl(): string {
    if (!this.user) return '/assets/profile-placeholder.png';
    if (this.user.avatar_url) {
      let path = this.user.avatar_url;
      if (!path.startsWith('http://') && !path.startsWith('https://')) {
        if (!path.startsWith('/')) path = '/' + path;
        path = this.constants.API_ENDPOINT + path;
      }
      return path;
    }
    return '/assets/profile-placeholder.png';
  }


  getFullImageUrl(path: string | null | undefined): string {
    if (!path) return '/assets/placeholder.png';
    if (!path.startsWith('http://') && !path.startsWith('https://')) {
      if (!path.startsWith('/')) path = '/' + path;
      return `${this.API_BASE}${path}`;
    }
    return path;
  }
}
