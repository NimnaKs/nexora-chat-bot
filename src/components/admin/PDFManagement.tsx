import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
} from "lucide-react";
import { UploadedPDF } from "../../types";
import apiService from "../../services/api";
import { Button } from "../ui/Button";
import { Card, CardHeader, CardContent } from "../ui/Card";
import { LoadingSpinner } from "../ui/LoadingSpinner";

export const PDFManagement: React.FC = () => {
  const [pdfs, setPdfs] = useState<UploadedPDF[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPDFs();
  }, []);

  const fetchPDFs = async () => {
    try {
      const response = await apiService.getPDFs();
      if (response.success) {
        setPdfs(response.pdfs || []);
      }
    } catch (error) {
      console.error("Failed to fetch PDFs:", error);
      showNotification("error", "Failed to load PDFs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      showNotification("error", "Please select a PDF file");
      return;
    }

    setIsUploading(true);

    try {
      const response = await apiService.uploadPDF(file);
      if (response.success) {
        showNotification(
          "success",
          response.message || "PDF uploaded successfully"
        );
        fetchPDFs();
      } else {
        showNotification("error", response.error || "Failed to upload PDF");
      }
    } catch (error) {
      console.error("Failed to upload PDF:", error);
      showNotification("error", "Failed to upload PDF");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {notification && (
        <div
          className={`p-4 rounded-lg border flex items-center space-x-3 ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <p>{notification.message}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  PDF Management
                </h2>
                <p className="text-gray-600 text-sm">
                  Upload and manage document files
                </p>
              </div>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                isLoading={isUploading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {pdfs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No PDFs uploaded
              </h3>
              <p className="text-gray-500 mb-4">
                Start by uploading your first document
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload First PDF
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {pdfs.map((pdf) => (
                <div
                  key={pdf.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start space-x-3">
                    <div className="bg-red-100 p-2 rounded-lg flex-shrink-0">
                      <FileText className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-medium text-gray-900 truncate"
                        title={pdf.original_name}
                      >
                        {pdf.original_name}
                      </h3>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(pdf.upload_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <User className="w-3 h-3 mr-1" />
                          {pdf.uploaded_by}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
