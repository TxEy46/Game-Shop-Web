import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Constants {
  public readonly API_ENDPOINT: string = 'http://192.168.56.1:8080';
}