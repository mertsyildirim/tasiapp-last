// CORS ayarlarını yapılandır
export function setupCORS(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

// OPTIONS isteklerini işle
export function handleOptionsRequest(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    res.status(200).end();
    return true;
  }
  return false;
}

// Başarılı yanıt gönder
export function sendSuccess(res, data, status = 200, message = null) {
  res.status(status).json({
    success: true,
    message,
    data
  });
}

// Hata yanıtı gönder
export function sendError(res, message = 'Internal Server Error', status = 500, error = null) {
  console.error(`API Hatası (${status}):`, message, error ? error.message || error : '');
  
  // Detaylı hata mesajı oluştur
  let errorDetails = null;
  
  if (process.env.NODE_ENV === 'development' && error) {
    errorDetails = {
      message: error.message || String(error),
      name: error.name,
      ...(error.code && { code: error.code }),
      ...(error.stack && { stack: error.stack.split('\n') })
    };
  }
  
  res.status(status).json({
    success: false,
    message,
    ...(errorDetails && { error: errorDetails })
  });
}

// İsteği logla
export function logRequest(req) {
  const timestamp = new Date().toISOString();
  const requestInfo = {
    timestamp,
    method: req.method,
    url: req.url,
    query: req.query || {},
    headers: {
      ...req.headers,
      authorization: req.headers?.authorization ? '[REDACTED]' : undefined,
      cookie: req.headers?.cookie ? '[REDACTED]' : undefined
    }
  };
  
  // POST, PUT vb. için body ekle (güvenli şekilde)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    try {
      const safeBody = { ...req.body };
      
      // Hassas alanları redakte et
      if (safeBody.password) safeBody.password = '[REDACTED]';
      if (safeBody.passwordConfirm) safeBody.passwordConfirm = '[REDACTED]';
      if (safeBody.token) safeBody.token = '[REDACTED]';
      
      requestInfo.body = safeBody;
    } catch (e) {
      requestInfo.body = '[Body parse error]';
    }
  }
  
  console.log(`API İsteği: ${req.method} ${req.url}`, requestInfo);
} 