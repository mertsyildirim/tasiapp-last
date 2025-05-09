/**
 * Konum takip ve yönetimi için yardımcı fonksiyonlar
 */

// Konumu takip etmek için kullanılan watchId
let _watchId = null;
let _lastPosition = null;
let _updateCallback = null;
let _errorCallback = null;
let _sendInterval = null;
let _sendIntervalTime = 30000; // Default: 30 sn

/**
 * Cihaz/platform bilgilerini alır
 * @returns {Object} Platform bilgileri
 */
export function getPlatformInfo() {
  const info = {
    isMobile: false,
    isDesktop: true,
    isAndroid: false,
    isIOS: false,
    platform: 'unknown'
  };

  if (typeof window !== 'undefined') {
    // Mobil cihaz kontrolü
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // Android kontrolü
    if (/android/i.test(userAgent)) {
      info.isMobile = true;
      info.isDesktop = false;
      info.isAndroid = true;
      info.platform = 'android';
    }
    
    // iOS kontrolü
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      info.isMobile = true;
      info.isDesktop = false;
      info.isIOS = true;
      info.platform = 'ios';
    }
    
    // Mobil kontrolü (genel)
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(userAgent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(userAgent.substr(0, 4))) {
      info.isMobile = true;
      info.isDesktop = false;
      
      if (!info.platform || info.platform === 'unknown') {
        info.platform = 'mobile';
      }
    }
    
    // Tarayıcı tipi (basit)
    if (info.platform === 'unknown') {
      info.platform = 'desktop';
    }
  }
  
  return info;
}

/**
 * Google Maps API'sinin yüklü olup olmadığını kontrol eder
 * @returns {boolean} Google Maps yüklü mü?
 */
export function isGoogleMapsLoaded() {
  return typeof window !== 'undefined' && window.google && window.google.maps;
}

/**
 * Geolocation API'si hata mesajlarını formatlar ve kaydeder
 * @param {GeolocationPositionError} error Hata objesi
 * @returns {string} Hata mesajı
 */
export function logLocationError(error) {
  let errorMessage = '';
  
  switch(error.code) {
    case 1:
      errorMessage = 'Konum izni reddedildi';
      console.error('PERMISSION_DENIED: Konum erişimi kullanıcı tarafından reddedildi.');
      break;
    case 2:
      errorMessage = 'Konum alınamadı';
      console.error('POSITION_UNAVAILABLE: Konum bilgisi alınamadı.');
      break;
    case 3:
      errorMessage = 'Konum zaman aşımına uğradı';
      console.error('TIMEOUT: Konum bilgisi alınırken zaman aşımı oluştu.');
      break;
    default:
      errorMessage = 'Bilinmeyen konum hatası';
      console.error('Bilinmeyen konum hatası:', error.message);
  }
  
  return errorMessage;
}

/**
 * Tek seferlik konum alımı
 * @param {Function} onSuccess Başarı callback'i
 * @param {Function} onError Hata callback'i
 * @param {Object} options Konum alma ayarları
 */
export function getCurrentPosition(onSuccess, onError, options = {}) {
  if (!navigator.geolocation) {
    if (onError) {
      onError({ 
        code: 0, 
        message: 'Geolocation API desteklenmiyor' 
      });
    }
    return;
  }
  
  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 0
  };
  
  const positionOptions = { ...defaultOptions, ...options };
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      // Position objesinden ihtiyacımız olan verileri çıkar
      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed || null,
        heading: position.coords.heading || null,
        timestamp: position.timestamp
      };
      
      if (onSuccess) {
        onSuccess(locationData);
      }
      
      // Son konumu cache'le
      _lastPosition = locationData;
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    },
    positionOptions
  );
}

/**
 * Konumu sürekli olarak izlemeye başlar
 * @param {Function} onUpdate Konum güncellendiğinde çağrılacak fonksiyon
 * @param {Function} onError Hata oluştuğunda çağrılacak fonksiyon
 * @param {number} sendInterval Konumu sunucuya gönderme aralığı (ms)
 * @param {Object} options Konum takip ayarları
 * @returns {boolean} İzleme başlatıldı mı?
 */
