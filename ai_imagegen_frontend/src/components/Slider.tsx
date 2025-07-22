"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
}

const Slider = ({ value = [1], onValueChange, min = 1, max = 3, step = 0.5 }: SliderProps) => {
  return (
    <SliderPrimitive.Root
      className="relative flex items-center w-full h-5"
      value={value}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
    >
      <SliderPrimitive.Track className="bg-gray-300 relative flex-grow h-1 rounded-full">
        <SliderPrimitive.Range className="absolute bg-blue-500 h-1 rounded-full" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="w-4 h-4 bg-blue-600 rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400" />
    </SliderPrimitive.Root>
  );
};

export default Slider;
