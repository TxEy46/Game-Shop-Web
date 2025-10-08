import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Constants } from '../../config/constants';
import { Header } from '../header/header';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role?: string; // ทำให้เป็น optional
  avatar_url?: string;
  wallet_balance: number;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
    Header
  ],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class Profile implements OnInit {
  user: UserProfile | null = null;
  isLoading: boolean = true;

  constructor(
    private http: HttpClient,
    private router: Router,
    private constants: Constants
  ) {}

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('❌ Token not found, please login again.');
      this.router.navigate(['/login']);
      return;
    }

    const headers = new HttpHeaders({ 
      Authorization: `Bearer ${token}` 
    });

    this.http.get<any>(`${this.constants.API_ENDPOINT}/profile`, { 
      headers, 
      withCredentials: true 
    })
      .subscribe({
        next: (res) => {
          console.log('🔍 Full profile response:', res);
          console.log('🔍 Response keys:', Object.keys(res));
          
          // ตรวจสอบ structure ของ response
          const userData = res.user || res;
          console.log('🔍 User data:', userData);
          
          // ตรวจสอบ role จาก localStorage ถ้า API ไม่ส่งมา
          const storedUser = localStorage.getItem('user');
          let userRole = 'user'; // default
          
          if (storedUser && storedUser !== 'undefined') {
            try {
              const localUser = JSON.parse(storedUser);
              userRole = localUser.role || 'user';
              console.log('🔍 Role from localStorage:', userRole);
            } catch (error) {
              console.error('Error parsing localStorage user:', error);
            }
          }

          this.user = {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            role: userData.role || userRole, // ใช้จาก API หรือ localStorage
            wallet_balance: userData.wallet_balance || userData.balance || 0,
            avatar_url: this.resolveImageUrl(userData.avatar_url)
          };

          console.log('🔍 Final user object:', this.user);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load profile:', err);
          alert('Failed to load profile.');
          this.isLoading = false;
        }
      });
  }

  private resolveImageUrl(url?: string | null): string {
    if (!url) return '/assets/profile-placeholder.png';
    
    if (url.startsWith('http')) {
      return url;
    } else {
      // แก้ไข path ให้ถูกต้อง
      return `${this.constants.API_ENDPOINT}${url.startsWith('/') ? url : '/' + url}`;
    }
  }

  editProfile() {
    this.router.navigate(['/edit']);
  }

  getAvatarUrl(): string {
    return this.user?.avatar_url || '/assets/profile-placeholder.png';
  }

  // สำหรับแสดงข้อมูลใน template
  getUserName(): string {
    return this.user?.username || 'ไม่พบข้อมูล';
  }

  getEmail(): string {
    return this.user?.email || 'ไม่พบข้อมูล';
  }

  getRole(): string {
    // ถ้าไม่มี role ใน user object ให้ลองดึงจาก localStorage
    if (!this.user?.role) {
      const storedUser = localStorage.getItem('user');
      if (storedUser && storedUser !== 'undefined') {
        try {
          const localUser = JSON.parse(storedUser);
          return localUser.role || 'user';
        } catch (error) {
          console.error('Error parsing localStorage user:', error);
        }
      }
    }
    return this.user?.role || 'user';
  }

  getBalance(): number {
    return this.user?.wallet_balance || 0;
  }

  // ตรวจสอบว่าเป็น admin หรือไม่
  isAdmin(): boolean {
    return this.getRole() === 'admin';
  }
}