import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, IndianRupee, User, Phone, Mail, Calendar, FileText, Upload, CreditCard, Building2, LogOut, HelpCircle, CreditCard as Edit, Trash2, Download, Eye, CheckCircle, AlertTriangle, Clock, X, Send, MessageCircle, Save, AlertCircle } from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { Input } from '../webapp-ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { calculateRentStatus, PropertyWithLease, Payment as RentPayment } from '../../utils/rentCalculations';
import { getRelativeTime, formatDateDDMMYYYY, fromDateInput, getCurrentISTDateInput } from '../../utils/timezoneUtils';
import { calculateLeaseStatus, getLeaseStatusColor, getLeaseStatusIcon } from '../../utils/leaseStatus';
import { uploadDocument, fetchPropertyDocuments, softDeleteDocument } from '../../utils/documentUpload';
import { updatePropertyCountInSettings } from '../../utils/settingsUtils';
import { ImageWithFallback } from '../ui/ImageWithFallback';
import { PropertyGallery } from './PropertyGallery';
import { PropertyImage } from '../../utils/propertyImages';
import { PaymentService } from '../../services/paymentService';

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
  leaseStatus?: any;
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
  maintenanceCharges: number;
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
  paymentType: 'Rent' | 'Maintenance' | 'Security Deposit' | 'Other';
  paymentTypeDetails: string;
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
  maintenanceCharges: number;
  description: string;
  amenities: string[];
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  leaseStart: string;
  leaseEnd: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  url: string;
  doc_type?: string;
  uploadDate: string;
}

const docTypes = [
  { id: 'lease', name: 'Lease Agreement' },
  { id: 'legal', name: 'Legal Document' },
  { id: 'financial', name: 'Financial Record' },
  { id: 'maintenance', name: 'Maintenance Record' },
  { id: 'insurance', name: 'Insurance Document' },
  { id: 'id_proof', name: 'ID Proof' },
  { id: 'other', name: 'Other' }
];

const availableAmenities = [
  'Parking', 'Security', 'Gym', 'Swimming Pool', 'Garden', 'Power Backup',
  'Elevator', 'Balcony', 'Air Conditioning', 'Furnished', 'Internet', 'Clubhouse'
];


