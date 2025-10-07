import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Eye, Star, X, Image as ImageIcon, Plus } from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { ImageWithFallback } from '../ui/ImageWithFallback';
import { 
  fetchPropertyImages, 
  uploadPropertyImage, 
  deletePropertyImage, 
  setPrimaryImage, 
  formatFileSize, 
  validateImageFile,
  PropertyImage 
} from '../../utils/propertyImages';


interface PropertyGalleryProps {
  propertyId: string;
}

export const PropertyGallery: React.FC<PropertyGalleryProps> = ({ propertyId }) => {
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<PropertyImage | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch property images
  const fetchImages = async () => {
    try {
      setLoading(true);
      const data = await fetchPropertyImages(propertyId);
      setImages(data);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [propertyId]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return false;
      }
      return true;
    });
    setSelectedFiles(prev => [...prev, ...imageFiles]);
  };

  // Remove file from selection
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload images
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress({});

    try {
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const fileId = `${Date.now()}-${index}`;
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

        try {
          const uploadedImage = await uploadPropertyImage(
            file,
            propertyId,
            (progress) => {
              setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
            }
          );

          return uploadedImage;
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          throw error;
        }
      });

      await Promise.all(uploadPromises);
      
      // Refresh images list
      await fetchImages();
      
      // Reset form
      setSelectedFiles([]);
      setShowUploadModal(false);
      setUploadProgress({});
      
      alert(`${selectedFiles.length} image(s) uploaded successfully!`);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Delete image
  const handleDeleteImage = async (imageId: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }

    try {
      await deletePropertyImage(imageId, imageUrl);
      await fetchImages();
      alert('Image deleted successfully!');
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image. Please try again.');
    }
  };

  // Set as primary image
  const handleSetPrimary = async (imageId: string) => {
    try {
      await setPrimaryImage(imageId);
      await fetchImages();
      alert('Primary image updated successfully!');
    } catch (error) {
      console.error('Error setting primary image:', error);
      alert('Failed to set primary image. Please try again.');
    }
  };


  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return false;
      }
      return true;
    });
    setSelectedFiles(prev => [...prev, ...imageFiles]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <span className="ml-3 text-glass">Loading gallery...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-glass">Property Gallery</h3>
          <p className="text-sm text-glass-muted">
            {images.length} image{images.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Add Images
        </Button>
      </div>

      {/* Images Grid */}
      {images.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon size={24} className="text-glass-muted" />
          </div>
          <h3 className="text-lg font-semibold text-glass mb-2">No Images Yet</h3>
          <p className="text-glass-muted mb-4">Upload images to showcase your property</p>
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload size={16} className="mr-2" />
            Upload Images
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {images.map((image) => (
            <div key={image.id} className="glass rounded-lg overflow-hidden group relative">
              <div className="aspect-square relative">
                <div 
                  className="w-full h-full cursor-pointer"
                  onClick={() => {
                    setSelectedImage(image);
                    setShowImageViewer(true);
                  }}
                >
                  <ImageWithFallback
                    src={image.image_url}
                    alt={image.image_name}
                    className="w-full h-full object-cover"
                    fallbackText="Image"
                  />
                </div>
                
                {/* Primary badge */}
                {image.is_primary && (
                  <div className="absolute top-2 left-2">
                    <div className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <Star size={12} fill="currentColor" />
                      Primary
                    </div>
                  </div>
                )}

                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedImage(image);
                        setShowImageViewer(true);
                      }}
                      className="bg-white bg-opacity-20 border-white text-white hover:bg-opacity-30"
                    >
                      <Eye size={14} />
                    </Button>
                    {!image.is_primary && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetPrimary(image.id)}
                        className="bg-white bg-opacity-20 border-white text-white hover:bg-opacity-30"
                      >
                        <Star size={14} />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteImage(image.id, image.image_url)}
                      className="bg-red-600 bg-opacity-20 border-red-600 text-white hover:bg-opacity-30"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Image info */}
              <div className="p-3">
                <p className="text-sm font-medium text-glass truncate" title={image.image_name}>
                  {image.image_name}
                </p>
                <p className="text-xs text-glass-muted">
                  {image.image_size ? formatFileSize(image.image_size) : 'Unknown size'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 glass rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-green-800" />
                  </div>
                  <h2 className="text-2xl font-bold text-glass">Upload Images</h2>
                </div>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFiles([]);
                    setUploadProgress({});
                  }}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-glass-muted" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Drag and Drop Area */}
                <div 
                  className="border-2 border-dashed border-white border-opacity-30 rounded-lg p-6 text-center hover:border-green-800 transition-colors cursor-pointer"
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={32} className="mx-auto text-glass-muted mb-4" />
                  <p className="text-glass-muted mb-4">
                    Drag and drop images here, or click to browse
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <Button variant="outline">
                    Choose Images
                  </Button>
                </div>

                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-glass">Selected Images ({selectedFiles.length})</h3>
                    {selectedFiles.map((file, index) => {
                      const fileId = `${Date.now()}-${index}`;
                      const progress = uploadProgress[fileId] || 0;
                      const isUploading = uploading && progress < 100;
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
                          <div className="flex items-center gap-3 flex-1">
                            <ImageIcon size={20} className="text-glass-muted" />
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

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedFiles([]);
                      setUploadProgress({});
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    loading={uploading}
                    disabled={selectedFiles.length === 0 || uploading}
                    className="flex-1"
                  >
                    {uploading ? 'Uploading...' : 'Upload Images'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl max-h-[90vh] w-full">
            <div className="relative">
              <button
                onClick={() => setShowImageViewer(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
              >
                <X size={24} />
              </button>
              <ImageWithFallback
                src={selectedImage.image_url}
                alt={selectedImage.image_name}
                className="w-full h-full max-h-[80vh] object-contain rounded-lg"
                fallbackText="Image not available"
              />
            </div>
            <div className="mt-4 text-center">
              <p className="text-white font-medium">{selectedImage.image_name}</p>
              <p className="text-gray-300 text-sm">
                {selectedImage.image_size ? formatFileSize(selectedImage.image_size) : 'Unknown size'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
