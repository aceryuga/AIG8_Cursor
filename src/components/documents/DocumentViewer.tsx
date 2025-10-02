import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, LogOut, Bell, HelpCircle, User, Download, Share2, CreditCard as Edit, Trash2, FileText, Calendar, Tag, Home, Eye, ZoomIn, ZoomOut, RotateCw, Maximize, Copy, ExternalLink, AlertTriangle, CheckCircle, Clock, Image, FileSpreadsheet, File } from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { useAuth } from '../../hooks/useAuth';

interface Document {
  id: string;
  name: string;
  category: 'lease' | 'legal' | 'financial' | 'maintenance' | 'insurance' | 'other';
  propertyName: string;
  propertyId: string;
  type: 'pdf' | 'image' | 'excel' | 'word';
  size: string;
  uploadDate: string;
  expiryDate?: string;
  status: 'active' | 'expiring' | 'expired';
  thumbnail: string;
  description: string;
  tags: string[];
  uploadedBy: string;
  lastModified: string;
  downloadCount: number;
  ocrText?: string;
}

interface RelatedDocument {
  id: string;
  name: string;
  type: string;
  thumbnail: string;
}

const mockDocument: Document = {
  id: '1',
  name: 'Lease Agreement - Green Valley Apartment',
  category: 'lease',
  propertyName: 'Green Valley Apartment',
  propertyId: '1',
  type: 'pdf',
  size: '2.5 MB',
  uploadDate: '2024-01-15',
  expiryDate: '2025-12-31',
  status: 'active',
  thumbnail: 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=800',
  description: 'Main lease agreement with tenant Amit Sharma for Green Valley Apartment. Includes all terms, conditions, and rental details.',
  tags: ['lease', 'contract', 'amit-sharma', '2024'],
  uploadedBy: 'Rajesh Kumar',
  lastModified: '2024-01-15',
  downloadCount: 5,
  ocrText: 'LEASE AGREEMENT\n\nThis lease agreement is entered into between Rajesh Kumar (Landlord) and Amit Sharma (Tenant) for the property located at Green Valley Apartment, Sector 18, Noida.\n\nTerm: 11 months starting from January 1, 2024\nRent: ₹15,000 per month\nSecurity Deposit: ₹30,000\n\nThe tenant agrees to pay rent on or before the 5th of each month...'
};

const mockRelatedDocuments: RelatedDocument[] = [
  {
    id: '2',
    name: 'Property Insurance - Green Valley',
    type: 'pdf',
    thumbnail: 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=200'
  },
  {
    id: '3',
    name: 'Tenant ID Proof - Amit Sharma',
    type: 'image',
    thumbnail: 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=200'
  },
  {
    id: '4',
    name: 'Property Photos - Green Valley',
    type: 'image',
    thumbnail: 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=200'
  }
];

