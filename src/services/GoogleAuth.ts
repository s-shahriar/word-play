export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  accessToken: string;
}

export class GoogleAuth {
  private static readonly STORAGE_KEY = 'wordplay-google-user';
  private static readonly SCOPES = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.file'
  ].join(' ');

  private static tokenClient: any = null;
  private static gapiInited = false;
  private static gisInited = false;

  static async initialize(): Promise<void> {
    await this.initializeGapi();
    await this.initializeGis();
  }

  private static async initializeGapi(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        (window as any).gapi.load('client', async () => {
          try {
            await (window as any).gapi.client.init({
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            });
            this.gapiInited = true;
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  private static async initializeGis(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

        if (!clientId || clientId.includes('your_google_client_id')) {
          console.error('Please configure VITE_GOOGLE_CLIENT_ID in .env file');
          reject(new Error('Google Client ID not configured'));
          return;
        }

        this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: this.SCOPES,
          callback: '', // Will be set during login
        });
        this.gisInited = true;
        resolve();
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  static async login(): Promise<GoogleUser> {
    if (!this.gapiInited || !this.gisInited) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.tokenClient.callback = async (response: any) => {
        if (response.error) {
          console.error('OAuth error:', response);
          reject(new Error(response.error_description || response.error));
          return;
        }

        try {
          // Set the token in gapi client first
          (window as any).gapi.client.setToken({ access_token: response.access_token });

          // Get user info using gapi
          const userInfoResponse = await fetch(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            {
              headers: {
                Authorization: `Bearer ${response.access_token}`,
              },
            }
          );

          if (!userInfoResponse.ok) {
            const errorData = await userInfoResponse.json();
            console.error('User info fetch error:', errorData);
            throw new Error(errorData.error_description || 'Failed to get user info');
          }

          const userInfo = await userInfoResponse.json();

          const googleUser: GoogleUser = {
            id: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            accessToken: response.access_token,
          };

          this.saveUser(googleUser);

          resolve(googleUser);
        } catch (error) {
          console.error('Login error:', error);
          reject(error);
        }
      };

      // Request access token
      if ((window as any).gapi?.client?.getToken() === null) {
        // Prompt for consent if no token exists
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        // Skip display of account chooser and consent dialog
        this.tokenClient.requestAccessToken({ prompt: '' });
      }
    });
  }

  static logout(): void {
    const user = this.getCurrentUser();
    if (user?.accessToken) {
      (window as any).google.accounts.oauth2.revoke(user.accessToken, () => {
        console.log('Access token revoked');
      });
    }
    localStorage.removeItem(this.STORAGE_KEY);
    if ((window as any).gapi?.client) {
      (window as any).gapi.client.setToken(null);
    }
  }

  static getCurrentUser(): GoogleUser | null {
    const userData = localStorage.getItem(this.STORAGE_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  private static saveUser(user: GoogleUser): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
  }

  static async refreshTokenIfNeeded(): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) return;

    // Check if token is still valid by making a test API call
    try {
      await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      });
    } catch (error) {
      // Token expired, need to re-login
      this.logout();
      throw new Error('Session expired. Please login again.');
    }
  }
}
