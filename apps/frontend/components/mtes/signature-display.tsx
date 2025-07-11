import React from 'react';
import { Box } from '@mui/material';

interface SignatureDisplayProps {
  signatureData: Record<number, number[][]>;
  width?: number | string;
  height?: number | string;
  scale?: number;
}

export const SignatureDisplay: React.FC<SignatureDisplayProps> = ({
  signatureData,
  width = 120,
  height = 60,
  scale = 0.5
}) => {
  // Check if signature data exists and is valid
  if (
    !signatureData ||
    typeof signatureData !== 'object' ||
    Object.keys(signatureData).length === 0
  ) {
    return (
      <Box
        sx={{
          width,
          height,
          border: '1px solid #ddd',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: '#999',
          backgroundColor: '#f9f9f9',
          '@media print': {
            fontSize: '8px'
          }
        }}
      >
        אין חתימה
      </Box>
    );
  }

  // Convert signature data to SVG paths
  const createPathFromPoints = (points: number[][]): string => {
    if (!Array.isArray(points) || points.length === 0) return '';

    try {
      let path = `M${points[0][0] * scale},${points[0][1] * scale}`;
      for (let i = 1; i < points.length; i++) {
        if (Array.isArray(points[i]) && points[i].length >= 2) {
          path += ` L${points[i][0] * scale},${points[i][1] * scale}`;
        }
      }
      return path;
    } catch (error) {
      console.warn('Error creating signature path:', error);
      return '';
    }
  };

  // Get all valid paths from signature data
  const allPaths = Object.values(signatureData)
    .filter(points => Array.isArray(points) && points.length > 0)
    .map(createPathFromPoints)
    .filter(path => path.length > 0);

  // If no valid paths, show no signature message
  if (allPaths.length === 0) {
    return (
      <Box
        sx={{
          width,
          height,
          border: '1px solid #ddd',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: '#999',
          backgroundColor: '#f9f9f9',
          '@media print': {
            fontSize: '8px'
          }
        }}
      >
        חתימה לא תקינה
      </Box>
    );
  }

  const svgWidth = typeof width === 'number' ? width : 120;
  const svgHeight = typeof height === 'number' ? height : 60;

  return (
    <Box
      sx={{
        width,
        height,
        border: '1px solid #ccc',
        borderRadius: 1,
        backgroundColor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        '@media print': {
          border: '1px solid #999'
        }
      }}
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth / scale} ${svgHeight / scale}`}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'block'
        }}
      >
        {allPaths.map((path, index) => (
          <path
            key={index}
            d={path}
            stroke="#000"
            strokeWidth={2 / scale}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </Box>
  );
};
