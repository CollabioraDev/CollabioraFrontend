import React, { useState, useRef, useCallback } from "react";
import { Upload, X, Check, Loader2, User } from "lucide-react";

export default function ProfilePictureUpload({ 
  currentPicture, 
  onUpload, 
  onRemove,
  uploading = false 
}) {
  const [preview, setPreview] = useState(null);
  const [cropArea, setCropArea] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Set initial crop area (square, centered)
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;
        setCropArea({ x, y, width: size, height: size });
        setPreview(event.target.result);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e) => {
    if (!preview || !cropArea) return;
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setCropStart({ ...cropArea });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !preview || !cropArea) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const scale = imageRef.current?.naturalWidth / imageRef.current?.clientWidth || 1;
    const deltaX = (e.clientX - rect.left - dragStart.x) * scale;
    const deltaY = (e.clientY - rect.top - dragStart.y) * scale;

    const img = imageRef.current;
    if (!img) return;

    const newX = Math.max(0, Math.min(cropStart.x + deltaX, img.naturalWidth - cropArea.width));
    const newY = Math.max(0, Math.min(cropStart.y + deltaY, img.naturalHeight - cropArea.height));

    setCropArea({
      ...cropArea,
      x: newX,
      y: newY,
    });
  }, [isDragging, dragStart, cropStart, cropArea, preview]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  const handleResize = (e, corner) => {
    e.stopPropagation();
    // Simple resize - can be enhanced
    const rect = containerRef.current.getBoundingClientRect();
    const scale = imageRef.current?.naturalWidth / imageRef.current?.clientWidth || 1;
    const mouseX = (e.clientX - rect.left) * scale;
    const mouseY = (e.clientY - rect.top) * scale;

    if (corner === "bottom-right") {
      const newWidth = Math.max(50, Math.min(mouseX - cropArea.x, imageRef.current.naturalWidth - cropArea.x));
      const newHeight = newWidth; // Keep square
      setCropArea({
        ...cropArea,
        width: newWidth,
        height: newHeight,
      });
    }
  };

  const getCroppedImage = () => {
    if (!preview || !cropArea || !imageRef.current) return null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = imageRef.current;

    const size = Math.min(cropArea.width, cropArea.height);
    canvas.width = 400; // Output size
    canvas.height = 400;

    ctx.drawImage(
      img,
      cropArea.x,
      cropArea.y,
      size,
      size,
      0,
      0,
      400,
      400
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/jpeg", 0.9);
    });
  };

  const handleSave = async () => {
    try {
      const croppedBlob = await getCroppedImage();
      if (croppedBlob) {
        const file = new File([croppedBlob], "profile-picture.jpg", { type: "image/jpeg" });
        await onUpload(file);
        // Clear preview after successful upload
        setPreview(null);
        setCropArea(null);
        setIsDragging(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error) {
      // Upload failed, keep preview so user can try again
      console.error("Failed to upload picture:", error);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setCropArea(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayPicture = preview || currentPicture;

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        Profile Picture
      </label>

      {!preview && !currentPicture && (
        <div className="flex items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center">
            <User className="w-8 h-8 text-slate-400" />
          </div>
          <div className="flex-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Picture
            </button>
            <p className="text-xs text-slate-500 mt-1">
              JPG, PNG up to 5MB
            </p>
          </div>
        </div>
      )}

      {displayPicture && !preview && (
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={currentPicture}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
            />
          </div>
          <div className="flex-1 space-y-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Upload className="w-3 h-3" />
              Change Picture
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors flex items-center gap-2"
              >
                <X className="w-3 h-3" />
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {preview && (
        <div className="space-y-3">
          <div
            ref={containerRef}
            className="relative w-full max-w-md mx-auto border-2 border-slate-300 rounded-lg overflow-hidden bg-slate-100"
            style={{ aspectRatio: "1/1" }}
          >
            <img
              ref={imageRef}
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain"
              style={{ userSelect: "none", pointerEvents: "none" }}
            />
            {cropArea && imageRef.current && (
              <div
                className="absolute border-2 border-blue-500 bg-blue-500/20 cursor-move"
                style={{
                  left: `${(cropArea.x / imageRef.current.naturalWidth) * 100}%`,
                  top: `${(cropArea.y / imageRef.current.naturalHeight) * 100}%`,
                  width: `${(cropArea.width / imageRef.current.naturalWidth) * 100}%`,
                  height: `${(cropArea.height / imageRef.current.naturalHeight) * 100}%`,
                }}
                onMouseDown={handleMouseDown}
              >
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-se-resize"
                  onMouseDown={(e) => handleResize(e, "bottom-right")}
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={handleSave}
              disabled={uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Picture
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={uploading}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

