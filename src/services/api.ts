const API_BASE = "http://localhost:5000/api";

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("campus_copilot_token", token);
    } else {
      localStorage.removeItem("campus_copilot_token");
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem("campus_copilot_token");
    }
    return this.token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken();

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (options.body instanceof FormData) {
      delete (config.headers as any)["Content-Type"];
    }

    const response = await fetch(url, config);
    if (!response.ok) {
      let errData = { error: `HTTP ${response.status}` };
      try {
        errData = await response.json();
      } catch {}
      throw new Error(errData.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async login(email: string, password: string) {
    const res: any = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.success && res.token) this.setToken(res.token);
    return res;
  }

  async verifyToken() {
    return this.request("/auth/verify");
  }

  async logout() {
    this.setToken(null);
  }

  async askQuestion(question: string) {
    return this.request("/chat/ask", {
      method: "POST",
      body: JSON.stringify({ question }),
    });
  }

  async uploadAudio(audioFile: File, language: string = "en-US") {
    const form = new FormData();
    form.append("audio", audioFile);
    form.append("language", language);
    return this.request("/chat/voice-to-text", {
      method: "POST",
      body: form,
    });
  }

  async getChatHistory() {
    return this.request("/chat/history");
  }

  async getUsers() {
    return this.request("/admin/users");
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) {
    return this.request("/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async uploadPDF(file: File) {
    const form = new FormData();
    form.append("file", file);
    return this.request("/admin/upload-pdf", {
      method: "POST",
      body: form,
    });
  }

  async getPDFs() {
    return this.request("/admin/pdfs");
  }

  async healthCheck() {
    return this.request("/health");
  }
}

export default new ApiService();
