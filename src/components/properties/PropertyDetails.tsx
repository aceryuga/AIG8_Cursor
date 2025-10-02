import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, IndianRupee, User, Phone, Mail, Calendar, FileText, Upload, CreditCard, Building2, LogOut, Bell, HelpCircle, CreditCard as Edit, Trash2, Download, Eye, CheckCircle, AlertTriangle, Clock, X, Send, MessageCircle, Camera, Save, AlertCircle } from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { Input } from '../webapp-ui/Input';
import { useAuth } from '../../hooks/useAuth';

interface Property {
  id: string;
  name: string;
  address: string;
  rent: number;
  tenant: string;
  tenantPhone: string;
  tenantEmail: string;
  status: 'occupied' | 'vacant' | 'maintenance';
  paymentStatus: 'paid' | 'pending' | 'overdue';
  image: string;
  dueDate: string;
  propertyType: 'apartment' | 'villa' | 'office' | 'shop';
  bedrooms?: number;
  area: number;
  description: string;
  amenities: string[];
  leaseStart: string;
  leaseEnd: string;
  securityDeposit: number;
}

interface PaymentHistory {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  method: string;
  reference: string;
}

interface PaymentForm {
  amount: number;
  date: string;
  method: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'card' | '';
  reference: string;
  notes: string;
}

interface ContactForm {
  subject: string;
  message: string;
  method: 'email' | 'sms' | 'whatsapp';
}

interface EditPropertyForm {
  name: string;
  address: string;
  rent: number;
  securityDeposit: number;
  description: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  size: string;
}

const mockProperty: Property = {
  id: '1',
  name: 'Green Valley Apartment',
  address: 'Sector 18, Noida, UP 201301',
  rent: 15000,
  tenant: 'Amit Sharma',
  tenantPhone: '+91 9876543210',
  tenantEmail: 'amit.sharma@email.com',
  status: 'occupied',
  paymentStatus: 'paid',
  image: 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800',
  dueDate: '2025-01-05',
  propertyType: 'apartment',
  bedrooms: 2,
  area: 1200,
  description: 'Beautiful 2BHK apartment with modern amenities and great connectivity. Perfect for small families.',
  amenities: ['Parking', 'Security', 'Gym', 'Swimming Pool', 'Garden', 'Power Backup'],
  leaseStart: '2024-01-01',
  leaseEnd: '2025-12-31',
  securityDeposit: 30000
};

const mockPaymentHistory: PaymentHistory[] = [
  {
    id: '1',
    date: '2025-01-01',
    amount: 15000,
    status: 'paid',
    method: 'UPI',
    reference: 'TXN123456789'
  },
  {
    id: '2',
    date: '2024-12-01',
    amount: 15000,
    status: 'paid',
    method: 'Bank Transfer',
    reference: 'TXN123456788'
  },
  {
    id: '3',
    date: '2024-11-01',
    amount: 15000,
    status: 'paid',
    method: 'UPI',
    reference: 'TXN123456787'
  }
];

const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Lease Agreement',
    type: 'PDF',
    uploadDate: '2024-01-01',
    size: '2.5 MB'
  },
  {
    id: '2',
    name: 'Property Photos',
    type: 'ZIP',
    uploadDate: '2024-01-01',
    size: '15.2 MB'
  },
  {
    id: '3',
    name: 'Tenant ID Proof',
    type: 'PDF',
    uploadDate: '2024-01-01',
    size: '1.8 MB'
  }
];

