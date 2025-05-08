import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { FaFileAlt, FaUpload, FaDownload, FaEye, FaTrash, FaExclamationTriangle, FaCheck, FaClock, FaPlus, FaSearch, FaTimes } from 'react-icons/fa';
import FreelanceLayout from '../../../components/portal/FreelanceLayout';

export default function FreelanceDocuments() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace('/portal/login');
    },
  });
  
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [docType, setDocType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Örnek veri
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      // Oturum yoksa boş verilerle devam et
      setDocuments([]);
      setFilteredDocuments([]);
      setLoading(false);
      return;
    }

    // Belge verilerini API'den al
    const fetchDocuments = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/portal/freelance-documents');
        const data = await response.json();
        
        if (data.success) {
          console.log('Belgeler başarıyla alındı:', data);
          
          // API'den gelen verileri ata
          setDocuments(data.documents || []);
          setFilteredDocuments(data.documents || []);
        } else {
          console.error('Belge verisi alınamadı:', data.message);
          // Hata durumunda boş veri göster
          setDocuments([]);
          setFilteredDocuments([]);
        }
      } catch (error) {
        console.error('Belge verisi alınırken hata:', error);
        // Hata durumunda boş veri göster
        setDocuments([]);
        setFilteredDocuments([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocuments();
  }, [status, router, session]);

  // Filtreleme
  useEffect(() => {
    if (!documents.length) return;
    
    let result = [...documents];
    
    // Belge türü filtresi
    if (docType !== 'all') {
      result = result.filter(doc => doc.type === docType);
    }
    
    // Arama filtresi
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(doc => 
        doc.title.toLowerCase().includes(term) ||
        doc.notes.toLowerCase().includes(term) ||
        doc.id.toLowerCase().includes(term)
      );
    }
    
    setFilteredDocuments(result);
  }, [documents, docType, searchTerm]);

  // Yükleme durumu
  if (status === 'loading' || loading) {
    return (
      <FreelanceLayout title="Belgelerim">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </FreelanceLayout>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'rejected':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'approved':
        return 'Onaylandı';
      case 'pending':
        return 'Onay Bekliyor';
      case 'expired':
        return 'Süresi Doldu';
      case 'rejected':
        return 'Reddedildi';
      default:
        return 'Bilinmiyor';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'approved':
        return <FaCheck className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <FaClock className="h-5 w-5 text-yellow-500" />;
      case 'expired':
        return <FaExclamationTriangle className="h-5 w-5 text-red-500" />;
      case 'rejected':
        return <FaExclamationTriangle className="h-5 w-5 text-gray-500" />;
      default:
        return <FaFileAlt className="h-5 w-5 text-gray-400" />;
    }
  };

  const getDocTypeText = (type) => {
    switch(type) {
      case 'license':
        return 'Yetki Belgesi';
      case 'vehicle':
        return 'Araç Belgesi';
      case 'insurance':
        return 'Sigorta';
      case 'driver':
        return 'Sürücü Belgesi';
      case 'tax':
        return 'Vergi Belgesi';
      default:
        return 'Diğer';
    }
  };

  const handleDocumentClick = (doc) => {
    setSelectedDocument(doc);
    setShowModal(true);
  };
  
  const closeModal = () => {
    setShowModal(false);
    setSelectedDocument(null);
  };

  return (
    <FreelanceLayout title="Belgelerim">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        {/* Başlık ve Arama Filtreleri */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center flex-wrap">
            <h2 className="text-xl font-semibold text-gray-900">Belgelerim</h2>
            
            <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
              <FaPlus className="mr-2 -ml-1 h-4 w-4" />
              Yeni Belge Yükle
            </button>
          </div>
          
          <div className="border-t border-b border-gray-200 px-4 py-4 sm:px-6 bg-gray-50">
            <div className="flex flex-wrap items-center justify-between">
              <div className="w-full md:w-auto flex flex-wrap mb-4 md:mb-0">
                <button
                  onClick={() => setDocType('all')}
                  className={`mr-2 mb-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                    docType === 'all'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Tümü
                </button>
                <button
                  onClick={() => setDocType('company')}
                  className={`mr-2 mb-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                    docType === 'company'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Şirket Belgeleri
                </button>
                <button
                  onClick={() => setDocType('driver')}
                  className={`mr-2 mb-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                    docType === 'driver'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Sürücü Belgeleri
                </button>
                <button
                  onClick={() => setDocType('vehicle')}
                  className={`mr-2 mb-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                    docType === 'vehicle'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Araç Belgeleri
                </button>
              </div>
              
              <div className="w-full md:w-auto relative">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Belge Listesi */}
        {filteredDocuments.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-8 text-center">
            <FaFileAlt className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Belge Bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              Seçtiğiniz filtre kriterlerine uygun belge bulunmamaktadır.
            </p>
            <div className="mt-6">
              <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                <FaPlus className="mr-2 -ml-1 h-4 w-4" />
                Yeni Belge Yükle
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Belge ID / Tür
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Başlık
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Belge Sahibi
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Son Geçerlilik
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{doc.id.substring(0, 12)}...</div>
                        <div className="text-sm text-gray-500">{getDocTypeText(doc.type)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 rounded-md">
                            {getStatusIcon(doc.status)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                            <div className="text-sm text-gray-500">{doc.notes?.substring(0, 50)}{doc.notes?.length > 50 ? '...' : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{doc.ownerName || '-'}</div>
                        <div className="text-sm text-gray-500">
                          {doc.documentOwner === 'company' ? 'Şirket' : 
                           doc.documentOwner === 'driver' ? 'Sürücü' : 
                           doc.documentOwner === 'vehicle' ? 'Araç' : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                          {getStatusText(doc.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(doc.expiryDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => handleDocumentClick(doc)}
                          className="text-orange-600 hover:text-orange-900 mr-3"
                        >
                          <FaEye className="inline-block h-4 w-4 mr-1" />
                          Görüntüle
                        </button>
                        <button className="text-orange-600 hover:text-orange-900">
                          <FaDownload className="inline-block h-4 w-4 mr-1" />
                          İndir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Belge Detay Modal */}
        {showModal && selectedDocument && (
          <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black opacity-50" onClick={closeModal}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 md:mx-auto">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium leading-6 text-gray-900">{selectedDocument.title}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      Belge ID: {selectedDocument.id}
                    </p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="rounded-full h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Kapat</span>
                    <FaTimes className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="px-4 py-5 sm:px-6">
                <div className="border border-gray-300 rounded-md mb-4 p-4 flex flex-col items-center justify-center">
                  <FaFileAlt className="h-20 w-20 text-orange-500 mb-4" />
                  <p className="text-sm text-gray-500 mb-2">
                    Dosya boyutu: {selectedDocument.fileSize}
                  </p>
                  <div className="flex space-x-4 mt-2">
                    <button className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                      <FaEye className="mr-2 -ml-1 h-4 w-4" />
                      Belgeyi Görüntüle
                    </button>
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                      <FaDownload className="mr-2 -ml-1 h-4 w-4" />
                      İndir
                    </button>
                  </div>
                </div>
                
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Belge Türü</dt>
                    <dd className="mt-1 text-sm text-gray-900">{getDocTypeText(selectedDocument.type)}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Durum</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedDocument.status)}`}>
                        {getStatusText(selectedDocument.status)}
                      </span>
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Son Geçerlilik Tarihi</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(selectedDocument.expiryDate)}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Yükleme Tarihi</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(selectedDocument.uploadDate)}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Onaylayan</dt>
                    <dd className="mt-1 text-sm text-gray-900">{selectedDocument.verifiedBy || '-'}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Onay Tarihi</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(selectedDocument.verificationDate)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Notlar</dt>
                    <dd className="mt-1 text-sm text-gray-900">{selectedDocument.notes}</dd>
                  </div>
                </dl>
              </div>
              
              <div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                {selectedDocument.status === 'expired' && (
                  <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                    <FaUpload className="mr-2 -ml-1 h-4 w-4" />
                    Yeni Versiyon Yükle
                  </button>
                )}
                {selectedDocument.status === 'pending' && (
                  <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                    <FaUpload className="mr-2 -ml-1 h-4 w-4" />
                    Güncelle
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </FreelanceLayout>
  );
} 