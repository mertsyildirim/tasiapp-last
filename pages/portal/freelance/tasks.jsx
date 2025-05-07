import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { FaTruck, FaCalendarAlt, FaMapMarkerAlt, FaClock, FaFilter, FaSearch, FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle, FaExclamationCircle } from 'react-icons/fa';
import Link from 'next/link';
import FreelanceLayout from '../../../components/portal/FreelanceLayout';

export default function FreelanceTasks() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace('/portal/login');
    },
  });
  
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  // Örnek veri
  useEffect(() => {
    if (status === 'loading') return;
    
    console.log("Freelance Tasks - Session durumu:", status, "Session:", session);
    
    if (!session) return;

    // Örnek taşıma verileri - gerçek uygulamada API'den alınacak
    const demoTasks = [
      {
        id: 'TSK2024001',
        title: 'Ev Eşyası Taşıma',
        customer: 'Ahmet Yılmaz',
        customerContact: '+90 532 123 4567',
        from: 'Kadıköy, İstanbul',
        fromAddress: 'Kadıköy Mah. Örnek Sok. No:15, D:3, Kadıköy/İstanbul',
        to: 'Üsküdar, İstanbul',
        toAddress: 'Üsküdar Mah. Deneme Cad. No:42, B Blok, D:8, Üsküdar/İstanbul',
        date: '2024-05-20',
        time: '09:00 - 12:00',
        description: '3+1 ev eşyası taşıma. Mobilya demontaj/montaj hizmetleri dahil.',
        status: 'upcoming',
        distance: '8 km',
        payment: {
          amount: 1500,
          method: 'Online Ödeme',
          status: 'Ödendi'
        },
        items: [
          { name: 'Koltuk Takımı', count: 1, weight: '~80kg' },
          { name: 'Yemek Masası Seti', count: 1, weight: '~60kg' },
          { name: 'Gardrop', count: 2, weight: '~150kg' },
          { name: 'Beyaz Eşya', count: 4, weight: '~200kg' }
        ],
        notes: 'Asansör yok. 3. kat. Mobilyaların bir kısmı demonte edilecek.',
        createdAt: '2024-05-15T10:30:00'
      },
      {
        id: 'TSK2024002',
        title: 'Ofis Taşıma',
        customer: 'MNO Teknoloji Ltd.',
        customerContact: '+90 212 987 6543',
        from: 'Levent, İstanbul',
        fromAddress: 'Levent Mah. Plaza Cad. No:123 Kat:5, Levent/İstanbul',
        to: 'Maslak, İstanbul',
        toAddress: 'Maslak Mah. İş Merkezi Sk. No:42 Kat:8, Maslak/İstanbul',
        date: '2024-05-18',
        time: '14:00 - 18:00',
        description: '10 kişilik ofis ekipmanları taşıma. Elektronik eşyalar dikkatli taşınacak.',
        status: 'in_progress',
        distance: '5 km',
        payment: {
          amount: 3200,
          method: 'Kurumsal Fatura',
          status: 'Beklemede'
        },
        items: [
          { name: 'Çalışma Masaları', count: 10, weight: '~250kg' },
          { name: 'Ofis Koltukları', count: 10, weight: '~150kg' },
          { name: 'PC ve Ekipmanlar', count: 15, weight: '~150kg' },
          { name: 'Dolaplar', count: 5, weight: '~300kg' }
        ],
        notes: 'Her iki binada da yük asansörü mevcut. Tüm eşyalar kutulara konulmuş durumda.',
        createdAt: '2024-05-10T14:45:00'
      },
      {
        id: 'TSK2024003',
        title: 'Paket Teslimatı',
        customer: 'Zeynep Kaya',
        customerContact: '+90 535 765 4321',
        from: 'Beyoğlu, İstanbul',
        fromAddress: 'Beyoğlu Mah. Taksim Cad. No:5, Beyoğlu/İstanbul',
        to: 'Şişli, İstanbul',
        toAddress: 'Şişli Mah. Apartman Sk. No:15, D:7, Şişli/İstanbul',
        date: '2024-05-16',
        time: '10:00 - 11:00',
        description: 'Hassas içerikli kargonun özel teslimatlı gönderimi.',
        status: 'completed',
        distance: '4 km',
        payment: {
          amount: 750,
          method: 'Nakit',
          status: 'Ödendi'
        },
        items: [
          { name: 'Elektronik Eşya', count: 1, weight: '~15kg' }
        ],
        notes: 'Elektronik eşya özenli taşınmalıdır.',
        createdAt: '2024-05-15T10:00:00'
      },
      {
        id: 'TSK2024004',
        title: 'Mobilya Taşıma',
        customer: 'Ali Demir',
        customerContact: '+90 536 987 1234',
        from: 'Bakırköy, İstanbul',
        fromAddress: 'Bakırköy Mah. Deneme Sok. No:34, D:12 Bakırköy/İstanbul',
        to: 'Beylikdüzü, İstanbul',
        toAddress: 'Beylikdüzü Mah. Örnek Cad. No:78, C Blok, D:5 Beylikdüzü/İstanbul',
        date: '2024-05-25',
        time: '10:00 - 14:00',
        description: 'Yeni mobilyaların taşınması ve kurulumu.',
        status: 'upcoming',
        distance: '25 km',
        payment: {
          amount: 2800,
          method: 'Kredi Kartı',
          status: 'Ön Ödeme Alındı'
        },
        items: [
          { name: 'Yatak Odası Takımı', count: 1, weight: '~200kg' },
          { name: 'Oturma Odası Takımı', count: 1, weight: '~180kg' },
          { name: 'Çeşitli Mobilyalar', count: 5, weight: '~120kg' }
        ],
        notes: 'Yeni mobilyalar mağazadan alınacak ve eve teslim edilecek. Montaj hizmeti dahildir.',
        createdAt: '2024-05-12T09:15:00'
      },
      {
        id: 'TSK2024005',
        title: 'Fabrika Ekipmanı Taşıma',
        customer: 'ABC Sanayi A.Ş.',
        customerContact: '+90 212 456 7890',
        from: 'Tuzla, İstanbul',
        fromAddress: 'Tuzla OSB, E5 Fabrika Cad. No:123, Tuzla/İstanbul',
        to: 'Gebze, Kocaeli',
        toAddress: 'Gebze OSB, Teknoloji Mah. D-100 Cad. No:45, Gebze/Kocaeli',
        date: '2024-05-30',
        time: '08:00 - 17:00',
        description: 'Ağır endüstriyel ekipman taşıma.',
        status: 'cancelled',
        distance: '35 km',
        payment: {
          amount: 8500,
          method: 'Banka Havalesi',
          status: 'İptal Edildi'
        },
        items: [
          { name: 'CNC Makinası', count: 1, weight: '~1200kg' },
          { name: 'Endüstriyel Robotlar', count: 2, weight: '~800kg' },
          { name: 'Kontrol Üniteleri', count: 5, weight: '~250kg' }
        ],
        notes: 'Taşıma iptal edildi. Müşteri farklı bir firmayı tercih etti.',
        createdAt: '2024-05-08T11:20:00'
      }
    ];
    
    setTasks(demoTasks);
    setFilteredTasks(demoTasks);
    setLoading(false);
  }, [status, router, session]);

  // Filtreleme
  useEffect(() => {
    if (!tasks.length) return;
    
    let result = [...tasks];
    
    // Durum filtresi
    if (filter !== 'all') {
      result = result.filter(task => task.status === filter);
    }
    
    // Arama filtresi
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(task => 
        task.title.toLowerCase().includes(term) ||
        task.customer.toLowerCase().includes(term) ||
        task.id.toLowerCase().includes(term) ||
        task.from.toLowerCase().includes(term) ||
        task.to.toLowerCase().includes(term)
      );
    }
    
    setFilteredTasks(result);
  }, [tasks, filter, searchTerm]);

  // Yükleme durumu
  if (status === 'loading' || loading) {
    return (
      <FreelanceLayout title="Taşımalarım">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </FreelanceLayout>
    );
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'upcoming':
        return 'Yaklaşan';
      case 'in_progress':
        return 'Devam Ediyor';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return 'Bilinmiyor';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'upcoming':
        return <FaCalendarAlt className="mr-1 h-4 w-4" />;
      case 'in_progress':
        return <FaTruck className="mr-1 h-4 w-4" />;
      case 'completed':
        return <FaCheckCircle className="mr-1 h-4 w-4" />;
      case 'cancelled':
        return <FaTimesCircle className="mr-1 h-4 w-4" />;
      default:
        return <FaExclamationCircle className="mr-1 h-4 w-4" />;
    }
  };

  const toggleTaskDetails = (id) => {
    if (expandedTaskId === id) {
      setExpandedTaskId(null);
    } else {
      setExpandedTaskId(id);
    }
  };

  return (
    <FreelanceLayout title="Taşımalarım">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        {/* Başlık ve Arama Filtreleri */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Taşımalarım</h2>
            <span className="text-sm text-gray-500">Toplam: {tasks.length} taşıma</span>
          </div>
          
          <div className="border-t border-b border-gray-200 px-4 py-4 sm:px-6 bg-gray-50">
            <div className="flex flex-wrap items-center justify-between">
              <div className="w-full md:w-auto flex flex-wrap mb-4 md:mb-0">
                <button
                  onClick={() => setFilter('all')}
                  className={`mr-2 mb-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                    filter === 'all'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Tümü
                </button>
                <button
                  onClick={() => setFilter('upcoming')}
                  className={`mr-2 mb-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                    filter === 'upcoming'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Yaklaşan
                </button>
                <button
                  onClick={() => setFilter('in_progress')}
                  className={`mr-2 mb-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                    filter === 'in_progress'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Devam Eden
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className={`mr-2 mb-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                    filter === 'completed'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Tamamlanan
                </button>
                <button
                  onClick={() => setFilter('cancelled')}
                  className={`mr-2 mb-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                    filter === 'cancelled'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  İptal Edilen
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

        {/* Taşıma Listesi */}
        {filteredTasks.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-8 text-center">
            <FaTruck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Taşıma Bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              Seçtiğiniz filtre kriterlerine uygun taşıma bulunmamaktadır.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div key={task.id} className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-4 sm:px-6 flex flex-wrap justify-between items-center cursor-pointer" onClick={() => toggleTaskDetails(task.id)}>
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FaTruck className="h-6 w-6 text-orange-500" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                      <div className="flex items-center mt-1">
                        <span className="text-sm text-gray-500 mr-2">#{task.id}</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)}
                          {getStatusText(task.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 sm:mt-0">
                    <div className="flex flex-col items-end">
                      <div className="text-sm text-gray-700 font-bold">{task.payment.amount} ₺</div>
                      <div className="text-xs text-gray-500">{formatDate(task.date)}</div>
                    </div>
                    
                    <button
                      className="mt-2 inline-flex items-center text-sm font-medium text-orange-600 hover:text-orange-500"
                    >
                      {expandedTaskId === task.id ? (
                        <>
                          <FaEyeSlash className="mr-1" />
                          Detayları Gizle
                        </>
                      ) : (
                        <>
                          <FaEye className="mr-1" />
                          Detayları Görüntüle
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {expandedTaskId === task.id && (
                  <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Müşteri Bilgileri</h4>
                        <p className="text-sm font-medium text-gray-900">{task.customer}</p>
                        <p className="text-sm text-gray-500">{task.customerContact}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Ödeme Bilgileri</h4>
                        <p className="text-sm font-medium text-gray-900">{task.payment.amount} ₺</p>
                        <p className="text-sm text-gray-500">
                          {task.payment.method} - {task.payment.status}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Alım Konumu</h4>
                        <p className="text-sm font-medium text-gray-900">{task.from}</p>
                        <p className="text-sm text-gray-500">{task.fromAddress}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Teslimat Konumu</h4>
                        <p className="text-sm font-medium text-gray-900">{task.to}</p>
                        <p className="text-sm text-gray-500">{task.toAddress}</p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Taşınacak Eşyalar</h4>
                        <ul className="list-disc list-inside text-sm text-gray-500">
                          {task.items.map((item, index) => (
                            <li key={index} className="mb-1">
                              {item.name} - {item.count} adet ({item.weight})
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Notlar</h4>
                        <p className="text-sm text-gray-500">{task.notes}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end space-x-3">
                      {task.status === 'upcoming' && (
                        <>
                          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                            Başla
                          </button>
                          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                            İptal Et
                          </button>
                        </>
                      )}
                      
                      {task.status === 'in_progress' && (
                        <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                          Tamamlandı Olarak İşaretle
                        </button>
                      )}
                      
                      {task.status === 'completed' && (
                        <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                          Fatura Oluştur
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </FreelanceLayout>
  );
} 