export const PropertyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showContactTenant, setShowContactTenant] = useState(false);
  const [showUploadDocument, setShowUploadDocument] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteTenantConfirm, setShowDeleteTenantConfirm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Supabase data states
  const [property, setProperty] = useState<Property | null>(null);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [leaseId, setLeaseId] = useState<string>('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    amount: 0,
    date: getCurrentISTDateInput(), // Current date in IST for input
    method: '',
    reference: '',
    notes: '',
    paymentType: 'Rent',
    paymentTypeDetails: ''
  });
  const [contactForm, setContactForm] = useState<ContactForm>({
    subject: '',
    message: '',
    method: 'email'
  });
  const [editForm, setEditForm] = useState<EditPropertyForm>({
    name: '',
    address: '',
    rent: 0,
    securityDeposit: 0,
    maintenanceCharges: 0,
    description: '',
    amenities: [],
    tenantName: '',
    tenantPhone: '',
    tenantEmail: '',
    leaseStart: '',
    leaseEnd: ''
  });
  const [originalProperty, setOriginalProperty] = useState<Property | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>('other');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Property images state for synchronization
  const [propertyImages, setPropertyImages] = useState<PropertyImage[]>([]);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Fetch property images
  const fetchPropertyImages = async () => {
    if (!property?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('property_images')
        .select('*')
        .eq('property_id', property.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching property images:', error);
      } else {
        setPropertyImages(data || []);
      }
    } catch (err) {
      console.warn('Error fetching property images:', err);
    }
  };

  // Update property image based on primary image from gallery
  const updatePropertyImageFromGallery = () => {
    if (propertyImages.length > 0) {
      const primaryImage = propertyImages.find(img => img.is_primary);
      if (primaryImage && property?.image !== primaryImage.image_url) {
        setProperty(prev => prev ? {
          ...prev,
          image: primaryImage.image_url
        } : null);
      }
    } else if (property?.image !== '/placeholder-currentProperty.jpg') {
      // No images in gallery, set to placeholder
      setProperty(prev => prev ? {
        ...prev,
        image: '/placeholder-currentProperty.jpg'
      } : null);
    }
  };

  // Function to fetch payment data using centralized service
  const fetchPaymentData = async () => {
    if (!id) return;
    
    try {
      const validPayments = await PaymentService.getPaymentsForProperty(id);

      const formattedPayments: PaymentHistory[] = validPayments.map(payment => ({
        id: payment.id,
        date: payment.payment_date,
        amount: payment.payment_amount,
        status: payment.status === 'completed' ? 'paid' : payment.status as 'pending' | 'overdue',
        method: payment.payment_method,
        reference: payment.reference || ''
      }));
      setPayments(formattedPayments);

      // Also store rent payments for status calculation
      const rentPaymentsData: RentPayment[] = validPayments.map(payment => ({
        id: payment.id,
        lease_id: (payment.leases as any)?.id || '',
        payment_date: payment.payment_date,
        payment_amount: payment.payment_amount,
        status: payment.status as 'completed' | 'pending' | 'failed'
      }));
      
      setRentPayments(rentPaymentsData);
    } catch (err) {
      console.warn('Error fetching payment data:', err);
    }
  };

  // Fetch property data from Supabase
  useEffect(() => {
    if (!id || !user?.id) {
      setLoading(false);
      return;
    }

    const fetchProperty = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('properties')
          .select(`
            *,
            leases(
              id,
              monthly_rent,
              security_deposit,
              maintenance_charges,
              start_date,
              end_date,
              is_active,
              tenants(
                name,
                phone,
                email
              )
            ),
            property_images!left(
              id,
              image_url,
              is_primary
            )
          `)
          .eq('id', id)
          .eq('owner_id', user.id)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        if (data) {
          const activeLease = data.leases && data.leases.length > 0 ? 
            data.leases.find((lease: any) => lease.is_active) : null;
          const tenant = activeLease?.tenants || null;

          // Store the lease ID for payment status calculation
          if (activeLease) {
            setLeaseId(activeLease.id);
          } else {
            setLeaseId('');
          }

          // Calculate lease status
          const leaseStatus = activeLease?.end_date ? 
            calculateLeaseStatus(activeLease.end_date) : 
            { status: 'active', message: 'No Lease', daysRemaining: 0, priority: 1 };

          const propertyData: Property = {
            id: data.id,
            name: data.name || 'Unnamed Property',
            address: data.address || 'Address not available',
            rent: activeLease?.monthly_rent || 0,
            tenant: activeLease && tenant?.name ? tenant.name : 'Vacant',
            tenantPhone: activeLease && tenant?.phone ? tenant.phone : '',
            tenantEmail: activeLease && tenant?.email ? tenant.email : '',
            status: (data.status as 'occupied' | 'vacant' | 'maintenance') || 'vacant',
            paymentStatus: 'pending' as const, // Will be calculated after payments are loaded
            leaseStatus: leaseStatus,
            image: data.property_images && data.property_images.length > 0 ? 
              data.property_images.find((img: any) => img.is_primary)?.image_url || 
              data.property_images[0]?.image_url || 
              '/placeholder-currentProperty.jpg' : '/placeholder-currentProperty.jpg',
            dueDate: activeLease?.end_date || 'No lease',
            propertyType: (data.property_type as 'apartment' | 'villa' | 'office' | 'shop') || 'apartment',
            bedrooms: data.bedrooms || 1,
            area: data.area || 0,
            description: data.description || '',
            amenities: data.amenities ? data.amenities.split(',') : [],
            leaseStart: activeLease?.start_date || '',
            leaseEnd: activeLease?.end_date || '',
            securityDeposit: activeLease?.security_deposit || 0,
            maintenanceCharges: activeLease?.maintenance_charges || 0
          };

          setProperty(propertyData);
        }

        // Fetch payment history using centralized service
        const validPayments = await PaymentService.getPaymentsForProperty(id);

        const formattedPayments: PaymentHistory[] = validPayments.map(payment => ({
          id: payment.id,
          date: payment.payment_date,
          amount: payment.payment_amount,
          status: payment.status === 'completed' ? 'paid' : payment.status as 'pending' | 'overdue',
          method: payment.payment_method,
          reference: payment.reference || ''
        }));
        setPayments(formattedPayments);

        // Also store rent payments for status calculation
        const rentPaymentsData: RentPayment[] = validPayments.map(payment => ({
          id: payment.id,
          lease_id: (payment.leases as any)?.id || '',
          payment_date: payment.payment_date,
          payment_amount: payment.payment_amount,
          status: payment.status as 'completed' | 'pending' | 'failed'
        }));
        
        setRentPayments(rentPaymentsData);

        // Fetch documents using the new utility
        try {
          const documentsData = await fetchPropertyDocuments(id);
          const formattedDocuments: Document[] = documentsData.map(doc => ({
            id: doc.id,
            name: doc.name,
            type: doc.doc_type || 'Unknown',
            size: 'Unknown', // Size not stored in actual table
            url: doc.url,
            doc_type: doc.doc_type,
            uploadDate: doc.uploaded_at || ''
          }));
          setDocuments(formattedDocuments);
        } catch (docError) {
          console.warn('Error fetching documents:', docError);
          setDocuments([]);
        }

        // Fetch maintenance requests
        const { data: maintenanceData, error: maintenanceError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('property_id', id)
          .order('created_at', { ascending: false });

        if (maintenanceError) {
          console.warn('Error fetching maintenance requests:', maintenanceError);
        } else {
          setMaintenanceRequests(maintenanceData || []);
        }
      } catch (err: any) {
        console.error('Error fetching property:', err);
        setError(err.message || 'Failed to load property details');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id, user?.id]);

  // Fetch property images when property is loaded and sync with property image
  useEffect(() => {
    if (property?.id) {
      fetchPropertyImages();
    }
  }, [property?.id]);

  // Sync property image with gallery primary image when images change
  useEffect(() => {
    updatePropertyImageFromGallery();
  }, [propertyImages]);


  // Calculate payment status when lease and payments data are available
  useEffect(() => {
    if (property && leaseId && rentPayments.length >= 0 && property.status === 'occupied') {
      const propertyWithLease: PropertyWithLease = {
        id: property.id,
        lease_id: leaseId,
        monthly_rent: property.rent,
        start_date: property.leaseStart,
        is_active: true
      };

      const rentStatus = calculateRentStatus(propertyWithLease, rentPayments);
      
      // Only update if the payment status has actually changed
      if (property.paymentStatus !== rentStatus.status) {
        setProperty(prev => prev ? {
          ...prev,
          paymentStatus: rentStatus.status
        } : null);
      }
    }
  }, [leaseId, rentPayments, property?.id, property?.rent, property?.leaseStart, property?.status]);

  // Handle leaseId when property status changes
  useEffect(() => {
    if (property) {
      if (property.status === 'vacant' || property.tenant === 'Vacant') {
        setLeaseId('');
      }
    }
  }, [property?.status, property?.tenant]);

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  // Use real property data or fallback to mock
  const currentProperty = property;

  // Show loading state while property data is being fetched
  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden floating-orbs">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-lg text-glass-muted">Loading property details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if property not found
  if (!currentProperty) {
    return (
      <div className="min-h-screen relative overflow-hidden floating-orbs">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-glass mb-4">Property Not Found</h1>
            <p className="text-lg text-glass-muted mb-6">The property you're looking for doesn't exist or has been removed.</p>
            <Link to="/properties" className="inline-flex items-center gap-2 px-6 py-3 bg-white bg-opacity-10 rounded-lg text-white hover:bg-opacity-20 transition-all">
              <ArrowLeft size={16} />
              Back to Properties
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
    if (!paymentForm.amount || !paymentForm.date || !paymentForm.method) {
      alert('Please fill in all required fields');
      return;
    }

    if (paymentForm.paymentType === 'Other' && !paymentForm.paymentTypeDetails.trim()) {
      alert('Please provide payment details when "Other" is selected');
      return;
    }

    setLoading(true);
    
    try {
      if (!leaseId) {
        throw new Error('No active lease found for this property');
      }

      // Insert payment into Supabase
      const { error } = await supabase
        .from('payments')
        .insert({
          lease_id: leaseId,
          payment_amount: paymentForm.amount,
          payment_date: fromDateInput(paymentForm.date), // Convert to UTC for storage
          payment_method: paymentForm.method,
          reference: paymentForm.reference || null,
          notes: paymentForm.notes || null,
          payment_type: paymentForm.paymentType,
          payment_type_details: paymentForm.paymentType === 'Other' ? paymentForm.paymentTypeDetails : null,
          status: 'completed'
        });

      if (error) {
        throw error;
      }

      // Reset form
      setPaymentForm({
        amount: 0,
        date: getCurrentISTDateInput(), // Current date in IST for input
        method: '',
        reference: '',
        notes: '',
        paymentType: 'Rent',
        paymentTypeDetails: ''
      });

      setLoading(false);
      setShowRecordPayment(false);
      
      // Refresh payment data
      await fetchPaymentData();
      
      alert('Payment recorded successfully!');
    } catch (err: any) {
      console.error('Error recording payment:', err);
      alert('Failed to record payment: ' + err.message);
      setLoading(false);
    }
  };

  const handleContactTenant = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setShowContactTenant(false);
    alert(`${contactForm.method === 'email' ? 'Email' : contactForm.method === 'sms' ? 'SMS' : 'WhatsApp message'} sent successfully!`);
  };

  const handleCall = () => {
    window.open(`tel:${currentProperty.tenantPhone}`, '_self');
  };

  const handleEmail = () => {
    window.open(`mailto:${currentProperty.tenantEmail}`, '_self');
  };

  const handleUploadDocument = async () => {
    console.log('PropertyDetails: handleUploadDocument called, files:', uploadFiles.length, 'property:', property?.id);
    if (uploadFiles.length === 0 || !property) {
      console.log('No files or property, returning');
      return;
    }
    
    console.log('Starting upload process...');
    setUploading(true);
    setUploadProgress({});
    
    try {
      const uploadPromises = uploadFiles.map(async (file, index) => {
        const fileId = `${Date.now()}-${index}`;
        
        // Update progress to show uploading
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        
        try {
                const uploadedDoc = await uploadDocument(
                  file,
                  property.id,
                  undefined, // leaseId
                  undefined, // tenantId
                  selectedDocType, // docType
                  (progress) => {
                    setUploadProgress(prev => ({ ...prev, [fileId]: progress.progress }));
                  }
                );
          
          // Update progress to show completed
          setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
          
          return uploadedDoc;
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          throw error;
        }
      });
      
      await Promise.all(uploadPromises);
      
      // Refresh documents list
      const documentsData = await fetchPropertyDocuments(property.id);
      const formattedDocuments: Document[] = documentsData.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.doc_type || 'Unknown',
        size: 'Unknown', // Size not stored in actual table
        url: doc.url,
        doc_type: doc.doc_type,
        uploadDate: doc.uploaded_at || ''
      }));
      setDocuments(formattedDocuments);
      
      setShowUploadDocument(false);
      setUploadFiles([]);
      setUploadProgress({});
      setSelectedDocType('other');
      alert(`${uploadFiles.length} document(s) uploaded successfully!`);
      
    } catch (error) {
      console.error('Error uploading documents:', error);
      alert('Failed to upload documents. Please try again.');
    } finally {
      setUploading(false);
    }
  };


  const handleEnterEditMode = () => {
    if (!property) return;
    
    // Store original property data for cancel functionality
    setOriginalProperty({ ...property });
    
    // Populate edit form with current property data
    setEditForm({
      name: property.name,
      address: property.address,
      rent: property.rent,
      securityDeposit: property.securityDeposit,
      maintenanceCharges: property.maintenanceCharges || 0,
      description: property.description,
      amenities: property.amenities || [],
      tenantName: property.tenant || '',
      tenantPhone: property.tenantPhone || '',
      tenantEmail: property.tenantEmail || '',
      leaseStart: property.leaseStart || '',
      leaseEnd: property.leaseEnd || ''
    });
    
    setIsEditMode(true);
  };

  const handleSaveChanges = async () => {
    if (!property) return;
    
    setLoading(true);
    try {
      // Update property details
      const { error: propError } = await supabase
        .from('properties')
        .update({
          name: editForm.name,
          address: editForm.address,
          description: editForm.description,
          amenities: editForm.amenities.join(',')
        })
        .eq('id', property.id);

      if (propError) {
        throw propError;
      }

      // Update lease details if there's an active lease
      if (leaseId) {
        // Create timestamp in local timezone format for updated_at
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
        
        const currentTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;

        const { error: leaseError } = await supabase
          .from('leases')
          .update({
            monthly_rent: editForm.rent,
            security_deposit: editForm.securityDeposit,
            maintenance_charges: editForm.maintenanceCharges,
            start_date: editForm.leaseStart,
            end_date: editForm.leaseEnd,
            updated_at: currentTime
          })
          .eq('id', leaseId)
          .eq('is_active', true);

        if (leaseError) {
          console.warn('Error updating lease:', leaseError);
        }
      }

      // Handle tenant management
      if (editForm.tenantName.trim()) {
        // Check if there's already an active lease
        if (leaseId) {
          // Update existing tenant
          const { data: leaseData, error: leaseFetchError } = await supabase
            .from('leases')
            .select('tenant_id')
            .eq('id', leaseId)
            .eq('is_active', true)
            .single();

          if (!leaseFetchError && leaseData?.tenant_id) {
            const { error: tenantError } = await supabase
              .from('tenants')
              .update({
                name: editForm.tenantName,
                phone: editForm.tenantPhone,
                email: editForm.tenantEmail
              })
              .eq('id', leaseData.tenant_id);

            if (tenantError) {
              console.warn('Error updating tenant:', tenantError);
            }
          }
        } else {
          // Create new tenant and lease
          const tenantId = crypto.randomUUID();
          const newLeaseId = crypto.randomUUID();
          
          // Create timestamp in local timezone format
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const seconds = String(now.getSeconds()).padStart(2, '0');
          const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
          
          const currentTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;

          // Create tenant
          const { error: tenantError } = await supabase
            .from('tenants')
            .insert({
              id: tenantId,
              name: editForm.tenantName,
              phone: editForm.tenantPhone,
              email: editForm.tenantEmail,
              current_property_id: property.id,
            });

          if (tenantError) {
            console.warn('Error creating tenant:', tenantError);
          } else {
            // Create lease
            const { error: leaseError } = await supabase
              .from('leases')
              .insert({
                id: newLeaseId,
                property_id: property.id,
                tenant_id: tenantId,
                start_date: editForm.leaseStart,
                end_date: editForm.leaseEnd,
                monthly_rent: editForm.rent,
                security_deposit: editForm.securityDeposit,
                maintenance_charges: editForm.maintenanceCharges,
                is_active: true,
                created_at: currentTime,
                updated_at: currentTime
              });

            if (leaseError) {
              console.warn('Error creating lease:', leaseError);
            } else {
              // Update property status to occupied
              await supabase
                .from('properties')
                .update({ status: 'occupied' })
                .eq('id', property.id);
            }
          }
        }
      } else if (leaseId) {
        // If tenant name is empty but there's a lease, deactivate the lease
        const { error: leaseError } = await supabase
          .from('leases')
          .update({ 
            is_active: false,
            end_date: fromDateInput(getCurrentISTDateInput()) // Convert to UTC for storage
          })
          .eq('id', leaseId)
          .eq('is_active', true);

        if (leaseError) {
          console.warn('Error deactivating lease:', leaseError);
        } else {
          // Update property status to vacant
          await supabase
            .from('properties')
            .update({ status: 'vacant' })
            .eq('id', property.id);
          
          // Reset leaseId since the lease is now inactive
          setLeaseId('');
        }
      }

      // Update the property state
      setProperty(prev => prev ? {
        ...prev,
        name: editForm.name,
        address: editForm.address,
        description: editForm.description,
        rent: editForm.rent,
        securityDeposit: editForm.securityDeposit,
        maintenanceCharges: editForm.maintenanceCharges,
        amenities: editForm.amenities,
        tenant: editForm.tenantName.trim() ? editForm.tenantName : 'Vacant',
        tenantPhone: editForm.tenantName.trim() ? editForm.tenantPhone : '',
        tenantEmail: editForm.tenantName.trim() ? editForm.tenantEmail : '',
        leaseStart: editForm.tenantName.trim() ? editForm.leaseStart : '',
        leaseEnd: editForm.tenantName.trim() ? editForm.leaseEnd : '',
        status: editForm.tenantName.trim() ? 'occupied' : 'vacant'
      } : null);

      setIsEditMode(false);
      setOriginalProperty(null);
      alert('Property updated successfully!');
    } catch (err: any) {
      console.error('Error updating property:', err);
      alert('Failed to update property: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (originalProperty) {
      setProperty(originalProperty);
      // Reset leaseId to match the original property state
      if (originalProperty.tenant && originalProperty.tenant !== 'Vacant') {
        // If there was a tenant, we need to fetch the lease ID again
        // This will be handled by the useEffect that watches for property changes
      } else {
        setLeaseId('');
      }
    }
    setIsEditMode(false);
    setOriginalProperty(null);
    setEditForm({
      name: '',
      address: '',
      rent: 0,
      securityDeposit: 0,
      maintenanceCharges: 0,
      description: '',
      amenities: [],
      tenantName: '',
      tenantPhone: '',
      tenantEmail: '',
      leaseStart: '',
      leaseEnd: ''
    });
  };

  const handleAmenityToggle = (amenity: string) => {
    setEditForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleDeleteProperty = async () => {
    if (!property) return;
    
    setLoading(true);
    try {
      // Store timestamp in local timezone format to match existing data
      const now = new Date();
      // Create timestamp in the same format as existing data (local timezone without Z)
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
      
      const currentTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
      const currentDate = `${year}-${month}-${day}`;
      
      // Soft delete: set active = 'N' and status = 'vacant' with updated_at timestamp
      const { error: propError } = await supabase
        .from('properties')
        .update({ 
          active: 'N',
          status: 'vacant',
          updated_at: currentTime  // Local timezone timestamp
        })
        .eq('id', property.id);

      if (propError) {
        throw propError;
      }

      // End any active leases for this property with updated_at timestamp
      const { error: leaseError } = await supabase
        .from('leases')
        .update({ 
          is_active: false, 
          end_date: currentDate,
          updated_at: currentTime  // Local timezone timestamp
        })
        .eq('property_id', property.id)
        .eq('is_active', true);

      if (leaseError) {
        console.warn('Error ending leases:', leaseError);
      }

      // Update property count in user settings
      if (user?.id) {
        await updatePropertyCountInSettings(user.id);
      }

      setShowDeleteConfirm(false);
      alert('Property deactivated successfully!');
      navigate('/properties');
    } catch (err: any) {
      console.error('Error deactivating property:', err);
      alert('Failed to deactivate property: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!property || !leaseId) return;
    
    setLoading(true);
    try {
      // Store timestamp in local timezone format to match existing data
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
      
      const currentTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
      const currentDate = `${year}-${month}-${day}`;
      
      // Deactivate the lease
      const { error: leaseError } = await supabase
        .from('leases')
        .update({ 
          is_active: false, 
          end_date: currentDate,
          updated_at: currentTime
        })
        .eq('id', leaseId)
        .eq('is_active', true);

      if (leaseError) {
        throw leaseError;
      }

      // Update property status to vacant
      const { error: propError } = await supabase
        .from('properties')
        .update({ 
          status: 'vacant',
          updated_at: currentTime
        })
        .eq('id', property.id);

      if (propError) {
        console.warn('Error updating property status:', propError);
      }

      // Update the property state
      setProperty(prev => prev ? {
        ...prev,
        tenant: 'Vacant',
        tenantPhone: '',
        tenantEmail: '',
        leaseStart: '',
        leaseEnd: '',
        status: 'vacant'
      } : null);

      // Reset leaseId since the lease is now inactive
      setLeaseId('');

      setShowDeleteTenantConfirm(false);
      alert('Tenant removed successfully! Property is now vacant.');
    } catch (err: any) {
      console.error('Error removing tenant:', err);
      alert('Failed to remove tenant: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      await softDeleteDocument(documentId);
      
      // Refresh documents list
      if (property) {
        const documentsData = await fetchPropertyDocuments(property.id);
        const formattedDocuments: Document[] = documentsData.map(doc => ({
          id: doc.id,
          name: doc.name,
          type: doc.doc_type || 'Unknown',
          size: 'Unknown',
          url: doc.url,
          doc_type: doc.doc_type,
          uploadDate: doc.uploaded_at || ''
        }));
        setDocuments(formattedDocuments);
      }
      
      alert('Document deleted successfully!');
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
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
    { id: 'gallery', label: 'Gallery' },
    { id: 'payments', label: 'Payment History' },
    { id: 'documents', label: 'Documents' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'tenant', label: 'Tenant Details' }
  ];

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden floating-orbs flex items-center justify-center">
        <div className="text-glass">Loading property details...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden floating-orbs flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

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
                  { name: 'Gallery', path: '/gallery' },
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
          <span className="text-glass">{currentProperty.name}</span>
        </div>

        {/* Edit Mode Controls */}
        {isEditMode && (
          <div className="glass-card rounded-xl p-4 mb-6 border-2 border-green-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 glass rounded-lg flex items-center justify-center">
                  <Edit className="w-5 h-5 text-green-800" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-glass">Edit Mode</h2>
                  <p className="text-sm text-glass-muted">Make changes to the property details below</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <X size={16} />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  loading={loading}
                  className="flex items-center gap-2"
                >
                  <Save size={16} />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Property Header */}
        <div className="glass-card rounded-xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-80 h-60 relative">
              <ImageWithFallback
                src={currentProperty.image}
                alt={currentProperty.name}
                className="w-full h-full rounded-lg object-cover"
                fallbackText="No Image"
              />
              
              {/* Gallery management hint in edit mode */}
              {isEditMode && (
                <div className="absolute bottom-2 right-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('gallery')}
                    className="bg-white bg-opacity-20 border-white text-white hover:bg-opacity-30"
                  >
                    <Eye size={14} className="mr-1" />
                    Manage Images
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {isEditMode ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-glass mb-2">Property Name</label>
                        <Input
                          label=""
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          icon={<Building2 size={18} />}
                          placeholder="Enter property name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-glass mb-2">Address</label>
                        <Input
                          label=""
                          type="text"
                          value={editForm.address}
                          onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                          icon={<MapPin size={18} />}
                          placeholder="Enter property address"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h1 className="text-3xl font-bold text-glass mb-2">{currentProperty.name}</h1>
                      <p className="text-glass-muted flex items-center gap-1 mb-2">
                        <MapPin size={16} />
                        {currentProperty.address}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentProperty.status)}`}>
                        {currentProperty.status}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(currentProperty.paymentStatus)}`}>
                        {currentProperty.paymentStatus}
                      </span>
                    </div>
                    {currentProperty.leaseStatus && currentProperty.leaseStatus.status !== 'active' && (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getLeaseStatusColor(currentProperty.leaseStatus.status)}`}>
                        {getLeaseStatusIcon(currentProperty.leaseStatus.status)} {currentProperty.leaseStatus.message}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {!isEditMode && (
                    <Button variant="outline" size="sm" onClick={handleEnterEditMode}>
                      <Edit size={16} className="mr-1" />
                      Edit
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 size={16} className="mr-1" />
                    Delete
                  </Button>
                </div>
              </div>

              {isEditMode ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="glass rounded-lg p-3">
                    <p className="text-2xl font-bold text-glass">{currentProperty.area || 0}</p>
                    <p className="text-sm text-glass-muted">Sq Ft</p>
                  </div>
                  {currentProperty.bedrooms && (
                    <div className="glass rounded-lg p-3">
                      <p className="text-2xl font-bold text-glass">{currentProperty.bedrooms}</p>
                      <p className="text-sm text-glass-muted">Bedrooms</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                  <div className="glass rounded-lg p-3">
                    <p className="text-2xl font-bold text-glass">₹{(currentProperty.rent || 0).toLocaleString()}</p>
                    <p className="text-sm text-glass-muted">Monthly Rent</p>
                  </div>
                  <div className="glass rounded-lg p-3">
                    <p className="text-2xl font-bold text-glass">{currentProperty.area || 0}</p>
                    <p className="text-sm text-glass-muted">Sq Ft</p>
                  </div>
                  {currentProperty.bedrooms && (
                    <div className="glass rounded-lg p-3">
                      <p className="text-2xl font-bold text-glass">{currentProperty.bedrooms}</p>
                      <p className="text-sm text-glass-muted">Bedrooms</p>
                    </div>
                  )}
                  <div className="glass rounded-lg p-3">
                    <p className="text-2xl font-bold text-glass">₹{(currentProperty.securityDeposit || 0).toLocaleString()}</p>
                    <p className="text-sm text-glass-muted">Security Deposit</p>
                  </div>
                  <div className="glass rounded-lg p-3">
                    <p className="text-2xl font-bold text-glass">₹{(currentProperty.maintenanceCharges || 0).toLocaleString()}</p>
                    <p className="text-sm text-glass-muted">Maintenance</p>
                  </div>
                </div>
              )}


              <div className="flex gap-3">
                <Button className="flex items-center gap-2" onClick={() => setShowRecordPayment(true)}>
                  <CreditCard size={16} />
                  Record Payment
                </Button>
                <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowContactTenant(true)}>
                  <Phone size={16} />
                  Contact Tenant
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
                  {isEditMode ? (
                    <div>
                      <label className="block text-sm font-medium text-glass mb-2">Property Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg glass-input text-glass placeholder-glass-muted"
                        placeholder="Enter property description..."
                      />
                    </div>
                  ) : (
                    <p className="text-glass-muted">{currentProperty.description}</p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-glass mb-3">Amenities</h3>
                  {isEditMode ? (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-glass">Select Amenities</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {availableAmenities.map((amenity) => (
                          <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editForm.amenities.includes(amenity)}
                              onChange={() => handleAmenityToggle(amenity)}
                              className="rounded border-white border-opacity-30 bg-white bg-opacity-10 text-green-800 focus:ring-green-800"
                            />
                            <span className="text-sm text-glass">{amenity}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {currentProperty.amenities.map((amenity, index) => (
                        <div key={index} className="glass rounded-lg p-2 text-center">
                          <span className="text-sm text-glass">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-glass mb-3">Property Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-glass-muted">Type:</span>
                        <span className="text-glass capitalize">{currentProperty.propertyType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-glass-muted">Area:</span>
                        <span className="text-glass">{currentProperty.area} sq ft</span>
                      </div>
                      {currentProperty.bedrooms && (
                        <div className="flex justify-between">
                          <span className="text-glass-muted">Bedrooms:</span>
                          <span className="text-glass">{currentProperty.bedrooms}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-glass-muted">Status:</span>
                        <span className={`capitalize ${getStatusColor(currentProperty.status).split(' ')[0]}`}>
                          {currentProperty.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {currentProperty.tenant && currentProperty.tenant !== 'Vacant' && (
                    <div>
                      <h3 className="text-lg font-semibold text-glass mb-3">Lease Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-glass-muted">Start Date:</span>
                          <span className="text-glass">{currentProperty.leaseStart ? formatDateDDMMYYYY(currentProperty.leaseStart) : 'Not set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-glass-muted">End Date:</span>
                          <span className="text-glass">{currentProperty.leaseEnd ? formatDateDDMMYYYY(currentProperty.leaseEnd) : 'Not set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-glass-muted">Monthly Rent:</span>
                          <span className="text-glass">₹{(currentProperty.rent || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-glass-muted">Security Deposit:</span>
                          <span className="text-glass">₹{(currentProperty.securityDeposit || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-glass-muted">Maintenance Charges:</span>
                          <span className="text-glass">₹{(currentProperty.maintenanceCharges || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gallery Tab */}
            {activeTab === 'gallery' && (
              <PropertyGallery 
                propertyId={currentProperty.id} 
                onPrimaryImageChange={(imageUrl: string) => {
                  setProperty(prev => prev ? {
                    ...prev,
                    image: imageUrl
                  } : null);
                }}
              />
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
                  {payments.length === 0 ? (
                    <div className="text-center py-8 text-glass-muted">
                      <p>No payment history found</p>
                    </div>
                  ) : (
                    payments.map((payment) => (
                    <div key={payment.id} className="glass rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getPaymentStatusColor(payment.status)}`}>
                            {getPaymentIcon(payment.status)}
                          </div>
                          <div>
                            <p className="font-medium text-glass">₹{payment.amount.toLocaleString()}</p>
                            <p className="text-sm text-glass-muted">{formatDateDDMMYYYY(payment.date)}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-glass">{payment.method}</p>
                          <p className="text-xs text-glass-muted">{payment.reference}</p>
                        </div>
                      </div>
                    </div>
                    ))
                  )}
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
                    onClick={() => {
                      setShowUploadDocument(true);
                    }}
                  >
                    <Upload size={16} />
                    Upload Document
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-glass-muted">
                      <p>No documents found</p>
                    </div>
                  ) : (
                    documents.map((document) => (
                    <div key={document.id} className="glass rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 glass rounded-lg flex items-center justify-center">
                          <FileText size={20} className="text-glass" />
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="p-1"
                            onClick={() => window.open(document.url, '_blank')}
                            title="View document"
                          >
                            <Eye size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="p-1"
                            onClick={() => {
                              const link = window.document.createElement('a');
                              link.href = document.url;
                              link.download = document.name;
                              link.click();
                            }}
                            title="Download document"
                          >
                            <Download size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-100"
                            onClick={() => handleDeleteDocument(document.id)}
                            title="Delete document"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                      
                      <h4 className="font-medium text-glass mb-1">{document.name}</h4>
                      <p className="text-sm text-glass-muted mb-1">
                        {document.type} • {document.size}
                      </p>
                      <p className="text-xs text-glass-muted">
                        Uploaded {getRelativeTime(document.uploadDate)}
                      </p>
                    </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Maintenance Tab */}
            {activeTab === 'maintenance' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-glass">Maintenance Requests</h3>
                  <Button className="flex items-center gap-2">
                    <AlertTriangle size={16} />
                    New Request
                  </Button>
                </div>

                <div className="space-y-3">
                  {maintenanceRequests.length === 0 ? (
                    <div className="text-center py-8 text-glass-muted">
                      <p>No maintenance requests found</p>
                    </div>
                  ) : (
                    maintenanceRequests.map((request) => (
                      <div key={request.id} className="glass rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              request.status === 'completed' ? 'bg-green-100 text-green-700' :
                              request.status === 'in_progress' ? 'bg-orange-100 text-orange-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                              <AlertTriangle size={16} />
                            </div>
                            <div>
                              <p className="font-medium text-glass">{request.title || 'Maintenance Request'}</p>
                              <p className="text-sm text-glass-muted">{formatDateDDMMYYYY(request.created_at)}</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm text-glass capitalize">{request.status}</p>
                            <p className="text-xs text-glass-muted">Priority: {request.priority || 'Medium'}</p>
                          </div>
                        </div>
                        {request.description && (
                          <p className="text-sm text-glass-muted mt-2">{request.description}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tenant Details Tab */}
            {activeTab === 'tenant' && (
              <div className="space-y-6">
                {isEditMode ? (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-glass">Edit Tenant Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="Tenant Name"
                        type="text"
                        value={editForm.tenantName}
                        onChange={(e) => setEditForm(prev => ({ ...prev, tenantName: e.target.value }))}
                        icon={<User size={18} />}
                        placeholder="Enter tenant name"
                      />

                      <Input
                        label="Tenant Phone"
                        type="tel"
                        value={editForm.tenantPhone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, tenantPhone: e.target.value }))}
                        icon={<Phone size={18} />}
                        placeholder="Enter phone number"
                      />
                    </div>

                    <Input
                      label="Tenant Email"
                      type="email"
                      value={editForm.tenantEmail}
                      onChange={(e) => setEditForm(prev => ({ ...prev, tenantEmail: e.target.value }))}
                      icon={<Mail size={18} />}
                      placeholder="Enter email address"
                    />

                    {editForm.tenantName.trim() && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <Input
                            label="Monthly Rent (₹)"
                            type="number"
                            value={editForm.rent || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, rent: parseFloat(e.target.value) || 0 }))}
                            icon={<IndianRupee size={18} />}
                            placeholder="Enter monthly rent"
                          />

                          <Input
                            label="Security Deposit (₹)"
                            type="number"
                            value={editForm.securityDeposit || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, securityDeposit: parseFloat(e.target.value) || 0 }))}
                            icon={<IndianRupee size={18} />}
                            placeholder="Enter security deposit"
                          />

                          <Input
                            label="Maintenance Charges (₹)"
                            type="number"
                            value={editForm.maintenanceCharges || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, maintenanceCharges: parseFloat(e.target.value) || 0 }))}
                            icon={<IndianRupee size={18} />}
                            placeholder="Enter maintenance charges"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Input
                            label="Lease Start Date"
                            type="date"
                            value={editForm.leaseStart}
                            onChange={(e) => setEditForm(prev => ({ ...prev, leaseStart: e.target.value }))}
                            icon={<Calendar size={18} />}
                          />

                          <Input
                            label="Lease End Date"
                            type="date"
                            value={editForm.leaseEnd}
                            onChange={(e) => setEditForm(prev => ({ ...prev, leaseEnd: e.target.value }))}
                            icon={<Calendar size={18} />}
                          />
                        </div>
                      </div>
                    )}

                    <div className="glass rounded-lg p-4">
                      <h4 className="font-medium text-glass mb-2">Instructions</h4>
                      <div className="text-sm text-glass-muted space-y-2">
                        <p><strong>To add a new tenant:</strong> Fill in all tenant details and lease dates, then save.</p>
                        <p><strong>To update existing tenant:</strong> Modify the tenant information and save.</p>
                        <p><strong>To deactivate tenant:</strong> Clear the tenant name field and save to mark property as vacant.</p>
                      </div>
                    </div>
                  </div>
                ) : currentProperty.tenant && currentProperty.tenant !== 'Vacant' ? (
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
                        <Button 
                          variant="outline" 
                          className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-100" 
                          onClick={() => setShowDeleteTenantConfirm(true)}
                        >
                          <Trash2 size={16} />
                          Remove Tenant
                        </Button>
                      </div>
                    </div>

                    <div className="glass rounded-lg p-6">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 glass rounded-full flex items-center justify-center">
                          <User size={24} className="text-glass" />
                        </div>
                        <div>
                          <h4 className="text-xl font-semibold text-glass">{currentProperty.tenant}</h4>
                          <p className="text-glass-muted">Current Tenant</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-medium text-glass mb-3">Contact Information</h5>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Phone size={16} className="text-glass-muted" />
                              <span className="text-glass">{currentProperty.tenantPhone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail size={16} className="text-glass-muted" />
                              <span className="text-glass">{currentProperty.tenantEmail}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-glass mb-3">Lease Details</h5>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar size={16} className="text-glass-muted" />
                              <span className="text-glass">
                                {currentProperty.leaseStart ? formatDateDDMMYYYY(currentProperty.leaseStart) : 'Not set'} - {currentProperty.leaseEnd ? formatDateDDMMYYYY(currentProperty.leaseEnd) : 'Not set'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <IndianRupee size={16} className="text-glass-muted" />
                              <span className="text-glass">₹{(currentProperty.rent || 0).toLocaleString()}/month</span>
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
                      <p className="text-glass font-medium">{currentProperty.name}</p>
                    </div>
                    <div>
                      <p className="text-glass-muted">Tenant:</p>
                      <p className="text-glass font-medium">{currentProperty.tenant}</p>
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
                    placeholder="Enter amount"
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

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-glass">Payment Type</label>
                    <select
                      value={paymentForm.paymentType}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentType: e.target.value as any }))}
                      className="w-full h-11 px-3 rounded-lg glass-input text-glass"
                    >
                      <option value="Rent">Rent</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Security Deposit">Security Deposit</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Payment Type Details - Only show when "Other" is selected */}
                {paymentForm.paymentType === 'Other' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-glass">Payment Details</label>
                    <textarea
                      value={paymentForm.paymentTypeDetails}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentTypeDetails: e.target.value }))}
                      placeholder="Please specify the payment type details..."
                      className="w-full px-3 py-2 rounded-lg glass-input text-glass placeholder-glass-muted resize-none"
                      rows={3}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <p className="text-glass font-medium">{currentProperty.tenant}</p>
                    </div>
                    <div>
                      <p className="text-glass-muted">Phone:</p>
                      <p className="text-glass font-medium">{currentProperty.tenantPhone}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-glass-muted">Email:</p>
                      <p className="text-glass font-medium">{currentProperty.tenantEmail}</p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
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
                  onClick={() => {
                    setShowUploadDocument(false);
                    setSelectedDocType('other');
                    setUploadFiles([]);
                    setUploadProgress({});
                  }}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-glass-muted" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="glass rounded-lg p-4">
                  <h3 className="font-medium text-glass mb-2">Property</h3>
                  <p className="text-glass">{currentProperty.name}</p>
                </div>

                {/* Document Type Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-glass">Document Type</label>
                  <select
                    value={selectedDocType}
                    onChange={(e) => {
                      setSelectedDocType(e.target.value);
                    }}
                    className="w-full p-3 glass rounded-lg border border-white border-opacity-20 focus:border-green-800 focus:outline-none text-glass"
                  >
                    {docTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div 
                  className="border-2 border-dashed border-white border-opacity-30 rounded-lg p-6 text-center hover:border-green-800 transition-colors cursor-pointer"
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={(e) => {
                    // Only trigger if the click is directly on the drag area, not on the button
                    if (e.target === e.currentTarget) {
                      e.preventDefault();
                      e.stopPropagation();
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }
                  }}
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
                    style={{ display: 'none' }}
                    id="document-upload"
                    ref={fileInputRef}
                  />
                  <Button 
                    variant="outline" 
                    className="cursor-pointer" 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    Choose Files
                  </Button>
                </div>

                {uploadFiles.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-glass">Selected Files ({uploadFiles.length})</h3>
                    {uploadFiles.map((file, index) => {
                      const fileId = `${Date.now()}-${index}`;
                      const progress = uploadProgress[fileId] || 0;
                      const isUploading = uploading && progress < 100;
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
                          <div className="flex items-center gap-3 flex-1">
                            <FileText size={20} className="text-glass-muted" />
                            <div className="flex-1">
                              <p className="font-medium text-glass">{file.name}</p>
                              <p className="text-sm text-glass-muted">
                                {formatFileSize(file.size)}
                              </p>
                              {isUploading && (
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                  <div 
                                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          </div>
                          {!isUploading && (
                            <button
                              onClick={() => removeFile(index)}
                              className="p-1 hover:bg-red-100 hover:bg-opacity-20 rounded transition-colors"
                            >
                              <X size={16} className="text-red-600" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={() => {
                      setShowUploadDocument(false);
                      setSelectedDocType('other');
                      setUploadFiles([]);
                      setUploadProgress({});
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUploadDocument}
                    loading={uploading}
                    disabled={uploadFiles.length === 0 || uploading}
                    className="flex-1"
                  >
                    {uploading ? 'Uploading...' : 'Upload Documents'}
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
                  Are you sure you want to delete "{currentProperty.name}"? This will permanently remove 
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

      {/* Delete Tenant Confirmation Modal */}
      {showDeleteTenantConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-glass">Remove Tenant</h3>
                  <p className="text-glass-muted">This will end the lease agreement</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-glass-muted">
                  Are you sure you want to remove "{currentProperty.tenant}" from this property? 
                  This will end the lease agreement and mark the property as vacant.
                </p>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowDeleteTenantConfirm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteTenant}
                    loading={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    Remove Tenant
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