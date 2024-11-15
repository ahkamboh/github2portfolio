'use client'

import Spline from '@splinetool/react-spline';

export default function SplineBackground() {
  return (
    <div className="absolute inset-0 z-0">
      <Spline
        scene="https://prod.spline.design/9Qi6uwl-Y9hQ8sqF/scene.splinecode"
      />
      <div className="absolute scale-75  bottom-6 right-3 bg-[#161616] px-5 py-1 rounded-md backdrop-blur-sm">
        <span className="text-white">ahkamboh</span>
      </div>
    </div>
  );
}