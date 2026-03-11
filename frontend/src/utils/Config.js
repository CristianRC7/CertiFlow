// Configuración de la API
const Config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost/certiflow/backend/src/',

  ENDPOINTS: {
    LOGIN: 'login.php',
    CERTIFICADOS: 'certificados.php',
    DOWNLOAD: 'download.php',
    ADMIN: 'admin.php',
  },

  getLoginUrl() { return this.API_BASE_URL + this.ENDPOINTS.LOGIN; },
  getCertificadosUrl() { return this.API_BASE_URL + this.ENDPOINTS.CERTIFICADOS; },
  getDownloadUrl() { return this.API_BASE_URL + this.ENDPOINTS.DOWNLOAD; },
  getAdminUrl() { return this.API_BASE_URL + this.ENDPOINTS.ADMIN; },
  getCertificatesImageUrl(filename) { return this.API_BASE_URL + 'certificates/' + filename; },
};

export default Config;
