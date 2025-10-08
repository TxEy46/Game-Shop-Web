// guards/admin.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'admin') {
          // ตรวจสอบ token expiration ด้วย
          const payload = JSON.parse(atob(token.split('.')[1]));
          const isExpired = payload.exp < Date.now() / 1000;
          
          if (!isExpired) {
            return true;
          }
        }
      } catch {
        // ถ้า parse ไม่ได้
      }
    }
    
    this.clearStorage();
    this.router.navigate(['/login']);
    return false;
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