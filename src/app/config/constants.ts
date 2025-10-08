// config/constants.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Constants {
  // ใช้ localhost แทน
  // readonly API_ENDPOINT = 'http://localhost:8080';
  
  // หรือถ้าใช้ใน network เดียวกัน
  readonly API_ENDPOINT = 'http://192.168.56.1:8080';
  
  // App Info
  readonly APP_NAME = 'Game Store';
  readonly APP_VERSION = '1.0.0';
  
  // Local Storage Keys
  readonly TOKEN_KEY = 'token';
  readonly USER_ID_KEY = 'user_id';
  readonly USERNAME_KEY = 'username';
  readonly EMAIL_KEY = 'email';
  readonly ROLE_KEY = 'role';
}