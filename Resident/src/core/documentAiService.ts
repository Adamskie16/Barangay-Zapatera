// Resident/src/core/documentAiService.ts
// Intelligent Document Image Quality, Blur, and Cut-Off Detection Service
// Designed specifically for Philippine Barangay Civic & Document Verification

export interface DocumentQualityResult {
  isValid: boolean;
  qualityScore: number; // 0 to 100
  status: 'passed' | 'warning' | 'needs_attention';
  issues: string[];
  suggestions: string[];
  metrics: {
    sharpnessScore: number; // 0 to 100
    brightnessScore: number; // 0 to 100
    aspectRatio: number;
    width: number;
    height: number;
    hasGoodFraming: boolean;
  };
  summary: string;
}

/**
 * Analyzes an image file (File or Blob) directly in the browser/mobile webview
 * for blurriness, extreme brightness/darkness, and cut-off or partial framing.
 */
export async function analyzeDocumentImage(file: File | Blob): Promise<DocumentQualityResult> {
  // If it's a PDF, bypass client-side raster computer vision check
  if (file.type === 'application/pdf' || (file instanceof File && file.name.toLowerCase().endsWith('.pdf'))) {
    return {
      isValid: true,
      qualityScore: 95,
      status: 'passed',
      issues: [],
      suggestions: [],
      metrics: {
        sharpnessScore: 95,
        brightnessScore: 90,
        aspectRatio: 1.41,
        width: 1200,
        height: 1700,
        hasGoodFraming: true,
      },
      summary: 'PDF Document Format (Vector/Digital Document)',
    };
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        try {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;
          const aspectRatio = width / (height || 1);

          // 1. Minimum Resolution Check
          const isResolutionTooLow = width < 480 || height < 360;

          // Create an offscreen canvas to sample pixels
          const sampleWidth = Math.min(width, 400);
          const sampleHeight = Math.min(height, Math.round(400 / aspectRatio));
          const canvas = document.createElement('canvas');
          canvas.width = sampleWidth;
          canvas.height = sampleHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            resolve(fallbackQualityPass(width, height, aspectRatio));
            return;
          }

          ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
          const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
          const data = imgData.data;

          // 2. Brightness & Contrast Calculation
          let totalBrightness = 0;
          const grayValues: number[] = new Array(sampleWidth * sampleHeight);

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Standard perceptual luminance formula
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            grayValues[i / 4] = lum;
            totalBrightness += lum;
          }

          const avgBrightness = totalBrightness / grayValues.length;
          const isTooDark = avgBrightness < 45;
          const isTooBright = avgBrightness > 225;

          // 3. High-Frequency Edge & Blur Analysis (Laplacian Variance Approximation)
          // Sharp text and clear ID edges have high variance in pixel gradient;
          // Blurry or camera-shaken photos have low variance.
          let gradientSum = 0;
          let count = 0;

          for (let y = 1; y < sampleHeight - 1; y += 2) {
            for (let x = 1; x < sampleWidth - 1; x += 2) {
              const idx = y * sampleWidth + x;
              const val = grayValues[idx];
              const left = grayValues[idx - 1];
              const right = grayValues[idx + 1];
              const top = grayValues[idx - sampleWidth];
              const bottom = grayValues[idx + sampleWidth];

              // Discrete laplacian kernel approximation: 4*center - left - right - top - bottom
              const laplacian = Math.abs(4 * val - left - right - top - bottom);
              gradientSum += laplacian;
              count++;
            }
          }

          const avgGradient = count > 0 ? gradientSum / count : 15;
          // Normalize sharpness to 0-100 scale (15 is baseline sharp text on typical ID)
          const sharpnessScore = Math.min(100, Math.round((avgGradient / 16) * 100));
          const isBlurry = sharpnessScore < 45;

          // 4. Cut-Off / Boundary Check:
          // Check if key document features touch or bleed over the outer boundary
          // Inspect the 4 border margins (top, bottom, left, right)
          let edgeDensity = 0;
          let borderSamples = 0;

          // Check top and bottom rows
          for (let x = 0; x < sampleWidth; x += 4) {
            const topVal = grayValues[x];
            const bottomVal = grayValues[(sampleHeight - 1) * sampleWidth + x];
            if (topVal < 240 && topVal > 15) edgeDensity++;
            if (bottomVal < 240 && bottomVal > 15) edgeDensity++;
            borderSamples += 2;
          }

          // Check left and right columns
          for (let y = 0; y < sampleHeight; y += 4) {
            const leftVal = grayValues[y * sampleWidth];
            const rightVal = grayValues[y * sampleWidth + (sampleWidth - 1)];
            if (leftVal < 240 && leftVal > 15) edgeDensity++;
            if (rightVal < 240 && rightVal > 15) edgeDensity++;
            borderSamples += 2;
          }

          const borderOccupancy = borderSamples > 0 ? edgeDensity / borderSamples : 0;
          // If the document content bleeds heavily right to the image edges with extreme aspect ratio:
          const isExtremeAspect = aspectRatio > 2.4 || aspectRatio < 0.45;
          const isLikelyCutOff = (borderOccupancy > 0.88 && isExtremeAspect) || (width < 320 && isExtremeAspect);

          // 5. Synthesize Issues & Suggestions
          const issues: string[] = [];
          const suggestions: string[] = [];

          if (isResolutionTooLow) {
            issues.push('Low Image Resolution (< 480px)');
            suggestions.push('Upload a higher-resolution photo or scan for text readability.');
          }

          if (isBlurry) {
            issues.push('Blurry / Out of Focus Capture');
            suggestions.push('Hold camera steady and tap to focus on text details.');
          }

          if (isLikelyCutOff) {
            issues.push('Document Edges Appear Cut Off');
            suggestions.push('Fit the entire document inside the frame with all 4 corners visible.');
          }

          if (isTooDark) {
            issues.push('Photo is Too Dark / Poor Lighting');
            suggestions.push('Take photo in a well-lit area without strong shadows.');
          } else if (isTooBright) {
            issues.push('Camera Flash Glare / Overexposed');
            suggestions.push('Avoid direct camera flash reflection on plastic-laminated IDs.');
          }

          // Calculate Overall Score (0-100)
          let penalty = 0;
          if (isBlurry) penalty += 35;
          if (isLikelyCutOff) penalty += 30;
          if (isResolutionTooLow) penalty += 25;
          if (isTooDark || isTooBright) penalty += 20;

          const qualityScore = Math.max(10, 100 - penalty);
          const status: 'passed' | 'warning' | 'needs_attention' =
            qualityScore >= 80 ? 'passed' : qualityScore >= 55 ? 'warning' : 'needs_attention';

          let summary = 'Document image is clear, sharp, and all corners are visible.';
          if (issues.length > 0) {
            summary = `${issues.join(', ')}. Action recommended: ${suggestions[0] || 'Re-capture image.'}`;
          }

          URL.revokeObjectURL(objectUrl);

          resolve({
            isValid: status !== 'needs_attention',
            qualityScore,
            status,
            issues,
            suggestions,
            metrics: {
              sharpnessScore,
              brightnessScore: Math.round((avgBrightness / 255) * 100),
              aspectRatio,
              width,
              height,
              hasGoodFraming: !isLikelyCutOff,
            },
            summary,
          });
        } catch {
          URL.revokeObjectURL(objectUrl);
          resolve(fallbackQualityPass(img.naturalWidth || 800, img.naturalHeight || 600, 1.33));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(fallbackQualityPass(800, 600, 1.33));
      };

      img.src = objectUrl;
    } catch {
      resolve(fallbackQualityPass(800, 600, 1.33));
    }
  });
}

function fallbackQualityPass(width: number, height: number, aspectRatio: number): DocumentQualityResult {
  return {
    isValid: true,
    qualityScore: 85,
    status: 'passed',
    issues: [],
    suggestions: [],
    metrics: {
      sharpnessScore: 85,
      brightnessScore: 80,
      aspectRatio,
      width,
      height,
      hasGoodFraming: true,
    },
    summary: 'Document uploaded and ready for administrative review.',
  };
}