export const PropertyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showContactTenant, setShowContactTenant] = useState(false);
  const [showUploadDocument, setShowUploadDocument] = useState(false);
  const [showEditProperty, setShowEditProperty] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    amount: 15000,
    date: new Date().toISOString().split('T')[0],
    method: '',
    reference: '',
    notes: ''
  });
  const [contactForm, setContactForm] = useState<ContactForm>({
    subject: '',
    message: '',
    method: 'email'
  });
  const [editForm, setEditForm] = useState<EditPropertyForm>({
    name: mockProperty.name,
    address: mockProperty.address,
    rent: mockProperty.rent,
    securityDeposit: mockProperty.securityDeposit,
    description: mockProperty.description
  });
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const property = mockProperty; // In real app, fetch by id

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'text-green-700 bg-green-100';
      case 'vacant': return 'text-orange-600 bg-orange-100';
      case 'maintenance': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-700 bg-green-100';
      case 'pending': return 'text-orange-600 bg-orange-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPaymentIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle size={16} />;
      case 'pending': return <Clock size={16} />;
      case 'overdue': return <AlertTriangle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const handleRecordPayment = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    setShowRecordPayment(false);
    alert('Payment recorded successfully!');
  };

  const handleContactTenant = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setShowContactTenant(false);
    alert(`${contactForm.method === 'email' ? 'Email' : contactForm.method === 'sms' ? 'SMS' : 'WhatsApp message'} sent successfully!`);
  };

  const handleCall = () => {
    window.open(`tel:${property.tenantPhone}`, '_self');
  };

  const handleEmail = () => {
    window.open(`mailto:${property.tenantEmail}`, '_self');
  };

  const handleUploadDocument = async () => {
    if (uploadFiles.length === 0) return;
    
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
    setShowUploadDocument(false);
    setUploadFiles([]);
    alert(`${uploadFiles.length} document(s) uploaded successfully!`);
  };

  const handleEditProperty = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    setShowEditProperty(false);
    alert('Property updated successfully!');
  };

  const handleDeleteProperty = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    setShowDeleteConfirm(false);
    alert('Property deleted successfully!');
    navigate('/properties');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    setUploadFiles(prev => [...prev, ...files]);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'payments', label: 'Payment History' },
    { id: 'documents', label: 'Documents' },
    { id: 'tenant', label: 'Tenant Details' }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden floating-orbs">
      {/* Top Navigation */}
      <header className="glass-card border-b border-white border-opacity-20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="flex items-center gap-3">
                <div className="w-8 h-8 glass rounded-lg flex items-center justify-center glow">
                  <Building2 className="w-5 h-5 text-green-800" />
                </div>
                <h1 className="text-xl font-bold text-glass">PropertyPro</h1>
              </Link>
              
              <nav className="hidden md:flex items-center gap-6">
                {[
                  { name: 'Dashboard', path: '/dashboard' },
                  { name: 'Properties', path: '/properties' },
                  { name: 'Payments', path: '/payments' },
                  { name: 'Documents', path: '/documents' },
                  { name: 'Settings', path: '/settings' }
                ].map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      item.path === '/properties'
                        ? 'glass text-glass'
                        : 'text-glass-muted hover:text-glass hover:bg-white hover:bg-opacity-10'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 glass rounded-lg hover:bg-white hover:bg-opacity-10 transition-all duration-200"
                >
                  <Bell size={18} className="text-glass" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    3
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-glass hidden sm:block whitespace-nowrap">{user?.name}</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="p-2">
                    <User size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2">
                    <HelpCircle size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="p-2"
                  >
                    <LogOut size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link to="/properties" className="text-glass-muted hover:text-glass flex items-center gap-1">
            <ArrowLeft size={16} />
            Properties
          </Link>
          <span className="text-glass-muted">/</span>
          <span className="text-glass">{property.name}</span>
        </div>

        {/* Property Header */}
        <div className="glass-card rounded-xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <img
              src={property.image}
              alt={property.name}
              className="w-full lg:w-80 h-60 object-cover rounded-lg"
            />
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-glass mb-2">{property.name}</h1>
                  <p className="text-glass-muted flex items-center gap-1 mb-2">
                    <MapPin size={16} />
                    {property.address}
                  </p>
                  <div className="flex gap-2 mb-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(property.status)}`}>
                      {property.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(property.paymentStatus)}`}>
                      {property.paymentStatus}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowEditProperty(true)}>
                    <Edit size={16} className="mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 size={16} className="mr-1" />
                    Delete
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="glass rounded-lg p-3">
                  <p className="text-2xl font-bold text-glass">₹{property.rent.toLocaleString()}</p>
                  <p className="text-sm text-glass-muted">Monthly Rent</p>
                </div>
                <div className="glass rounded-lg p-3">
                  <p className="text-2xl font-bold text-glass">{property.area}</p>
                  <p className="text-sm text-glass-muted">Sq Ft</p>
                </div>
                {property.bedrooms && (
                  <div className="glass rounded-lg p-3">
                    <p className="text-2xl font-bold text-glass">{property.bedrooms}</p>
                    <p className="text-sm text-glass-muted">Bedrooms</p>
                  </div>
                )}
                <div className="glass rounded-lg p-3">
                  <p className="text-2xl font-bold text-glass">₹{property.securityDeposit.toLocaleString()}</p>
                  <p className="text-sm text-glass-muted">Security Deposit</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="flex items-center gap-2" onClick={() => setShowRecordPayment(true)}>
                  <CreditCard size={16} />
                  Record Payment
                </Button>
                <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowContactTenant(true)}>
                  <Phone size={16} />
                  Contact Tenant
                </Button>
                <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowUploadDocument(true)}>
                  <Upload size={16} />
                  Upload Document
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="border-b border-white border-opacity-20">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'text-glass border-b-2 border-green-800 bg-white bg-opacity-10'
                      : 'text-glass-muted hover:text-glass hover:bg-white hover:bg-opacity-5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-glass mb-3">Description</h3>
                  <p className="text-glass-muted">{property.description}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-glass mb-3">Amenities</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {property.amenities.map((amenity, index) => (
                      <div key={index} className="glass rounded-lg p-2 text-center">
                        <span className="text-sm text-glass">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-glass mb-3">Property Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-glass-muted">Type:</span>
                        <span className="text-glass capitalize">{property.propertyType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-glass-muted">Area:</span>
                        <span className="text-glass">{property.area} sq ft</span>
                      </div>
                      {property.bedrooms && (
                        <div className="flex justify-between">
                          <span className="text-glass-muted">Bedrooms:</span>
                          <span className="text-glass">{property.bedrooms}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-glass-muted">Status:</span>
                        <span className={`capitalize ${getStatusColor(property.status).split(' ')[0]}`}>
                          {property.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-glass mb-3">Lease Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-glass-muted">Start Date:</span>
                        <span className="text-glass">{new Date(property.leaseStart).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-glass-muted">End Date:</span>
                        <span className="text-glass">{new Date(property.leaseEnd).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-glass-muted">Monthly Rent:</span>
                        <span className="text-glass">₹{property.rent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-glass-muted">Security Deposit:</span>
                        <span className="text-glass">₹{property.securityDeposit.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment History Tab */}
            {activeTab === 'payments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-glass">Payment History</h3>
                  <Button 
                    className="flex items-center gap-2"
                    onClick={() => setShowRecordPayment(true)}
                  >
                    <CreditCard size={16} />
                    Record Payment
                  </Button>
                </div>

                <div className="space-y-3">
                  {mockPaymentHistory.map((payment) => (
                    <div key={payment.id} className="glass rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getPaymentStatusColor(payment.status)}`}>
                            {getPaymentIcon(payment.status)}
                          </div>
                          <div>
                            <p className="font-medium text-glass">₹{payment.amount.toLocaleString()}</p>
                            <p className="text-sm text-glass-muted">{new Date(payment.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-glass">{payment.method}</p>
                          <p className="text-xs text-glass-muted">{payment.reference}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-glass">Documents</h3>
                  <Button 
                    className="flex items-center gap-2"
                    onClick={() => setShowUploadDocument(true)}
                  >
                    <Upload size={16} />
                    Upload Document
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mockDocuments.map((document) => (
                    <div key={document.id} className="glass rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 glass rounded-lg flex items-center justify-center">
                          <FileText size={20} className="text-glass" />
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="p-1">
                            <Eye size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" className="p-1">
                            <Download size={14} />
                          </Button>
                        </div>
                      </div>
                      
                      <h4 className="font-medium text-glass mb-1">{document.name}</h4>
                      <p className="text-sm text-glass-muted mb-1">{document.type} • {document.size}</p>
                      <p className="text-xs text-glass-muted">
                        Uploaded {new Date(document.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tenant Details Tab */}
            {activeTab === 'tenant' && (
              <div className="space-y-6">
                {property.tenant ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-glass">Tenant Information</h3>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex items-center gap-2" onClick={handleCall}>
                          <Phone size={16} />
                          Call
                        </Button>
                        <Button variant="outline" className="flex items-center gap-2" onClick={handleEmail}>
                          <Mail size={16} />
                          Email
                        </Button>
                      </div>
                    </div>

                    <div className="glass rounded-lg p-6">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 glass rounded-full flex items-center justify-center">
                          <User size={24} className="text-glass" />
                        </div>
                        <div>
                          <h4 className="text-xl font-semibold text-glass">{property.tenant}</h4>
                          <p className="text-glass-muted">Current Tenant</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-medium text-glass mb-3">Contact Information</h5>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Phone size={16} className="text-glass-muted" />
                              <span className="text-glass">{property.tenantPhone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail size={16} className="text-glass-muted" />
                              <span className="text-glass">{property.tenantEmail}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-glass mb-3">Lease Details</h5>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar size={16} className="text-glass-muted" />
                              <span className="text-glass">
                                {new Date(property.leaseStart).toLocaleDateString()} - {new Date(property.leaseEnd).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <IndianRupee size={16} className="text-glass-muted" />
                              <span className="text-glass">₹{property.rent.toLocaleString()}/month</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4">
                      <User size={24} className="text-glass-muted" />
                    </div>
                    <h3 className="text-lg font-semibold text-glass mb-2">No Tenant Assigned</h3>
                    <p className="text-glass-muted mb-4">This property is currently vacant</p>
                    <Button>Find Tenant</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Record Payment Modal */}
      {showRecordPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 glass rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-green-800" />
                  </div>
                  <h2 className="text-2xl font-bold text-glass">Record Payment</h2>
                </div>
                <button
                  onClick={() => setShowRecordPayment(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-glass-muted" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="glass rounded-lg p-4">
                  <h3 className="font-medium text-glass mb-2">Property Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-glass-muted">Property:</p>
                      <p className="text-glass font-medium">{property.name}</p>
                    </div>
                    <div>
                      <p className="text-glass-muted">Tenant:</p>
                      <p className="text-glass font-medium">{property.tenant}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Payment Amount (₹)"
                    type="number"
                    value={paymentForm.amount || ''}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    icon={<IndianRupee size={18} />}
                    placeholder="15000"
                  />

                  <Input
                    label="Payment Date"
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                    icon={<Calendar size={18} />}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-glass">Payment Method</label>
                    <select
                      value={paymentForm.method}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, method: e.target.value as any }))}
                      className="w-full h-11 px-3 rounded-lg glass-input text-glass"
                    >
                      <option value="">Select payment method</option>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="card">Card</option>
                    </select>
                  </div>

                  <Input
                    label="Reference Number"
                    type="text"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                    icon={<FileText size={18} />}
                    placeholder="Transaction ID / Cheque Number"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-glass">Notes (Optional)</label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg glass-input text-glass placeholder-glass-muted"
                    placeholder="Add any additional notes..."
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => setShowRecordPayment(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRecordPayment}
                    loading={loading}
                    className="flex-1"
                  >
                    Record Payment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Tenant Modal */}
      {showContactTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 glass rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-green-800" />
                  </div>
                  <h2 className="text-2xl font-bold text-glass">Contact Tenant</h2>
                </div>
                <button
                  onClick={() => setShowContactTenant(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-glass-muted" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="glass rounded-lg p-4">
                  <h3 className="font-medium text-glass mb-2">Tenant Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-glass-muted">Name:</p>
                      <p className="text-glass font-medium">{property.tenant}</p>
                    </div>
                    <div>
                      <p className="text-glass-muted">Phone:</p>
                      <p className="text-glass font-medium">{property.tenantPhone}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-glass-muted">Email:</p>
                      <p className="text-glass font-medium">{property.tenantEmail}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-glass">Contact Method</label>
                  <div className="flex gap-4">
                    {[
                      { value: 'email', label: 'Email', icon: Mail },
                      { value: 'sms', label: 'SMS', icon: Phone },
                      { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle }
                    ].map((method) => (
                      <label key={method.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="contactMethod"
                          value={method.value}
                          checked={contactForm.method === method.value}
                          onChange={(e) => setContactForm(prev => ({ ...prev, method: e.target.value as any }))}
                          className="text-green-800"
                        />
                        <method.icon size={16} className="text-glass-muted" />
                        <span className="text-glass">{method.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Input
                  label="Subject"
                  type="text"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Payment reminder, maintenance request, etc."
                />

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-glass">Message</label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    rows={5}
                    className="w-full px-3 py-2 rounded-lg glass-input text-glass placeholder-glass-muted"
                    placeholder="Type your message here..."
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => setShowContactTenant(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleContactTenant}
                    loading={loading}
                    className="flex-1 flex items-center gap-2"
                  >
                    <Send size={16} />
                    Send Message
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 glass rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-green-800" />
                  </div>
                  <h2 className="text-2xl font-bold text-glass">Upload Document</h2>
                </div>
                <button
                  onClick={() => setShowUploadDocument(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-glass-muted" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="glass rounded-lg p-4">
                  <h3 className="font-medium text-glass mb-2">Property</h3>
                  <p className="text-glass">{property.name}</p>
                </div>

                <div 
                  className="border-2 border-dashed border-white border-opacity-30 rounded-lg p-6 text-center hover:border-green-800 transition-colors cursor-pointer"
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload size={32} className="mx-auto text-glass-muted mb-4" />
                  <p className="text-glass-muted mb-4">
                    Drag and drop files here, or click to browse
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="document-upload"
                  />
                  <label htmlFor="document-upload">
                    <Button variant="outline" className="cursor-pointer" type="button">
                      Choose Files
                    </Button>
                  </label>
                </div>

                {uploadFiles.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-glass">Selected Files ({uploadFiles.length})</h3>
                    {uploadFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText size={20} className="text-glass-muted" />
                          <div>
                            <p className="font-medium text-glass">{file.name}</p>
                            <p className="text-sm text-glass-muted">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1 hover:bg-red-100 hover:bg-opacity-20 rounded transition-colors"
                        >
                          <X size={16} className="text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={() => setShowUploadDocument(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUploadDocument}
                    loading={loading}
                    disabled={uploadFiles.length === 0}
                    className="flex-1"
                  >
                    Upload Documents
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {showEditProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 glass rounded-lg flex items-center justify-center">
                    <Edit className="w-5 h-5 text-green-800" />
                  </div>
                  <h2 className="text-2xl font-bold text-glass">Edit Property</h2>
                </div>
                <button
                  onClick={() => setShowEditProperty(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-glass-muted" />
                </button>
              </div>

              <div className="space-y-6">
                <Input
                  label="Property Name"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  icon={<Building2 size={18} />}
                />

                <Input
                  label="Address"
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  icon={<MapPin size={18} />}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Monthly Rent (₹)"
                    type="number"
                    value={editForm.rent || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, rent: parseFloat(e.target.value) || 0 }))}
                    icon={<IndianRupee size={18} />}
                  />

                  <Input
                    label="Security Deposit (₹)"
                    type="number"
                    value={editForm.securityDeposit || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, securityDeposit: parseFloat(e.target.value) || 0 }))}
                    icon={<IndianRupee size={18} />}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-glass">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg glass-input text-glass placeholder-glass-muted"
                    placeholder="Property description..."
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => setShowEditProperty(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEditProperty}
                    loading={loading}
                    className="flex-1 flex items-center gap-2"
                  >
                    <Save size={16} />
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-glass">Delete Property</h3>
                  <p className="text-glass-muted">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-glass-muted">
                  Are you sure you want to delete "{property.name}"? This will permanently remove 
                  the property and all associated data including payment history and documents.
                </p>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowDeleteConfirm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteProperty}
                    loading={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    Delete Property
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};