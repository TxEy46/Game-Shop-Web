// guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem('token');
    if (token) {
      // ตรวจสอบว่า token ยังไม่หมดอายุ (ถ้าเป็น JWT)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = payload.exp < Date.now() / 1000;
        
        if (isExpired) {
          this.clearStorage();
          this.router.navigate(['/login']);
          return false;
        }
        
        return true;
      } catch {
        // ถ้า token ไม่ถูก format
        this.clearStorage();
        this.router.navigate(['/login']);
        return false;
      }
    } else {
      this.router.navigate(['/login']);
      return false;
    }
  }

  private clearStorage(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
  }
}