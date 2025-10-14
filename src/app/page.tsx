
import Image from "next/image";
import { search } from "@/app/actions";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { SearchBox } from "@/components/search-box";

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'cambodia-hero');

  return (
    <>
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover z-0"
            data-ai-hint={heroImage.imageHint}
            priority
          />
        )}
        <div className="absolute inset-0 bg-background/70 z-10" />

        <div className="z-20 flex flex-col items-center justify-center h-full space-y-8 w-full p-4 text-center">
          <div className="flex flex-col items-center space-y-4">
             <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground drop-shadow-md">
              Cambodia Hub
            </h1>
            <p className="max-w-xl text-lg text-foreground/90 sm:text-xl md:text-2xl drop-shadow">
              Your personal AI guide to the Kingdom of Wonder. Explore, buy, sell, and find jobs.
            </p>
          </div>

          <div className="w-full max-w-xl px-4">
            <SearchBox searchAction={search} />
          </div>
        </div>
    </>
  );
}