export function startTracking(onUpdate, onError, sendInterval = 30000, options = {}) {
  if (_watchId !== null) {
    console.log('Konum takip zaten aktif, mevcut takip durdurulup yeniden başlatılıyor');
    stopTracking();
  }
  
  if (!navigator.geolocation) {
    console.error('Geolocation API desteklenmiyor');
    if (onError) {
      onError({ 
        code: 0, 
        message: 'Geolocation API desteklenmiyor' 
      });
    }
    return false;
  }
  
  _updateCallback = onUpdate;
  _errorCallback = onError;
  _sendIntervalTime = sendInterval;
  
  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 5000
  };
  
  const trackingOptions = { ...defaultOptions, ...options };
  
  try {
    // İlk konumu hemen al
    getCurrentPosition(
      (initialPosition) => {
        if (_updateCallback) {
          _updateCallback(initialPosition, true); // Sunucuya gönder
        }
      },
      (error) => {
        console.warn('İlk konum alınamadı:', error);
        // İlk konum alınamasa da devam edebiliriz, bu yüzden izlemeye devam et
      },
      trackingOptions
    );
    
    // Konum izlemeyi başlat
    _watchId = navigator.geolocation.watchPosition(
      (position) => {
        // Position objesinden ihtiyacımız olan verileri çıkar
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed || null,
          heading: position.coords.heading || null,
          timestamp: position.timestamp
        };
        
        // Son konumu güncelle
        _lastPosition = locationData;
        
        // Callback'i çağır, ama sunucuya gönderme (interval ile gönderilecek)
        if (_updateCallback) {
          _updateCallback(locationData, false);
        }
      },
      (error) => {
        console.error('Konum takip hatası:', error);
        if (_errorCallback) {
          _errorCallback(error);
        }
      },
      trackingOptions
    );
    
    // Periyodik olarak konumu sunucuya gönderme intervali başlat
    _sendInterval = setInterval(() => {
      if (_lastPosition && _updateCallback) {
        // Mevcut konumu sunucuya gönder
        _updateCallback(_lastPosition, true);
      }
    }, _sendIntervalTime);
    
    return true;
  } catch (e) {
    console.error('Konum takibi başlatılırken hata:', e);
    if (_errorCallback) {
      _errorCallback({ 
        code: 0, 
        message: `Konum takibi başlatılamadı: ${e.message}` 
      });
    }
    return false;
  }
}

/**
 * Konum izlemeyi durdurur
 */
export function stopTracking() {
  if (_watchId !== null) {
    navigator.geolocation.clearWatch(_watchId);
    _watchId = null;
  }
  
  if (_sendInterval !== null) {
    clearInterval(_sendInterval);
    _sendInterval = null;
  }
  
  _updateCallback = null;
  _errorCallback = null;
  
  return true;
}

/**
 * Konum izlemenin aktif olup olmadığını kontrol eder
 * @returns {boolean} İzleme aktif mi?
 */
export function isTrackingActive() {
  return _watchId !== null;
}

/**
 * En son alınan konumu döndürür
 * @returns {Object|null} Son konum
 */
export function getLastPosition() {
  return _lastPosition;
}

/**
 * Kullanıcının konumunu tek seferlik olarak API'ye gönderir
 * @param {string} userId Kullanıcı ID'si
 * @param {string} userType Kullanıcı tipi (freelance, driver, vb.)
 * @returns {Promise<Object>} API yanıtı
 */
export async function sendUserLocation(userId, userType = 'freelance') {
  return new Promise((resolve, reject) => {
    // Geçerli konumu al
    getCurrentPosition(
      async (position) => {
        try {
          // API'ye gönderilecek veriyi hazırla
          const locationData = {
            userId,
            userType,
            latitude: position.latitude,
            longitude: position.longitude,
            accuracy: position.accuracy,
            speed: position.speed,
            heading: position.heading,
            timestamp: position.timestamp,
            isActive: true
          };
          
          // API'ye gönder
          const response = await fetch('/api/locations/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(locationData)
          });
          
          // Yanıtı işle
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          resolve({
            success: true,
            data,
            position
          });
        } catch (error) {
          reject({
            success: false,
            error: error.message,
            position
          });
        }
      },
      (error) => {
        reject({
          success: false,
          error: logLocationError(error),
          errorCode: error.code
        });
      },
      // Tek seferlik konum için optimize edilmiş ayarlar
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
} 