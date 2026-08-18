export interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  password?: string;
  createdAt?: string;
}

export interface ClientReport {
  _id: string;
  id?: string;
  userId: string;
  clientName: string;
  phone: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  address?: string | null;
  feedback: string;
  createdAt: string;
}

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}