export const DocumentViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [showNotifications, setShowNotifications] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showOCR, setShowOCR] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const currentDocument = mockDocument; // In real app, fetch by id

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-100';
      case 'expiring': return 'text-orange-600 bg-orange-100';
      case 'expired': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle size={16} />;
      case 'expiring': return <Clock size={16} />;
      case 'expired': return <AlertTriangle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-6 h-6 text-red-600" />;
      case 'excel': return <FileSpreadsheet className="w-6 h-6 text-green-600" />;
      case 'image': return <Image className="w-6 h-6 text-blue-600" />;
      default: return <File className="w-6 h-6 text-gray-600" />;
    }
  };

  const handleDownload = () => {
    // Simulate download
    const link = document.createElement('a');
    link.href = currentDocument.thumbnail;
    link.download = currentDocument.name;
    link.click();
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this document?')) {
      navigate('/documents');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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
                      item.path === '/documents'
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
          <Link to="/documents" className="text-glass-muted hover:text-glass flex items-center gap-1">
            <ArrowLeft size={16} />
            Documents
          </Link>
          <span className="text-glass-muted">/</span>
          <span className="text-glass truncate">{currentDocument.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Document Preview */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-xl overflow-hidden">
              {/* Preview Header */}
              <div className="p-4 border-b border-white border-opacity-20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon(currentDocument.type)}
                    <div>
                      <h2 className="font-semibold text-glass">{currentDocument.name}</h2>
                      <p className="text-sm text-glass-muted">{currentDocument.size}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setZoom(Math.max(50, zoom - 25))}>
                      <ZoomOut size={16} />
                    </Button>
                    <span className="text-sm text-glass-muted px-2">{zoom}%</span>
                    <Button variant="ghost" size="sm" onClick={() => setZoom(Math.min(200, zoom + 25))}>
                      <ZoomIn size={16} />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <RotateCw size={16} />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Maximize size={16} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Preview Content */}
              <div className="p-4 bg-gray-50 min-h-96 flex items-center justify-center">
                <div 
                  className="bg-white shadow-lg rounded-lg overflow-hidden transition-transform duration-300"
                  style={{ transform: `scale(${zoom / 100})` }}
                >
                  <img
                    src={currentDocument.thumbnail}
                    alt={currentDocument.name}
                    className="w-full h-auto max-w-2xl"
                  />
                </div>
              </div>

              {/* OCR Text Section */}
              {currentDocument.ocrText && (
                <div className="border-t border-white border-opacity-20">
                  <button
                    onClick={() => setShowOCR(!showOCR)}
                    className="w-full p-4 text-left hover:bg-white hover:bg-opacity-5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye size={16} className="text-glass-muted" />
                        <span className="font-medium text-glass">Extracted Text</span>
                      </div>
                      <span className="text-glass-muted">{showOCR ? '−' : '+'}</span>
                    </div>
                  </button>
                  
                  {showOCR && (
                    <div className="px-4 pb-4">
                      <div className="glass rounded-lg p-4 relative">
                        <button
                          onClick={() => copyToClipboard(currentDocument.ocrText!)}
                          className="absolute top-2 right-2 p-1 hover:bg-white hover:bg-opacity-20 rounded"
                        >
                          <Copy size={14} className="text-glass-muted" />
                        </button>
                        <pre className="text-sm text-glass whitespace-pre-wrap font-mono">
                          {currentDocument.ocrText}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Document Details Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-semibold text-glass mb-4">Actions</h3>
              <div className="space-y-3">
                <Button onClick={handleDownload} className="w-full justify-start">
                  <Download size={16} className="mr-2" />
                  Download
                </Button>
                <Button onClick={handleShare} variant="outline" className="w-full justify-start">
                  <Share2 size={16} className="mr-2" />
                  Share
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Edit size={16} className="mr-2" />
                  Edit Details
                </Button>
                <Button onClick={handleDelete} variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                  <Trash2 size={16} className="mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Document Information */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-semibold text-glass mb-4">Document Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-glass-muted">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentDocument.status)}`}>
                      {getStatusIcon(currentDocument.status)}
                      {currentDocument.status}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-glass-muted">Category</label>
                  <p className="mt-1 text-glass capitalize">{currentDocument.category.replace('_', ' ')}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-glass-muted">Property</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Home size={14} className="text-glass-muted" />
                    <Link to={`/property/${currentDocument.propertyId}`} className="text-green-800 hover:text-green-900">
                      {currentDocument.propertyName}
                    </Link>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-glass-muted">Upload Date</label>
                  <p className="mt-1 text-glass">{new Date(currentDocument.uploadDate).toLocaleDateString()}</p>
                </div>

                {currentDocument.expiryDate && (
                  <div>
                    <label className="text-sm font-medium text-glass-muted">Expiry Date</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Calendar size={14} className="text-glass-muted" />
                      <p className="text-glass">{new Date(currentDocument.expiryDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-glass-muted">File Size</label>
                  <p className="mt-1 text-glass">{currentDocument.size}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-glass-muted">Downloads</label>
                  <p className="mt-1 text-glass">{currentDocument.downloadCount} times</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-glass-muted">Uploaded By</label>
                  <p className="mt-1 text-glass">{currentDocument.uploadedBy}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-semibold text-glass mb-4">Description</h3>
              <p className="text-glass-muted">{currentDocument.description}</p>
            </div>

            {/* Tags */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-semibold text-glass mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {currentDocument.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 glass rounded-full text-xs text-glass">
                    <Tag size={12} className="inline mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Related Documents */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-semibold text-glass mb-4">Related Documents</h3>
              <div className="space-y-3">
                {mockRelatedDocuments.map((relatedDoc) => (
                  <Link
                    key={relatedDoc.id}
                    to={`/documents/view/${relatedDoc.id}`}
                    className="flex items-center gap-3 p-2 glass rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors"
                  >
                    <img
                      src={relatedDoc.thumbnail}
                      alt={relatedDoc.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-glass truncate">{relatedDoc.name}</p>
                      <p className="text-xs text-glass-muted uppercase">{relatedDoc.type}</p>
                    </div>
                    <ExternalLink size={14} className="text-glass-muted" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="glass-card rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-glass">Share Document</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                >
                  <X size={16} className="text-glass-muted" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-glass mb-2">Share Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={`${window.location.origin}/documents/view/${currentDocument.id}`}
                      readOnly
                      className="flex-1 glass-input rounded-lg px-3 py-2 text-glass text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(`${window.location.origin}/documents/view/${currentDocument.id}`)}
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    Email
                  </Button>
                  <Button variant="outline" className="flex-1">
                    WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};