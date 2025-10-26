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
import { Subscription, interval } from 'rxjs';
import { Constants } from '../../config/constants';
import { Category } from '../../model/category';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
    HttpClientModule,
    RouterModule
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
  categories: Category[] = [];
  selectedCategory: string = '';

  private routerSubscription: Subscription = new Subscription();
  private balanceSubscription: Subscription = new Subscription();

  constructor(
    private router: Router,
    private http: HttpClient,
    private constants: Constants
  ) { }

  ngOnInit() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadCategories();
    this.loadUser();
    this.checkRoute(this.router.url);

    // ตรวจสอบการเปลี่ยนแปลงของ route
    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.checkRoute(event.urlAfterRedirects);
        // โหลด user ใหม่เมื่อเปลี่ยน route (เฉพาะบาง route)
        if (this.shouldReloadUser(event.urlAfterRedirects)) {
          this.loadUser();
        }
      }
    });

    // ตรวจสอบการเปลี่ยนแปลงของยอดเงินทุก 2 วินาที
    this.balanceSubscription = interval(2000).subscribe(() => {
      this.checkBalanceUpdate();
    });

    // ฟัง event จาก localStorage (วิธีที่ 2)
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  ngOnDestroy() {
    this.routerSubscription.unsubscribe();
    this.balanceSubscription.unsubscribe();
    window.removeEventListener('storage', this.handleStorageChange.bind(this));
  }

  get API_BASE(): string {
    return this.constants.API_ENDPOINT;
  }

  private checkRoute(url: string) {
    this.showSearch = url.startsWith('/shop');
  }

  private shouldReloadUser(url: string): boolean {
    // โหลด user ใหม่เมื่อกลับมาจากหน้า wallet หรือ checkout
    return url === '/shop' || url === '/profile' || url === '/';
  }

  /** ตรวจสอบการอัปเดตยอดเงินจาก localStorage */
  private checkBalanceUpdate() {
    const lastBalanceUpdate = localStorage.getItem('lastBalanceUpdate');
    if (lastBalanceUpdate) {
      const updateTime = parseInt(lastBalanceUpdate);
      const currentTime = Date.now();

      // ถ้ามีการอัปเดตภายใน 10 วินาทีที่ผ่านมา ให้โหลด user ใหม่
      if (currentTime - updateTime < 10000) {
        this.loadUser();
        // ลบ flag เพื่อไม่ให้โหลดซ้ำ
        localStorage.removeItem('lastBalanceUpdate');
      }
    }
  }

  /** จัดการการเปลี่ยนแปลงใน localStorage */
  private handleStorageChange(event: StorageEvent) {
    if (event.key === 'lastBalanceUpdate' && event.newValue) {
      this.loadUser();
    }
  }

  /** โหลดข้อมูลผู้ใช้ */
  loadUser() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<any>(`${this.API_BASE}/profile`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    }).subscribe({
      next: (res) => {
        console.log('User data loaded:', res);

        const userData = res.user || res;
        this.user = {
          ...userData,
          userBalance: userData.wallet_balance || userData.balance || 0
        };

        // อัปเดต localStorage ด้วยข้อมูลล่าสุด
        this.updateLocalStorage(userData);

        this.loadCart();
      },
      error: (err) => {
        console.error('Failed to load user:', err);
        if (err.status === 401) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  /** อัปเดตข้อมูลใน localStorage */
  private updateLocalStorage(userData: any) {
    try {
      const storedUser = localStorage.getItem('user');
      let currentUser = storedUser ? JSON.parse(storedUser) : {};

      // อัปเดตเฉพาะข้อมูลที่สำคัญ
      const updatedUser = {
        ...currentUser,
        id: userData.id || currentUser.id,
        username: userData.username || currentUser.username,
        email: userData.email || currentUser.email,
        wallet_balance: userData.wallet_balance || userData.balance || currentUser.wallet_balance,
        avatar_url: userData.avatar_url || currentUser.avatar_url,
        role: userData.role || currentUser.role
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating localStorage:', error);
    }
  }

  /** โหลดข้อมูลตะกร้า */
  loadCart() {
    if (!this.user) return;

    const token = localStorage.getItem('token');
    this.http.get<any>(`${this.API_BASE}/cart`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    }).subscribe({
      next: (data) => {
        // ตรวจสอบว่า data เป็น array หรือไม่
        const cartItems = Array.isArray(data) ? data : (data.items || data.cart || []);
        this.cart = cartItems.map((item: any) => ({
          gameId: item.game_id || item.id,
          name: item.name || item.title,
          price: Number(item.price) || 0,
          quantity: item.quantity || 1,
          image_url: this.getFullImageUrl(item.image_url)
        }));
      },
      error: (err) => console.error('Failed to load cart:', err)
    });
  }

  // Navigation methods
  goToHome() {
    this.router.navigate(['/shop']);
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  goToWallet() {
    this.router.navigate(['/wallet']);
  }

  goToLibrary() {
    this.router.navigate(['/library']);
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  // Cart methods
  addToCart(gameId: number) {
    if (!this.user) return;

    this.http.post(`${this.API_BASE}/cart/add`,
      { game_id: gameId },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        withCredentials: true
      }
    ).subscribe({
      next: () => this.loadCart(),
      error: (err) => console.error('Failed to add to cart:', err)
    });
  }

  removeFromCart(gameId: number) {
    if (!this.user) return;

    this.http.post(`${this.API_BASE}/cart/remove`,
      { game_id: gameId },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        withCredentials: true
      }
    ).subscribe({
      next: () => this.loadCart(),
      error: (err) => console.error('Failed to remove from cart:', err)
    });
  }

  clearCart() {
    if (!this.user) return;

    this.http.post(`${this.API_BASE}/cart/clear`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        withCredentials: true
      }
    ).subscribe({
      next: () => this.loadCart(),
      error: (err) => console.error('Failed to clear cart:', err)
    });
  }

  getCartCount(): number {
    return this.cart.reduce((acc, item) => acc + item.quantity, 0);
  }

  getCartTotal(): number {
    return this.cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }

  getAvatarUrl(): string {
    if (!this.user?.avatar_url) return '/assets/profile-placeholder.png';

    let path = this.user.avatar_url;
    if (!path.startsWith('http://') && !path.startsWith('https://')) {
      path = `${this.constants.API_ENDPOINT}${path.startsWith('/') ? path : '/' + path}`;
    }
    return path;
  }

  getFullImageUrl(path: string | null | undefined): string {
    if (!path) return '/assets/placeholder.png';
    if (!path.startsWith('http://') && !path.startsWith('https://')) {
      return `${this.API_BASE}${path.startsWith('/') ? path : '/' + path}`;
    }
    return path;
  }

  loadCategories() {
    this.http.get<any>(`${this.API_BASE}/categories`, {
      withCredentials: true
    }).subscribe({
      next: (data) => {
        this.categories = Array.isArray(data) ? data : [];
      },
      error: (err) => console.error('Failed to load categories:', err)
    });
  }

  clearCategory() {
    this.selectedCategory = '';
    this.onSearch();
  }

  // Search methods
  onSearch() {
    const query = this.query.trim();

    // ถ้าไม่มีทั้งคำค้นหาและประเภท ให้ล้างผลลัพธ์
    if (!query && !this.selectedCategory) {
      this.results = [];
      return;
    }

    // สร้าง URL parameters
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (this.selectedCategory) params.append('category', this.selectedCategory);

    console.log('🔍 Searching with params:', params.toString());

    // ใช้ endpoint /search ที่รองรับทั้งชื่อและประเภท
    this.http.get<GameDetail[]>(`${this.API_BASE}/search?${params.toString()}`, {
      withCredentials: true
    }).subscribe({
      next: (data) => {
        const games = Array.isArray(data) ? data : [];
        console.log('✅ Search results:', games.length, 'games found');

        this.results = games.map((game: GameDetail) => ({
          ...game,
          image_url: this.getFullImageUrl(game.image_url),
          // ใช้ category_name ตาม interface
          category_name: game.category_name || 'Unknown'
        }));
      },
      error: (err) => {
        console.error('❌ Search failed:', err);
        // Fallback: ถ้า search endpoint ไม่ทำงาน ให้ใช้ games endpoint
        this.fallbackSearch(query);
      }
    });
  }

  /** Fallback search ถ้า endpoint /search ไม่ทำงาน */
  private fallbackSearch(query: string) {
    this.http.get<GameDetail[]>(`${this.API_BASE}/games`, {
      withCredentials: true
    }).subscribe({
      next: (data) => {
        const games = Array.isArray(data) ? data : [];
        const queryLower = query.toLowerCase();

        this.results = games
          .filter((game: GameDetail) => 
            game.name?.toLowerCase().includes(queryLower) || 
            game.category_name?.toLowerCase().includes(queryLower)
          )
          .map((game: GameDetail) => ({
              ...game,
              image_url: this.getFullImageUrl(game.image_url),
            category_name: game.category_name || 'Unknown'
          }));
      },
      error: (err) => console.error('Fallback search also failed:', err)
    });
  }

  /** ล้างการค้นหา */
  clearSearch() {
    this.results = [];
    this.query = '';
    this.selectedCategory = '';
  }

  goToGameDetail(gameId: number) {
    this.router.navigate(['/game', gameId]);
    this.results = [];
    this.query = '';
  }

  goToCheckout() {
    this.router.navigate(['/checkout']);
  }

  // Get user balance for display
  getUserBalance(): number {
    return this.user?.wallet_balance || this.user?.wallet_balance || 0;
  }
}