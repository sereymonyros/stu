import Image from "next/image";
import { search } from "@/app/actions";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { SearchBox } from "@/components/search-box";
import { UserAuthButton } from "@/components/user-auth-button";

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'cambodia-hero');

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 text-center">
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
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm z-10" />

      <div className="absolute top-4 right-4 z-30">
        <UserAuthButton />
      </div>

      <div className="z-20 flex flex-col items-center space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl md:text-7xl drop-shadow-md">
            Cambodia Hub
          </h1>
          <p className="max-w-xl text-lg text-foreground/90 sm:text-xl md:text-2xl drop-shadow">
            Your personal AI guide to the Kingdom of Wonder.
          </p>
        </div>
        
        <div className="w-full max-w-xl px-4">
          <SearchBox searchAction={search} />
        </div>
      </div>
    </main>
  );
}
