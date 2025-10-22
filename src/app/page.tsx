
import Image from "next/image";
import { search } from "@/app/actions";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { SearchBox } from "@/components/search-box";

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'cambodia-hero');

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background container */}
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover"
          data-ai-hint={heroImage.imageHint}
          priority
        />
      )}
      
      {/* Overlay and Content container */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/70 p-4 text-center pb-24">
        <div className="flex flex-col items-center space-y-4">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground drop-shadow-md">
            Cambodia Hub
          </h1>
          <p className="max-w-xl text-lg text-foreground/70 sm:text-xl md:text-2xl drop-shadow">
            Your personal AI guide to the Kingdom of Wonder. Explore, buy, sell, and find jobs.
          </p>
        </div>
        <div className="w-full max-w-xl px-4 mt-8">
          <SearchBox searchAction={search} />
        </div>
      </div>
    </div>
  );
}
