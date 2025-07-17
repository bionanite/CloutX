import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import { Copy, Download, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface QRCodeGeneratorProps {
  address: string;
  amount?: string;
  label?: string;
  message?: string;
  size?: number;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  address,
  amount,
  label,
  message,
  size = 256
}) => {
  const [includeAmount, setIncludeAmount] = useState(false);
  const [customAmount, setCustomAmount] = useState(amount || '');
  const [customMessage, setCustomMessage] = useState(message || '');

  // Generate payment URI for QR code
  const generatePaymentURI = () => {
    let uri = `ethereum:${address}`;
    const params: string[] = [];

    if (includeAmount && customAmount) {
      params.push(`value=${parseFloat(customAmount) * 1e18}`); // Convert to wei
    }

    if (customMessage) {
      params.push(`data=${encodeURIComponent(customMessage)}`);
    }

    if (params.length > 0) {
      uri += `?${params.join('&')}`;
    }

    return uri;
  };

  const qrValue = generatePaymentURI();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const downloadQR = () => {
    const canvas = document.querySelector('#cloutx-qr canvas') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `cloutx-receive-${address.slice(0, 8)}.png`;
      link.href = url;
      link.click();
      toast.success('QR code downloaded!');
    }
  };

  const shareQR = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'CloutX Payment Request',
          text: `Send CLX tokens to: ${address}`,
          url: qrValue
        });
      } catch (error) {
        // Fallback to clipboard
        copyToClipboard(qrValue);
      }
    } else {
      copyToClipboard(qrValue);
    }
  };

  return (
    <div className="space-y-6">
      {/* QR Code Display */}
      <div className="text-center">
        <div 
          id="cloutx-qr"
          className="inline-block p-4 bg-white rounded-2xl shadow-lg"
        >
          <QRCode
            value={qrValue}
            size={size}
            level="M"
            includeMargin={true}
            renderAs="canvas"
            fgColor="#000000"
            bgColor="#ffffff"
          />
        </div>
      </div>

      {/* Customization Options */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="include-amount"
            checked={includeAmount}
            onChange={(e) => setIncludeAmount(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
          />
          <label htmlFor="include-amount" className="text-gray-300">
            Include specific amount
          </label>
        </div>

        {includeAmount && (
          <div>
            <label className="block text-gray-300 mb-2">Amount (CLX)</label>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div>
          <label className="block text-gray-300 mb-2">Message (optional)</label>
          <input
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Payment for..."
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => copyToClipboard(address)}
          className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg transition-colors"
        >
          <Copy className="w-4 h-4" />
          Copy
        </button>
        
        <button
          onClick={downloadQR}
          className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Save
        </button>
        
        <button
          onClick={shareQR}
          className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>

      {/* Payment URI Display */}
      <div className="bg-white/5 rounded-lg p-4">
        <label className="block text-gray-300 mb-2 text-sm">Payment URI</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={qrValue}
            readOnly
            className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-mono"
          />
          <button
            onClick={() => copyToClipboard(qrValue)}
            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <p className="text-gray-400 text-xs mt-2">
          Compatible wallets can scan this QR code to automatically fill in the recipient address
          {includeAmount && customAmount && ` and amount (${customAmount} CLX)`}.
        </p>
      </div>
    </div>
  );
}; 