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
  ranking: GameDetail[] = [];

  slides = [
    { image_url: '/assets/rockstargames-website-wide-gtavi-banner.png', title: 'เกมใหม่มาแรง!' },
    { image_url: '/assets/dgb44ph-cce958cb-7efe-4505-b194-9ad14b0ae3a0.png', title: 'โปรโมชั่นลดราคา' },
    { image_url: '/assets/3364472525_preview_Gaming-Editions_Wukong_Hero_maxres.png', title: 'แนะนำเกมแอดมิน' }
  ];
  currentSlide = 0;

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit(): void {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      alert('กรุณาเข้าสู่ระบบก่อนเข้า Shop');
      this.router.navigate(['/']); // redirect ไปหน้า home หรือ login
      return;
    }

    this.user = JSON.parse(storedUser);
    const storedBalance = localStorage.getItem('balance');
    if (storedBalance) this.userBalance = Number(storedBalance);

    this.loadGames();
    this.loadRanking();

    if (this.user?.id) {
      this.loadUserProfile(this.user.id);
    }

    setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    }, 3000);
  }

  loadRanking(): void {
    this.http.get<GameDetail[]>(`http://localhost:3000/ranking/top`).subscribe({
      next: (data) => {
        this.ranking = data.map(game => ({
          ...game,
          image_url: game.image_url ? `http://localhost:3000${game.image_url}` : '/assets/placeholder.png'
        }));
      },
      error: (err) => console.error("Error loading ranking:", err)
    });
  }

  loadGames(): void {
    const url = 'http://localhost:3000/game';
    this.http.get<GameDetail[]>(url).subscribe({
      next: (data) => {
        this.games = data.map(game => ({
          ...game,
          image_url: game.image_url
            ? `http://localhost:3000${game.image_url}`
            : '/assets/placeholder.png'
        }));
      },
      error: (err) => console.error('Error loading games:', err),
    });
  }

  loadUserProfile(userId: number): void {
    const url = `http://localhost:3000/user/${userId}`;
    this.http.get<{ user: User, balance: number }>(url).subscribe({
      next: (data) => {
        this.user = data.user;
        this.userBalance = data.balance || 0;
        localStorage.setItem('user', JSON.stringify(this.user));
        localStorage.setItem('balance', this.userBalance.toString());
      },
      error: (err) => console.error('Error loading user profile:', err),
    });
  }

  get avatarUrl(): string {
    return this.user?.avatar_url
      ? `http://localhost:3000${this.user.avatar_url}`
      : '/assets/profile-placeholder.png';
  }

  // เมธอดนำทาง
  goToProfile() {
    this.router.navigate(['/profile']);
  }

  goToWallet() {
    this.router.navigate(['/wallet']);
  }

  goToLibrary() {
    this.router.navigate(['/library']);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/']);
  }

  goToGameDetail(gameId: number) {
    this.router.navigate(['/game', gameId]);
  }
}
