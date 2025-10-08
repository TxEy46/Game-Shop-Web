import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { Header } from "../header/header";
import { GameDetail } from '../../model/game';
import { Constants } from '../../config/constants';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, HttpClientModule, MatCardModule, MatButtonModule, Header],
  templateUrl: './game.html',
  styleUrls: ['./game.scss']
})
export class Game implements OnInit {
  game: GameDetail | null = null;
  private gameId: number = 0;
  private userId: number | null = null;
  inLibrary: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private constants: Constants
  ) { }

  ngOnInit() {
    // ตรวจสอบ token แทนการตรวจสอบ user จาก localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    // โหลดข้อมูลผู้ใช้จาก localStorage หรือ API
    this.loadUser();

    // โหลด game ตาม param
    this.route.params.subscribe(params => {
      this.gameId = +params['id'];
      this.loadGame();
    });
  }

  private loadUser() {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedUser && storedUser !== 'undefined') {
      try {
        const user = JSON.parse(storedUser);
        this.userId = user.id;
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.loadUserFromAPI();
      }
    } else {
      this.loadUserFromAPI();
    }
  }

  private loadUserFromAPI() {
    const token = localStorage.getItem('token');
    this.http.get<any>(`${this.constants.API_ENDPOINT}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true
    }).subscribe({
      next: (res) => {
        const userData = res.user || res;
        this.userId = userData.id;
        // บันทึก user ข้อมูลลง localStorage
        localStorage.setItem('user', JSON.stringify(userData));
      },
      error: (err) => {
        console.error('Failed to load user:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.router.navigate(['/login']);
      }
    });
  }

  private resolveImageURL(url?: string | null): string {
    if (!url) return '/assets/placeholder.png';
    return url.startsWith('http') ? url : `${this.constants.API_ENDPOINT}${url}`;
  }

  loadGame() {
    const url = `${this.constants.API_ENDPOINT}/games/${this.gameId}`;
    this.http.get<any>(url, {
      withCredentials: true
    }).subscribe({
      next: (data) => {
        console.log('Game data received:', data); // Debug log
        
        const gameData = data.game || data;
        
        // แก้ไข field mapping ให้ตรงกับ API response
        this.game = {
          id: gameData.id,
          name: gameData.name,
          price: gameData.price,
          category_id: gameData.category_id,
          image_url: this.resolveImageURL(gameData.image_url),
          description: gameData.description,
          release_date: gameData.release_date,
          // ใช้ category จาก API response (ซึ่งเป็น field จริง)
          category_name: gameData.category || gameData.category_name,
          sales_count: gameData.sales_count,
          total_sales: gameData.total_sales
        };
        
        console.log('Processed game:', this.game); // Debug log
        this.checkInLibrary();
      },
      error: (err) => console.error('Error loading game:', err)
    });
  }

  checkInLibrary() {
    if (!this.userId) return;
    const url = `${this.constants.API_ENDPOINT}/library`;

    this.http.get<any>(url, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      withCredentials: true
    }).subscribe({
      next: (data) => {
        const libraryGames = Array.isArray(data) ? data : (data.games || data.library || []);
        this.inLibrary = libraryGames.some((g: any) => 
          g.id === this.gameId || g.game_id === this.gameId
        );
      },
      error: (err) => console.error('Error checking library:', err)
    });
  }

  addToCart() {
    if (!this.userId) {
      alert("กรุณาเข้าสู่ระบบก่อนเพิ่มเกมลงตะกร้า");
      this.router.navigate(['/login']);
      return;
    }

    if (!this.game) return;

    if (this.inLibrary) {
      alert("คุณมีเกมนี้อยู่แล้วในคลัง");
      return;
    }

    const token = localStorage.getItem('token');
    
    this.http.get<any>(`${this.constants.API_ENDPOINT}/cart`, {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true
    }).subscribe({
      next: (data) => {
        const cartItems = Array.isArray(data) ? data : (data.items || data.cart || []);
        const inCart = cartItems.some((item: any) => 
          item.game_id === this.game!.id || item.id === this.game!.id
        );
        if (inCart) {
          alert("เกมนี้อยู่ในตะกร้าแล้ว");
          return;
        }

        this.http.post(`${this.constants.API_ENDPOINT}/cart/add`, 
          { game_id: this.game!.id },
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          }
        ).subscribe({
          next: () => {
            // เมื่อเพิ่มลงตะกร้าเสร็จ → ไปหน้า shop
            this.router.navigate(['/shop']);
          },
          error: () => alert("ไม่สามารถเพิ่มเกมลงตะกร้าได้")
        });
      },
      error: () => alert("ไม่สามารถดึงข้อมูลตะกร้าได้")
    });
  }

  goToLibrary() {
    this.router.navigate(['/library']);
  }

  // เพิ่ม method สำหรับซื้อเกมโดยตรง (ถ้ามี)
  buyNow() {
    if (!this.userId) {
      alert("กรุณาเข้าสู่ระบบก่อนซื้อเกม");
      this.router.navigate(['/login']);
      return;
    }

    if (!this.game) return;

    if (this.inLibrary) {
      alert("คุณมีเกมนี้อยู่แล้วในคลัง");
      this.router.navigate(['/library']);
      return;
    }

    const token = localStorage.getItem('token');
    
    // ซื้อเกมโดยตรง (ถ้ามี API นี้)
    this.http.post(`${this.constants.API_ENDPOINT}/checkout/direct`, 
      { game_id: this.game.id },
      {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      }
    ).subscribe({
      next: () => {
        alert(`ซื้อ ${this.game?.name} สำเร็จ!`);
        this.router.navigate(['/shop']);
      },
      error: (err) => {
        console.error('Purchase error:', err);
        alert("ไม่สามารถซื้อเกมได้ กรุณาตรวจสอบยอดเงินในกระเป๋า");
      }
    });
  }

  // เพิ่ม helper method สำหรับแสดงประเภทเกม
  getCategoryName(): string {
    if (!this.game) return 'ไม่ระบุ';
    return this.game.category_name || 'ไม่ระบุ';
  }
}