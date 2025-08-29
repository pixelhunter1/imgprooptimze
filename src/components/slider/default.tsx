import { Slider, SliderThumb } from '@/components/ui/slider';

export default function SliderDemo() {
  return (
    <div className="w-full md:w-[400px]">
      <Slider defaultValue={[50]} max={100} step={1}>
        <SliderThumb />
      </Slider>
    </div>
  );
}
