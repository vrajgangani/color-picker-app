import React, { useState, useCallback, useRef } from "react";
import {
  Upload,
  Image as ImageIcon,
  Droplet,
  Copy,
  Check,
  Crosshair,
  Sun,
  Moon,
} from "lucide-react";
import Logo from "./Assets/icon.svg";

interface Color {
  hex: string;
  percentage: number;
}

interface CustomColor {
  hex: string;
  timestamp: number;
}

function App() {
  const [colors, setColors] = useState<Color[]>([]);
  const [customColors, setCustomColors] = useState<CustomColor[]>([]);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractColors = useCallback((imageElement: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    ctx.drawImage(imageElement, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const colorMap = new Map<string, number>();
    const totalPixels = imageData.length / 4;

    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b)
        .toString(16)
        .slice(1)}`;
      colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
    }

    const sortedColors = Array.from(colorMap.entries())
      .map(([hex, count]) => ({
        hex,
        percentage: (count / totalPixels) * 100,
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 6);

    setColors(sortedColors);
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImageUrl(img.src);
          extractColors(img);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    [extractColors]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const copyToClipboard = useCallback((color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  }, []);

  const getColorAtPoint = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      if (!isPicking || !canvasRef.current || !imageRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = imageRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const scaleX = imageRef.current.naturalWidth / rect.width;
      const scaleY = imageRef.current.naturalHeight / rect.height;

      const pixel = ctx.getImageData(x * scaleX, y * scaleY, 1, 1).data;
      const hex = `#${(
        (1 << 24) +
        (pixel[0] << 16) +
        (pixel[1] << 8) +
        pixel[2]
      )
        .toString(16)
        .slice(1)}`;

      setPickedColor(hex);
      setCustomColors((prev) => [{ hex, timestamp: Date.now() }, ...prev]);
      setIsPicking(false);
    },
    [isPicking]
  );

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const theme = isDarkMode
    ? {
        bg: "bg-gray-900",
        secondary: "bg-gray-800",
        accent: "bg-gray-700",
        text: "text-white",
        textSecondary: "text-gray-400",
      }
    : {
        bg: "bg-gray-50",
        secondary: "bg-white",
        accent: "bg-gray-100",
        text: "text-gray-900",
        textSecondary: "text-gray-600",
      };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const PickedColorsSection = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Crosshair className="w-5 h-5" />
        Picked Colors
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 ex:grid-cols-2 2xl:grid-cols-2 gap-4">
        {customColors.map((color) => (
          <div
            key={`${color.hex}-${color.timestamp}`}
            className={`${theme.accent} rounded-lg p-4 flex items-center gap-4`}
          >
            <div
              className="w-12 h-12 rounded-lg shadow-lg"
              style={{ backgroundColor: color.hex }}
            />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono">{color.hex.toUpperCase()}</p>
                <button
                  onClick={() => copyToClipboard(color.hex)}
                  className={`p-2 ${theme.secondary} hover:opacity-80 rounded-lg transition-colors`}
                >
                  {copiedColor === color.hex ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-screen ${theme.bg} ${theme.text} p-8 transition-colors duration-200`}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold flex items-center gap-2">
            {/* <Droplet className="w-8 h-8 rotate-180" /> */}
            <img src={Logo} alt="logo" className="h-14" />
            Find My Color
          </h1>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg ${theme.accent} hover:opacity-80 transition-opacity`}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-8 mb-8 transition-all cursor-pointer ${
            isDragging
              ? "border-primary bg-blue-500/10"
              : `border-${theme.accent} hover:border-primary`
          } ${theme.secondary}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleUploadClick}
        >
          <div className="text-center">
            <div className="mb-4">
              <Upload
                className={`w-12 h-12 mx-auto ${theme.textSecondary} mb-4`}
              />
              <p className="text-lg mb-2">
                Drag and drop your image here, or{" "}
                <span className="text-primary hover:opacity-70">browse</span>
              </p>
              <p className={`text-sm ${theme.textSecondary}`}>
                Supports PNG, JPG, or GIF
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileInput}
          />
        </div>

        {imageUrl && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className={`${theme.secondary} rounded-xl p-4`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Source Image
                </h2>
                <button
                  onClick={() => setIsPicking((prev) => !prev)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors bg-primary hover:opacity-80 text-white`}
                >
                  <Crosshair className="w-4 h-4" />
                  {isPicking ? "Cancel" : "Pick Color"}
                </button>
              </div>
              <div className="relative">
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Uploaded"
                  className={`w-full h-auto rounded-lg ${
                    isPicking ? "cursor-crosshair" : ""
                  }`}
                  onClick={getColorAtPoint}
                />
                {/* c */}
              </div>
            </div>

            {/* Picked Colors for small screens */}
            <div className="block md:hidden">
              {customColors.length > 0 && (
                <div className={`${theme.secondary} rounded-xl p-4 mb-8`}>
                  <PickedColorsSection />
                </div>
              )}
            </div>

            <div className={`${theme.secondary} rounded-xl p-4`}>
              {/* Picked Colors for large screens */}
              <div className="hidden md:block">
                {customColors.length > 0 && (
                  <div className="mb-8">
                    <PickedColorsSection />
                  </div>
                )}
              </div>

              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Droplet className="w-5 h-5 rotate-180" />
                Dominant Colors
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 ex:grid-cols-2 2xl:grid-cols-2 gap-4">
                {colors.map((color) => (
                  <div
                    key={color.hex}
                    className={`${theme.accent} rounded-lg p-4 flex items-center gap-4`}
                  >
                    <div
                      className="w-12 h-12 rounded-lg shadow-lg"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono">{color.hex.toUpperCase()}</p>
                        <button
                          onClick={() => copyToClipboard(color.hex)}
                          className={`p-2 ${theme.secondary} hover:opacity-80 rounded-lg transition-colors`}
                        >
                          {copiedColor === color.hex ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className={`text-sm ${theme.textSecondary}`}>
                        {color.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

export default App;
