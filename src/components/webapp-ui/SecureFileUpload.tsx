import React, { forwardRef, InputHTMLAttributes, useState } from 'react';
import { Upload, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { validateFileType, validateFileSize, sanitizeFilename, SECURITY_CONSTANTS } from '../../utils/security';

interface SecureFileUploadProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  error?: string;
  acceptedTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  onFilesChange?: (files: File[]) => void;
  onError?: (error: string) => void;
  showPreview?: boolean;
}

export const SecureFileUpload = forwardRef<HTMLInputElement, SecureFileUploadProps>(
  ({ 
    label,
    error,
    acceptedTypes = SECURITY_CONSTANTS.ALLOWED_IMAGE_TYPES,
    maxFileSize = SECURITY_CONSTANTS.MAX_FILE_SIZE,
    maxFiles = 10,
    onFilesChange,
    onError,
    showPreview = true,
    className = '',
    ...props 
  }, ref) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [uploadErrors, setUploadErrors] = useState<string[]>([]);

    const validateFile = (file: File): string | null => {
      // Validate file type
      if (!validateFileType(file.name, acceptedTypes)) {
        return `File "${file.name}" is not a supported file type.`;
      }

      // Validate file size
      if (!validateFileSize(file.size, maxFileSize)) {
        const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
        return `File "${file.name}" is too large. Maximum size is ${maxSizeMB}MB.`;
      }

      // Validate filename
      const sanitizedFilename = sanitizeFilename(file.name);
      if (sanitizedFilename !== file.name) {
        return `File "${file.name}" contains invalid characters.`;
      }

      return null;
    };

    const handleFiles = (files: FileList | null) => {
      if (!files) return;

      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      const errors: string[] = [];

      // Check if adding these files would exceed maxFiles limit
      if (selectedFiles.length + fileArray.length > maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed.`);
        onError?.(errors.join('\n'));
        return;
      }

      fileArray.forEach(file => {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(validationError);
        } else {
          validFiles.push(file);
        }
      });

      if (errors.length > 0) {
        setUploadErrors(errors);
        onError?.(errors.join('\n'));
      } else {
        setUploadErrors([]);
      }

      if (validFiles.length > 0) {
        const newFiles = [...selectedFiles, ...validFiles];
        setSelectedFiles(newFiles);
        onFilesChange?.(newFiles);
      }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Clear the input so the same file can be selected again
      e.target.value = '';
    };

    const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'dragenter' || e.type === 'dragover') {
        setDragActive(true);
      } else if (e.type === 'dragleave') {
        setDragActive(false);
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    };

    const removeFile = (index: number) => {
      const newFiles = selectedFiles.filter((_, i) => i !== index);
      setSelectedFiles(newFiles);
      onFilesChange?.(newFiles);
    };

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-glass">
            {label}
          </label>
        )}
        
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${dragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${error ? 'border-red-400' : ''}
            ${className}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={ref}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            {...props}
          />
          
          <div className="flex flex-col items-center">
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-1">
              {dragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-500">
              Maximum {maxFiles} files, {Math.round(maxFileSize / (1024 * 1024))}MB each
            </p>
          </div>
        </div>

        {uploadErrors.length > 0 && (
          <div className="space-y-1">
            {uploadErrors.map((error, index) => (
              <p key={index} className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </p>
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </p>
        )}

        {showPreview && selectedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-glass">Selected Files:</p>
            <div className="space-y-1">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

SecureFileUpload.displayName = 'SecureFileUpload';
