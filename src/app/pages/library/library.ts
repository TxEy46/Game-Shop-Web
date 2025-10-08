import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule, Router } from '@angular/router';
import { GameDetail } from '../../model/game';
import { Header } from "../header/header";
import { Constants } from '../../config/constants';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, HttpClientModule, MatCardModule, MatButtonModule, RouterModule, Header],
  templateUrl: './library.html',
  styleUrls: ['./library.scss']
})
export class Library implements OnInit {
  purchasedGames: GameDetail[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(
    private http: HttpClient, 
    private router: Router,
    private constants: Constants
  ) { }

  ngOnInit() {
    this.loadPurchasedGames();
  }

  loadPurchasedGames() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.errorMessage = 'กรุณาเข้าสู่ระบบก่อน';
      this.isLoading = false;
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // เปลี่ยน type เป็น any เพราะ response มีโครงสร้างใหม่
    this.http.get<any>(`${this.constants.API_ENDPOINT}/library`, { 
      headers,
      withCredentials: true 
    })
    .subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Library response:', response);
        
        // ดึงข้อมูล games จาก response
        const games = response.games || response || [];
        
        this.purchasedGames = games.map((game: any) => ({
          id: game.id,
          name: game.name,
          price: game.price,
          category_id: game.category_id,
          image_url: this.resolveImageUrl(game.image_url),
          description: game.description || 'ไม่มีคำอธิบาย',
          release_date: game.release_date,
          category_name: game.category || game.category_name || 'ทั่วไป',
          sales_count: game.sales_count || 0,
          total_sales: game.total_sales || 0,
          // เพิ่ม field purchased_at ถ้าต้องการใช้
          purchased_at: game.purchased_at
        }));
        
        console.log('Processed games:', this.purchasedGames);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error loading purchased games:', err);
        
        if (err.status === 401) {
          this.errorMessage = 'กรุณาเข้าสู่ระบบใหม่';
          this.router.navigate(['/login']);
        } else if (err.status === 404) {
          this.errorMessage = 'ไม่พบเกมในไลบรารี';
          this.purchasedGames = [];
        } else {
          this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดเกม';
        }
      }
    });
  }

  private resolveImageUrl(url: string | undefined): string {
    if (!url) return '/assets/placeholder.png';
    
    if (url.startsWith('http')) {
      return url;
    } else {
      return `${this.constants.API_ENDPOINT}${url.startsWith('/') ? url : '/' + url}`;
    }
  }

  playGame(gameId: number) {
    const game = this.purchasedGames.find(g => g.id === gameId);
    if (game) {
      alert(`🎮 กำลังเล่น: ${game.name}`);
      // ในอนาคตอาจเพิ่ม logic สำหรับเปิดเกมจริงๆ
    }
  }

  goToGamePage(gameId: number) {
    this.router.navigate(['/game', gameId]);
  }
}