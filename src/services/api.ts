const API_BASE = 'http://localhost:5000/api';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('campus_copilot_token', token);
    } else {
      localStorage.removeItem('campus_copilot_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('campus_copilot_token');
    }
    return this.token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    // Remove Content-Type for FormData
    if (options.body instanceof FormData) {
      delete (config.headers as any)['Content-Type'];
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async verifyToken() {
    return this.request('/auth/verify');
  }

  async logout() {
    this.setToken(null);
  }

  // Chat methods
  async askQuestion(question: string) {
    return this.request('/chat/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  async uploadAudio(audioFile: File) {
    const formData = new FormData();
    formData.append('audio', audioFile);
    
    return this.request('/chat/voice-to-text', {
      method: 'POST',
      body: formData,
    });
  }

  async getChatHistory() {
    return this.request('/chat/history');
  }

  // Admin methods
  async getUsers() {
    return this.request('/admin/users');
  }

  async createUser(userData: { name: string; email: string; password: string; role: string }) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async uploadPDF(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request('/admin/upload-pdf', {
      method: 'POST',
      body: formData,
    });
  }

  async getPDFs() {
    return this.request('/admin/pdfs');
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

export default new ApiService();