import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { GameDetail } from '../../model/game';
import { User } from '../../model/user';
import { Header } from '../header/header';
import { MatMenuModule } from "@angular/material/menu";
import { Constants } from '../../config/constants';
// ⚠️ ลบการ import AuthService

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    HttpClientModule,
    Header,
    MatMenuModule
  ],
  templateUrl: './shop.html',
  styleUrls: ['./shop.scss'],
})
export class Shop implements OnInit {
  games: GameDetail[] = [];
  user: User | null = null;
  userBalance: number = 0;
  ranking: any[] = [];
  
  slides = [
    { image_url: '/assets/rockstargames-website-wide-gtavi-banner.png', title: 'เกมใหม่มาแรง!' },
    { image_url: '/assets/dgb44ph-cce958cb-7efe-4505-b194-9ad14b0ae3a0.png', title: 'โปรโมชั่นลดราคา' },
    { image_url: '/assets/3364472525_preview_Gaming-Editions_Wukong_Hero_maxres.png', title: 'แนะนำเกมแอดมิน' }
  ];
  currentSlide = 0;
  isLoading = true;

  constructor(
    private http: HttpClient,
    private router: Router,
    private constants: Constants
    // ⚠️ ลบ AuthService จาก constructor
  ) { }

  ngOnInit(): void {
    // ⚠️ ลบการตรวจสอบซ้ำซ้อน เพราะมี AuthGuard ดูแลแล้ว
    // if (!this.authService.isLoggedIn()) {
    //   this.router.navigate(['/login']);
    //   return;
    // }

    this.loadUserProfile();
    this.loadGames();
    this.loadRanking();

    setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    }, 3000);
  }

  private resolveImageURL(url?: string | null): string {
    if (!url) return '/assets/placeholder.png';
    return url.startsWith('http') ? url : `${this.constants.API_ENDPOINT}${url}`;
  }

  private loadUserProfile(): void {
    const token = localStorage.getItem('token');
    
    this.http.get<any>(`${this.constants.API_ENDPOINT}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true
    }).subscribe({
      next: (data) => {
        this.user = data.user || data;
        this.loadWallet();
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
        this.router.navigate(['/login']);
      }
    });
  }

  private loadWallet(): void {
    const token = localStorage.getItem('token');
    
    this.http.get<{ balance: number }>(`${this.constants.API_ENDPOINT}/wallet`, {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true
    }).subscribe({
      next: (data) => {
        this.userBalance = data.balance || 0;
      },
      error: (error) => {
        console.error('Error loading wallet:', error);
      }
    });
  }

  private loadRanking(): void {
    this.http.get<any[]>(`${this.constants.API_ENDPOINT}/ranking`, {
      withCredentials: true
    }).subscribe({
      next: (data) => {
        this.ranking = data.map((game: any) => ({
          ...game,
          image_url: this.resolveImageURL(game.image_url)
        }));
      },
      error: (error) => {
        console.error("Error loading ranking:", error);
      }
    });
  }

  private loadGames(): void {
    this.http.get<GameDetail[]>(`${this.constants.API_ENDPOINT}/games`, {
      withCredentials: true
    }).subscribe({
      next: (data) => {
        this.games = data.map((game: GameDetail) => ({
          ...game,
          image_url: this.resolveImageURL(game.image_url)
        }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading games:', error);
        this.isLoading = false;
      }
    });
  }

  get avatarUrl(): string {
    return this.resolveImageURL(this.user?.avatar_url || null);
  }

  // Navigation methods
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
    // ⚠️ แก้ไข method logout ไม่ให้ใช้ AuthService
    localStorage.clear();
    this.router.navigate(['/login']);
  }
  
  goToGameDetail(gameId: number) { 
    this.router.navigate(['/game', gameId]); 
  }

  addToCart(gameId: number) {
    const token = localStorage.getItem('token');
    
    this.http.post(`${this.constants.API_ENDPOINT}/cart/add`, 
      { game_id: gameId },
      {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      }
    ).subscribe({
      next: () => {
        console.log('Added to cart:', gameId);
      },
      error: (error) => {
        console.error('Error adding to cart:', error);
      }
    });
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  prevSlide() {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
  }

  goToSlide(index: number) {
    this.currentSlide = index;
  }
}