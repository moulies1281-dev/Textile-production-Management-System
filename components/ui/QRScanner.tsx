import React, { useEffect, useRef } from 'react';
import { CloseIcon } from './Icons';

// Declare the library loaded from CDN
declare const Html5Qrcode: any;

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose }) => {
  const scannerRef = useRef<any>(null); // Using `any` for Html5Qrcode instance
  const readerId = "qr-reader";

  useEffect(() => {
    // Ensure the library is loaded
    if (typeof Html5Qrcode === 'undefined') {
        console.error("html5-qrcode library not found. Make sure it's loaded.");
        alert("QR Scanner library failed to load. Please check your internet connection.");
        onClose();
        return;
    }

    const html5QrCode = new Html5Qrcode(readerId);
    scannerRef.current = html5QrCode;

    const qrCodeSuccessCallback = (decodedText: string, decodedResult: any) => {
        onScanSuccess(decodedText);
        html5QrCode.stop().catch(err => console.error("Failed to stop QR scanner after success.", err));
    };

    const config = { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [] };

    html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, undefined)
      .catch((err: any) => {
        console.warn("Environment camera failed, trying default camera.", err);
        // Fallback to any available camera if environment fails
        html5QrCode.start({ }, config, qrCodeSuccessCallback, undefined)
           .catch((err2: any) => {
                console.error("Failed to start any camera.", err2);
                alert("Could not start camera. Please check permissions.");
                onClose();
            });
      });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop()
          .then(() => console.log("QR Scanner stopped."))
          .catch((err: any) => console.error("Failed to stop QR scanner on cleanup.", err));
      }
    };
  }, [onScanSuccess, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md flex flex-col relative">
        <h3 className="text-lg font-semibold p-4 border-b dark:border-gray-700 dark:text-gray-200">Scan Weaver QR Code</h3>
        <div id={readerId} className="w-full aspect-square bg-gray-900"></div>
        <div className="p-4 border-t dark:border-gray-700">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">Align the QR code within the frame.</p>
        </div>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-2 rounded-full bg-white/50 dark:bg-gray-900/50 hover:bg-white/75 dark:hover:bg-gray-900/75"
          aria-label="Close scanner"
        >
          <CloseIcon className="w-6 h-6 text-gray-800 dark:text-gray-200" />
        </button>
      </div>
    </div>
  );
};

export default QRScanner;