export interface User {
  uid: string;
  email: string;
  name?: string;
  role: 'user' | 'admin';
  created_date?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface UploadedPDF {
  id: string;
  filename: string;
  original_name: string;
  upload_date: string;
  uploaded_by: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}